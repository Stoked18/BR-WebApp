'use server';

/**
 * Aktionen der Verwaltung.
 *
 * Alles hier greift in Stammdaten oder Zugaenge ein. Zwei Grundsaetze gelten
 * durchgehend:
 *
 *  1. Jede Aenderung wird protokolliert (Art. 5 Abs. 2 DSGVO – der
 *     Verantwortliche muss die Rechtmaessigkeit nachweisen koennen).
 *  2. Konten werden nicht geloescht, sondern deaktiviert. Ein geloeschtes
 *     Konto risse Luecken in die Zuordnung alter Protokolleintraege; die
 *     Nachvollziehbarkeit ginge verloren. Ausnahme ist das ausdrueckliche
 *     Zuruecksetzen des Bestands fuer die Erprobung.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Systemrolle } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { protokolliere } from '@/lib/audit';
import { hashePasswort, pruefePasswortstaerke } from '@/lib/passwort';
import { ROLLENBEZEICHNUNG, hinweisRollenmischung, pruefeRollenmischung } from '@/lib/authz';
import { EINSTELLUNGEN, pruefeWert } from '@/lib/einstellungen';
import { fuehreLoeschplanAus, summe, type Loeschtiefe } from '@/lib/bestand';
import { groesseBetriebsrat } from '@/lib/betrvg';

const ALLE_ROLLEN = Object.keys(ROLLENBEZEICHNUNG) as Systemrolle[];

function text(formular: FormData, feld: string): string {
  return String(formular.get(feld) ?? '').trim();
}

function schalter(formular: FormData, feld: string): boolean {
  return formular.get(feld) === 'on' || formular.get(feld) === 'ja';
}

/** Leitet mit einer Rueckmeldung an die aufrufende Seite zurueck. */
function zurueck(pfad: string, art: 'ok' | 'fehler', nachricht: string): never {
  redirect(`${pfad}?${art}=${encodeURIComponent(nachricht)}`);
}

// ---------------------------------------------------------------------------
// Betrieb
// ---------------------------------------------------------------------------

export async function speichereBetrieb(formular: FormData) {
  const benutzer = await verlangeRecht('gremium.verwalten');
  const id = text(formular, 'id');
  const vorher = await prisma.betrieb.findUnique({ where: { id } });
  if (!vorher) zurueck('/verwaltung', 'fehler', 'Der Betrieb wurde nicht gefunden.');

  const name = text(formular, 'name');
  const ort = text(formular, 'ort');
  const wahlberechtigte = Number(formular.get('anzahlWahlberechtigte') ?? 0);
  const beschaeftigte = Number(formular.get('anzahlBeschaeftigte') ?? 0);

  if (!name || !ort) zurueck('/verwaltung', 'fehler', 'Name und Ort des Betriebs sind anzugeben.');
  if (!Number.isInteger(wahlberechtigte) || wahlberechtigte < 5) {
    zurueck(
      '/verwaltung',
      'fehler',
      'Ein Betriebsrat wird nach § 1 Abs. 1 BetrVG erst ab fünf wahlberechtigten Arbeitnehmern gewählt.',
    );
  }
  // Bewusst keine Bedingung "Beschaeftigte >= Wahlberechtigte": nach
  // § 7 S. 2 BetrVG sind auch Leiharbeitnehmer wahlberechtigt, wenn sie laenger
  // als drei Monate im Betrieb eingesetzt werden. Sie zaehlen zur Wahlberechtigten-
  // zahl, gehoeren aber nicht zur Stammbelegschaft. Die Zahl der Wahlberechtigten
  // kann die der Beschaeftigten deshalb rechtmaessig uebersteigen.
  if (!Number.isInteger(beschaeftigte) || beschaeftigte < 1) {
    zurueck('/verwaltung', 'fehler', 'Die Zahl der Beschäftigten muss mindestens 1 betragen.');
  }

  const daten = {
    name,
    ort,
    bundesland: text(formular, 'bundesland') || 'NW',
    anzahlWahlberechtigte: wahlberechtigte,
    anzahlBeschaeftigte: beschaeftigte,
    tarifgebunden: schalter(formular, 'tarifgebunden'),
    tarifvertrag: text(formular, 'tarifvertrag') || null,
    konzernName: text(formular, 'konzernName') || null,
    boersennotiert: schalter(formular, 'boersennotiert'),
  };

  await prisma.betrieb.update({ where: { id }, data: daten });

  const geaendert = Object.entries(daten)
    .filter(([feld, wert]) => String(vorher[feld as keyof typeof vorher] ?? '') !== String(wert ?? ''))
    .map(([feld]) => feld);

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Betrieb',
    entitaetId: id,
    details: geaendert.length ? `Geänderte Felder: ${geaendert.join(', ')}` : 'Ohne inhaltliche Änderung gespeichert.',
  });

  revalidatePath('/verwaltung');

  // Das Bundesland steuert die Feiertage und damit § 193 BGB in jeder
  // Fristberechnung – darauf wird ausdruecklich hingewiesen.
  const hinweis =
    vorher.bundesland !== daten.bundesland
      ? ' Das Bundesland wurde geändert; künftige Fristberechnungen verwenden die Feiertage des neuen Landes. Bereits gespeicherte Fristen bleiben unverändert.'
      : '';
  zurueck('/verwaltung', 'ok', `Betriebsdaten gespeichert.${hinweis}`);
}

