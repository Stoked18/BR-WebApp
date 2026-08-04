'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { protokolliere } from '@/lib/audit';
import type { Sitzungsart, Sitzungsform } from '@prisma/client';

/**
 * Ermittelt die naechste freie Sitzungsnummer im laufenden Jahr.
 *
 * Gremiumssitzungen werden fortlaufend als "JAHR/NN" gezaehlt, Ausschuss- und
 * Sondertermine zusaetzlich mit einem Kuerzel, damit sich die Nummern nicht
 * ueberschneiden. Die Nummer ist nur ein Aktenzeichen; rechtlich haengt an ihr
 * nichts, sie erleichtert aber das Wiederfinden in der Niederschriftenablage.
 */
async function naechsteNummer(jahr: number, kuerzel: string | null): Promise<string> {
  const praefix = kuerzel ? `${jahr}/${kuerzel}-` : `${jahr}/`;
  const vorhandene = await prisma.sitzung.findMany({
    where: { nummer: { startsWith: praefix } },
    select: { nummer: true },
  });

  const hoechste = vorhandene.reduce((max, s) => {
    const zahl = Number(s.nummer.slice(praefix.length));
    return Number.isFinite(zahl) && zahl > max ? zahl : max;
  }, 0);

  return `${praefix}${String(hoechste + 1).padStart(2, '0')}`;
}

/** Kuerzel je Sitzungsart, damit Ausschuss- und Sondertermine eigene Zaehlungen haben. */
function kuerzelFuerArt(art: Sitzungsart, ausschussId: string | null): string | null {
  if (art === 'BETRIEBSVERSAMMLUNG') return 'BV';
  if (art === 'ABTEILUNGSVERSAMMLUNG') return 'AV';
  if (art === 'MONATSGESPRAECH') return 'MG';
  if (art === 'ASA') return 'ASA';
  if (ausschussId) return 'AS';
  return null;
}

/**
 * Legt eine neue Sitzung an.
 *
 * Bewusst nicht automatisiert: § 29 Abs. 2 BetrVG legt die Einberufung in die
 * Hand des Vorsitzenden. Einen gesetzlichen Turnus fuer Betriebsratssitzungen
 * gibt es nicht – wann getagt wird, entscheidet das Gremium. Die Anwendung
 * erinnert lediglich, wenn laenger nicht getagt wurde.
 */
export async function legeSitzungAn(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.planen');

  const art = String(formular.get('art') ?? 'ORDENTLICH') as Sitzungsart;
  const form = String(formular.get('form') ?? 'PRAESENZ') as Sitzungsform;
  const beginnRoh = String(formular.get('beginn') ?? '').trim();
  const dauerMinuten = Number(formular.get('dauerMinuten') ?? 180);
  const ort = String(formular.get('ort') ?? '').trim() || null;
  const titel = String(formular.get('titel') ?? '').trim() || null;
  const traeger = String(formular.get('traeger') ?? '').trim(); // "gremium:<id>" oder "ausschuss:<id>"

  if (!beginnRoh) throw new Error('Ein Beginn ist anzugeben.');
  if (!traeger) throw new Error('Es ist anzugeben, für welches Gremium oder welchen Ausschuss die Sitzung stattfindet.');

  const beginn = new Date(beginnRoh);
  if (Number.isNaN(beginn.getTime())) throw new Error('Der angegebene Beginn ist kein gültiger Zeitpunkt.');

  const [typ, id] = traeger.split(':');
  const gremiumId = typ === 'gremium' ? id : null;
  const ausschussId = typ === 'ausschuss' ? id : null;
  if (!gremiumId && !ausschussId) throw new Error('Der Träger der Sitzung konnte nicht zugeordnet werden.');

  // Ladungsfrist aus der Geschaeftsordnung, § 29 Abs. 2 S. 3 BetrVG nennt keine Tageszahl.
  const einstellung = await prisma.einstellung.findUnique({ where: { schluessel: 'ladungsfrist.tage' } });
  const ladungsfristTage = Number(einstellung?.wert ?? 7);

  const jahr = beginn.getFullYear();
  const nummer = await naechsteNummer(jahr, kuerzelFuerArt(art, ausschussId));

  const sitzung = await prisma.sitzung.create({
    data: {
      gremiumId,
      ausschussId,
      art,
      form,
      nummer,
      titel,
      beginn,
      ende: dauerMinuten > 0 ? new Date(beginn.getTime() + dauerMinuten * 60_000) : null,
      ort,
      ladungsfristTage,
      status: 'GEPLANT',
      leitungId: benutzer.id,
    },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Sitzung',
    entitaetId: sitzung.id,
    details: `Sitzung ${nummer} (${art}) für den ${beginn.toISOString()} angelegt.`,
  });

  revalidatePath('/sitzungen');
  revalidatePath('/uebersicht');
  redirect(`/sitzungen/${sitzung.id}`);
}

/**
 * Vermerkt, dass die Ladung mit der Tagesordnung versandt wurde (§ 29 Abs. 2 BetrVG).
 *
 * Der Versand selbst erfolgt ausserhalb der Anwendung; hier wird nur der
 * Nachweis gefuehrt, wann geladen wurde. Das ist im Streitfall entscheidend:
 * ohne rechtzeitige Ladung unter Mitteilung der Tagesordnung sind die in der
 * Sitzung gefassten Beschluesse angreifbar.
 */
export async function vermerkeLadung(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.planen');
  const sitzungId = String(formular.get('sitzungId'));

  const sitzung = await prisma.sitzung.findUniqueOrThrow({
    where: { id: sitzungId },
    include: { _count: { select: { tops: true } } },
  });

  if (sitzung._count.tops === 0) {
    throw new Error(
      'Vor der Ladung ist die Tagesordnung zu erfassen. § 29 Abs. 2 S. 3 BetrVG verlangt die ' +
        'Ladung unter Mitteilung der Tagesordnung.',
    );
  }

  await prisma.sitzung.update({
    where: { id: sitzungId },
    data: { einladungVersendetAm: new Date(), status: 'EINGELADEN' },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Sitzung',
    entitaetId: sitzungId,
    details: `Ladung zur Sitzung ${sitzung.nummer} unter Mitteilung von ${sitzung._count.tops} Tagesordnungspunkten vermerkt.`,
  });

  revalidatePath(`/sitzungen/${sitzungId}`);
  revalidatePath('/sitzungen');
}

/** Sagt eine Sitzung ab. Der Datensatz bleibt als Nachweis erhalten. */
export async function sageSitzungAb(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.planen');
  const sitzungId = String(formular.get('sitzungId'));
  const grund = String(formular.get('grund') ?? '').trim();

  const sitzung = await prisma.sitzung.findUniqueOrThrow({ where: { id: sitzungId } });

  await prisma.sitzung.update({ where: { id: sitzungId }, data: { status: 'ABGESAGT' } });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Sitzung',
    entitaetId: sitzungId,
    details: `Sitzung ${sitzung.nummer} abgesagt.${grund ? ` Grund: ${grund}` : ''}`,
  });

  revalidatePath(`/sitzungen/${sitzungId}`);
  revalidatePath('/sitzungen');
}