// ---------------------------------------------------------------------------
// Gremium
// ---------------------------------------------------------------------------

export async function speichereGremium(formular: FormData) {
  const benutzer = await verlangeRecht('gremium.verwalten');
  const id = text(formular, 'id');
  const vorher = await prisma.gremium.findUnique({ where: { id } });
  if (!vorher) zurueck('/verwaltung', 'fehler', 'Das Gremium wurde nicht gefunden.');

  const bezeichnung = text(formular, 'bezeichnung');
  const sollGroesse = Number(formular.get('sollGroesse') ?? 0);
  if (!bezeichnung) zurueck('/verwaltung', 'fehler', 'Die Bezeichnung des Gremiums ist anzugeben.');
  if (!Number.isInteger(sollGroesse) || sollGroesse < 1) {
    zurueck('/verwaltung', 'fehler', 'Die Zahl der Mitglieder muss mindestens 1 betragen.');
  }
  // § 9 BetrVG kennt nur ungerade Mitgliederzahlen ab drei; die Einerzahl
  // gilt nur fuer Kleinbetriebe (§ 9 S. 1 BetrVG).
  if (sollGroesse > 1 && sollGroesse % 2 === 0) {
    zurueck(
      '/verwaltung',
      'fehler',
      'Ein Betriebsrat besteht nach § 9 BetrVG aus einer ungeraden Zahl von Mitgliedern (1, 3, 5, 7, …).',
    );
  }

  const daten = {
    bezeichnung,
    sollGroesse,
    videoteilnahmeErlaubt: schalter(formular, 'videoteilnahmeErlaubt'),
    aktiv: schalter(formular, 'aktiv'),
  };

  await prisma.gremium.update({ where: { id }, data: daten });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Gremium',
    entitaetId: id,
    details:
      `Bezeichnung "${daten.bezeichnung}", Sollgröße ${daten.sollGroesse}, ` +
      `Video-/Telefonteilnahme ${daten.videoteilnahmeErlaubt ? 'zugelassen' : 'nicht zugelassen'}.`,
  });

  revalidatePath('/verwaltung');
  zurueck('/verwaltung', 'ok', 'Angaben zum Gremium gespeichert.');
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

export async function speichereEinstellungen(formular: FormData) {
  const benutzer = await verlangeRecht('gremium.verwalten');

  const gesetzte: string[] = [];
  for (const schluessel of formular.getAll('schluessel').map(String)) {
    const geprueft = pruefeWert(schluessel, String(formular.get(schluessel) ?? ''));
    if (!geprueft.gueltig) zurueck('/verwaltung', 'fehler', geprueft.fehler);
    await prisma.einstellung.upsert({
      where: { schluessel },
      create: { schluessel, wert: geprueft.wert },
      update: { wert: geprueft.wert },
    });
    gesetzte.push(`${schluessel}=${geprueft.wert}`);
  }

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Einstellung',
    details: gesetzte.join(', '),
  });

  revalidatePath('/', 'layout');
  zurueck('/verwaltung', 'ok', 'Einstellungen gespeichert.');
}

// ---------------------------------------------------------------------------
// Benutzerkonten
// ---------------------------------------------------------------------------

function leseRollen(formular: FormData): Systemrolle[] {
  const gewaehlt = formular.getAll('rollen').map(String) as Systemrolle[];
  return gewaehlt.filter((r) => ALLE_ROLLEN.includes(r));
}

export async function legeBenutzerAn(formular: FormData) {
  const handelnder = await verlangeRecht('benutzer.verwalten');

  const anzeigename = text(formular, 'anzeigename');
  const email = text(formular, 'email').toLowerCase();
  const passwort = String(formular.get('passwort') ?? '');
  const rollen = leseRollen(formular);
  const personId = text(formular, 'personId') || null;

  if (!anzeigename || !email) zurueck('/verwaltung/benutzer', 'fehler', 'Name und E-Mail-Adresse sind anzugeben.');

  const mischung = pruefeRollenmischung(rollen);
  if (mischung) zurueck('/verwaltung/benutzer', 'fehler', mischung);

  const staerke = pruefePasswortstaerke(passwort);
  if (!staerke.tauglich) zurueck('/verwaltung/benutzer', 'fehler', staerke.maengel.join(' '));

  if (await prisma.benutzer.findUnique({ where: { email } })) {
    zurueck('/verwaltung/benutzer', 'fehler', 'Für diese E-Mail-Adresse besteht bereits ein Konto.');
  }
  if (personId && (await prisma.benutzer.findUnique({ where: { personId } }))) {
    zurueck('/verwaltung/benutzer', 'fehler', 'Dieser Person ist bereits ein Konto zugeordnet.');
  }

  const angelegt = await prisma.benutzer.create({
    data: {
      anzeigename,
      email,
      personId,
      rollen,
      passwortHash: await hashePasswort(passwort),
      // Das vergebene Kennwort ist dem Vorsitz bekannt; es muss beim ersten
      // Anmelden gewechselt werden.
      passwortWechsel: true,
    },
  });

  await protokolliere({
    benutzerId: handelnder.id,
    benutzerName: handelnder.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Benutzer',
    entitaetId: angelegt.id,
    details:
      `Konto "${email}" mit den Rollen ${rollen.join(', ')} angelegt.` +
      (hinweisRollenmischung(rollen) ? ' Hinweis: Gremiums- und Arbeitgeberrolle zugleich vergeben.' : ''),
  });

  revalidatePath('/verwaltung/benutzer');
  const hinweis = hinweisRollenmischung(rollen);
  zurueck(
    '/verwaltung/benutzer',
    'ok',
    `Konto für ${anzeigename} angelegt. Das Kennwort ist persönlich zu übergeben und beim ersten Anmelden zu wechseln.` +
      (hinweis ? ` ${hinweis}` : ''),
  );
}

export async function aendereRollen(formular: FormData) {
  const handelnder = await verlangeRecht('benutzer.verwalten');
  const id = text(formular, 'id');
  const rollen = leseRollen(formular);

  if (id === handelnder.id) {
    zurueck(
      '/verwaltung/benutzer',
      'fehler',
      'Die eigenen Rollen lassen sich hier nicht ändern – sonst könnte man sich versehentlich selbst aussperren.',
    );
  }

  const mischung = pruefeRollenmischung(rollen);
  if (mischung) zurueck('/verwaltung/benutzer', 'fehler', mischung);

  const vorher = await prisma.benutzer.findUnique({ where: { id } });
  if (!vorher) zurueck('/verwaltung/benutzer', 'fehler', 'Das Konto wurde nicht gefunden.');

  await prisma.benutzer.update({ where: { id }, data: { rollen } });

  await protokolliere({
    benutzerId: handelnder.id,
    benutzerName: handelnder.anzeigename,
    aktion: 'RECHTEAENDERUNG',
    entitaet: 'Benutzer',
    entitaetId: id,
    details:
      `Rollen von "${vorher.email}": ${vorher.rollen.join(', ') || '—'} → ${rollen.join(', ')}` +
      (hinweisRollenmischung(rollen) ? ' Hinweis: Gremiums- und Arbeitgeberrolle zugleich vergeben.' : ''),
  });

  revalidatePath('/verwaltung/benutzer');
  const hinweis = hinweisRollenmischung(rollen);
  zurueck(
    '/verwaltung/benutzer',
    'ok',
    `Rollen für ${vorher.anzeigename} gespeichert.` + (hinweis ? ` ${hinweis}` : ''),
  );
}

export async function schalteKonto(formular: FormData) {
  const handelnder = await verlangeRecht('benutzer.verwalten');
  const id = text(formular, 'id');
  const aktiv = text(formular, 'aktiv') === 'ja';

  if (id === handelnder.id) {
    zurueck('/verwaltung/benutzer', 'fehler', 'Das eigene Konto lässt sich nicht deaktivieren.');
  }

  const vorher = await prisma.benutzer.findUnique({ where: { id } });
  if (!vorher) zurueck('/verwaltung/benutzer', 'fehler', 'Das Konto wurde nicht gefunden.');

  await prisma.$transaction([
    prisma.benutzer.update({
      where: { id },
      data: { aktiv, gesperrtBis: null, fehlversuche: 0 },
    }),
    // Beim Deaktivieren laufende Anmeldungen sofort beenden.
    ...(aktiv ? [] : [prisma.sitzungstoken.updateMany({ where: { benutzerId: id }, data: { widerrufen: true } })]),
  ]);

  await protokolliere({
    benutzerId: handelnder.id,
    benutzerName: handelnder.anzeigename,
    aktion: 'RECHTEAENDERUNG',
    entitaet: 'Benutzer',
    entitaetId: id,
    details: `Konto "${vorher.email}" ${aktiv ? 'aktiviert' : 'deaktiviert; offene Anmeldungen beendet'}.`,
  });

  revalidatePath('/verwaltung/benutzer');
  zurueck('/verwaltung/benutzer', 'ok', `Konto ${aktiv ? 'aktiviert' : 'deaktiviert'}.`);
}

export async function setzePasswortZurueck(formular: FormData) {
  const handelnder = await verlangeRecht('benutzer.verwalten');
  const id = text(formular, 'id');
  const passwort = String(formular.get('passwort') ?? '');

  const staerke = pruefePasswortstaerke(passwort);
  if (!staerke.tauglich) zurueck('/verwaltung/benutzer', 'fehler', staerke.maengel.join(' '));

  const vorher = await prisma.benutzer.findUnique({ where: { id } });
  if (!vorher) zurueck('/verwaltung/benutzer', 'fehler', 'Das Konto wurde nicht gefunden.');

  await prisma.$transaction([
    prisma.benutzer.update({
      where: { id },
      data: {
        passwortHash: await hashePasswort(passwort),
        passwortWechsel: true,
        gesperrtBis: null,
        fehlversuche: 0,
      },
    }),
    prisma.sitzungstoken.updateMany({ where: { benutzerId: id }, data: { widerrufen: true } }),
  ]);

  await protokolliere({
    benutzerId: handelnder.id,
    benutzerName: handelnder.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Benutzer',
    entitaetId: id,
    // Das Kennwort selbst steht nirgends im Protokoll.
    details: `Kennwort für "${vorher.email}" zurückgesetzt; Wechsel bei der nächsten Anmeldung erforderlich.`,
  });

  revalidatePath('/verwaltung/benutzer');
  zurueck(
    '/verwaltung/benutzer',
    'ok',
    `Kennwort für ${vorher.anzeigename} gesetzt. Es ist persönlich zu übergeben, nicht per E-Mail.`,
  );
}

// ---------------------------------------------------------------------------
// Bestand zuruecksetzen
// ---------------------------------------------------------------------------

export async function setzeBestandZurueck(formular: FormData) {
  const handelnder = await verlangeRecht('benutzer.verwalten');
  const tiefe = text(formular, 'tiefe') as Loeschtiefe;
  const bestaetigung = text(formular, 'bestaetigung');

  if (tiefe !== 'BEWEGUNG' && tiefe !== 'VOLLSTAENDIG') {
    zurueck('/verwaltung/daten', 'fehler', 'Unbekannter Umfang.');
  }

  const betrieb = await prisma.betrieb.findFirst();
  const erwartet = tiefe === 'BEWEGUNG' ? 'LÖSCHEN' : (betrieb?.name ?? 'LÖSCHEN');

  if (bestaetigung !== erwartet) {
    zurueck(
      '/verwaltung/daten',
      'fehler',
      `Zur Bestätigung ist „${erwartet}" genau so einzutragen. Es wurde nichts gelöscht.`,
    );
  }

  // Beim vollstaendigen Zuruecksetzen verschwinden auch die Personen. Der
  // Verweis des eigenen Kontos auf eine Person muss deshalb vorher geloest
  // werden, sonst scheiterte das Loeschen am Fremdschluessel.
  if (tiefe === 'VOLLSTAENDIG') {
    await prisma.benutzer.update({ where: { id: handelnder.id }, data: { personId: null } });
  }

  const bilanz = await fuehreLoeschplanAus(prisma as unknown as Record<string, unknown>, tiefe, handelnder.id);

  if (tiefe === 'VOLLSTAENDIG') {
    // Einstellungen bleiben grundsaetzlich erhalten. Schluessel ausserhalb des
    // Katalogs koennen aber Kennungen geloeschter Datensaetze enthalten und
    // zeigten danach ins Leere; sie werden deshalb mit entfernt.
    const bekannt = EINSTELLUNGEN.map((e) => e.schluessel);
    const verwaist = await prisma.einstellung.deleteMany({ where: { schluessel: { notIn: bekannt } } });
    if (verwaist.count > 0) bilanz.push({ tabelle: 'einstellung (verwaiste Schlüssel)', entfernt: verwaist.count });
  }

  const bericht = bilanz.map((z) => `${z.tabelle}: ${z.entfernt}`).join(', ') || 'nichts zu löschen';

  if (tiefe === 'VOLLSTAENDIG') {
    // Das Protokoll wird als Ganzes geleert und neu begonnen – siehe die
    // Begruendung in src/lib/bestand.ts. Der erste Eintrag der neuen Kette
    // haelt die Zuruecksetzung fest.
    await prisma.auditEintrag.deleteMany();
    await protokolliere({
      benutzerId: handelnder.id,
      benutzerName: handelnder.anzeigename,
      aktion: 'LOESCHLAUF',
      entitaet: 'Bestand',
      details:
        `Bestand vollständig zurückgesetzt (${summe(bilanz)} Datensätze: ${bericht}). ` +
        'Das Zugriffsprotokoll wurde dabei geleert; diese Kette beginnt hier neu.',
    });
  } else {
    await protokolliere({
      benutzerId: handelnder.id,
      benutzerName: handelnder.anzeigename,
      aktion: 'LOESCHLAUF',
      entitaet: 'Bestand',
      details: `Bewegungsdaten gelöscht (${summe(bilanz)} Datensätze: ${bericht}).`,
    });
  }

  revalidatePath('/', 'layout');
  zurueck(
    '/verwaltung/daten',
    'ok',
    `${summe(bilanz)} Datensätze entfernt. ${
      tiefe === 'VOLLSTAENDIG'
        ? 'Betrieb, Gremium, Amtsperiode, Einstellungen und Ihr eigenes Konto sind erhalten geblieben.'
        : 'Personen, Mitgliedschaften und Konten sind erhalten geblieben.'
    }`,
  );
}

/**
 * Legt die Sollgroesse des Gremiums aus der Zahl der Wahlberechtigten neu ab –
 * als Vorschlag fuer die naechste regelmaessige Wahl. Waehrend der laufenden
 * Amtszeit aendert sich die Groesse des Betriebsrats nicht; § 13 Abs. 2 Nr. 1
 * BetrVG laesst eine Neuwahl erst zu, wenn die Beschaeftigtenzahl 24 Monate
 * nach der Wahl so weit ab liegt, dass eine andere Groesse massgeblich waere.
 */
export async function uebernimmVorschlagGroesse(formular: FormData) {
  const benutzer = await verlangeRecht('gremium.verwalten');
  const gremiumId = text(formular, 'gremiumId');
  const gremium = await prisma.gremium.findUnique({ where: { id: gremiumId }, include: { betrieb: true } });
  if (!gremium) zurueck('/verwaltung', 'fehler', 'Das Gremium wurde nicht gefunden.');

  const vorschlag = groesseBetriebsrat(gremium.betrieb.anzahlWahlberechtigte);
  await prisma.gremium.update({ where: { id: gremiumId }, data: { sollGroesse: vorschlag } });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Gremium',
    entitaetId: gremiumId,
    details: `Sollgröße auf ${vorschlag} gesetzt (§ 9 BetrVG, ${gremium.betrieb.anzahlWahlberechtigte} Wahlberechtigte).`,
  });

  revalidatePath('/verwaltung');
  zurueck(
    '/verwaltung',
    'ok',
    `Sollgröße auf ${vorschlag} gesetzt. Für den amtierenden Betriebsrat bleibt die bei der Wahl ` +
      'zugrunde gelegte Größe maßgeblich; die Angabe wirkt sich auf die nächste Wahl aus.',
  );
}
