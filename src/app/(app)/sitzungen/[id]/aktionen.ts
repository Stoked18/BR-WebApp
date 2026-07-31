'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { protokolliere } from '@/lib/audit';
import { ermittleNachruecker, pruefeBeschlussfaehigkeit, werteAbstimmung, type Nachrueckkandidat } from '@/lib/betrvg';
import { istVorDerSitzung, zaehleAnwesend } from '@/lib/sitzung';
import type { Mehrheitserfordernis, Verhinderungsgrund } from '@prisma/client';

/**
 * Meldet die Verhinderung eines ordentlichen Mitglieds und ermittelt das
 * nachrueckende Ersatzmitglied nach § 25 BetrVG.
 *
 * Die Ermittlung erfolgt bewusst serverseitig und wird protokolliert: Wer
 * geladen wurde, entscheidet ueber die Wirksamkeit der spaeter gefassten
 * Beschluesse. Laedt der Vorsitz das falsche Ersatzmitglied, kann das die
 * Unwirksamkeit saemtlicher Beschluesse der Sitzung zur Folge haben.
 */
export async function meldeVerhinderung(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.planen');

  const sitzungId = String(formular.get('sitzungId'));
  const personId = String(formular.get('personId'));
  const grund = String(formular.get('grund')) as Verhinderungsgrund;

  const sitzung = await prisma.sitzung.findUniqueOrThrow({
    where: { id: sitzungId },
    include: { gremium: true, verhinderungen: true },
  });
  if (!sitzung.gremiumId) throw new Error('Nachrücken ist nur für Gremiumssitzungen vorgesehen.');

  const amtsperiode = await prisma.amtsperiode.findFirstOrThrow({ where: { aktiv: true } });

  const ersatzmitglieder = await prisma.mitgliedschaft.findMany({
    where: { gremiumId: sitzung.gremiumId, amtsperiodeId: amtsperiode.id, status: 'ERSATZMITGLIED', ende: null },
    include: { person: true },
  });

  const stimmen = await prisma.wahlergebnis.findMany({
    where: { amtsperiodeId: amtsperiode.id, personId: { in: ersatzmitglieder.map((m) => m.personId) } },
  });

  const kandidaten: Nachrueckkandidat[] = ersatzmitglieder
    .map((m) => ({
      personId: m.personId,
      name: `${m.person.vorname} ${m.person.nachname}`,
      stimmen: stimmen.find((s) => s.personId === m.personId)?.stimmen ?? 0,
      geschlecht: m.person.geschlecht as Nachrueckkandidat['geschlecht'],
      rang: m.nachrueckRang ?? 999,
    }))
    .sort((a, b) => b.stimmen - a.stimmen);

  // Ersatzmitglieder, die fuer diese Sitzung bereits geladen wurden, sind gebunden.
  const belegt = new Set(
    sitzung.verhinderungen.map((v) => v.ersatzPersonId).filter((x): x is string => Boolean(x)),
  );

  const vorschlag = ermittleNachruecker(kandidaten, belegt);

  await prisma.verhinderung.upsert({
    where: { sitzungId_personId: { sitzungId, personId } },
    create: {
      sitzungId,
      personId,
      grund,
      ersatzPersonId: vorschlag.kandidat?.personId ?? null,
      ersatzGeladenAm: vorschlag.kandidat ? new Date() : null,
    },
    update: {
      grund,
      ersatzPersonId: vorschlag.kandidat?.personId ?? null,
      ersatzGeladenAm: vorschlag.kandidat ? new Date() : null,
    },
  });

  await prisma.teilnahme.upsert({
    where: { sitzungId_personId: { sitzungId, personId } },
    create: { sitzungId, personId, rolle: 'ORDENTLICHES_MITGLIED', status: 'VERTRETEN', stimmberechtigt: false },
    update: { status: 'VERTRETEN', stimmberechtigt: false },
  });

  if (vorschlag.kandidat) {
    await prisma.teilnahme.upsert({
      where: { sitzungId_personId: { sitzungId, personId: vorschlag.kandidat.personId } },
      // GELADEN, nicht ANWESEND: die Teilnahme steht erst in der Sitzung fest.
      create: { sitzungId, personId: vorschlag.kandidat.personId, rolle: 'ERSATZMITGLIED', status: 'GELADEN', stimmberechtigt: true },
      update: { rolle: 'ERSATZMITGLIED', status: 'GELADEN', stimmberechtigt: true },
    });
  }

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Verhinderung',
    entitaetId: sitzungId,
    details: `${vorschlag.begruendung}${vorschlag.warnungen.length ? ` Hinweise: ${vorschlag.warnungen.join(' ')}` : ''}`,
  });

  revalidatePath(`/sitzungen/${sitzungId}`);
}

/** Nimmt eine Verhinderungsmeldung zurueck. */
export async function loescheVerhinderung(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.planen');

  const sitzungId = String(formular.get('sitzungId'));
  const personId = String(formular.get('personId'));

  const eintrag = await prisma.verhinderung.findUnique({
    where: { sitzungId_personId: { sitzungId, personId } },
  });
  if (!eintrag) return;

  await prisma.verhinderung.delete({ where: { id: eintrag.id } });
  await prisma.teilnahme.updateMany({
    where: { sitzungId, personId },
    data: { status: 'GELADEN', stimmberechtigt: true },
  });
  if (eintrag.ersatzPersonId) {
    await prisma.teilnahme.deleteMany({ where: { sitzungId, personId: eintrag.ersatzPersonId } });
  }

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'LOESCHEN',
    entitaet: 'Verhinderung',
    entitaetId: sitzungId,
    details: 'Verhinderungsmeldung zurückgenommen; die Ladung des Ersatzmitglieds entfällt.',
  });

  revalidatePath(`/sitzungen/${sitzungId}`);
}

/** Legt einen Tagesordnungspunkt an. */
export async function ergaenzeTop(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.planen');

  const sitzungId = String(formular.get('sitzungId'));
  const titel = String(formular.get('titel')).trim();
  if (!titel) return;

  const letzter = await prisma.tagesordnungspunkt.findFirst({
    where: { sitzungId },
    orderBy: { nummer: 'desc' },
  });

  await prisma.tagesordnungspunkt.create({
    data: {
      sitzungId,
      nummer: (letzter?.nummer ?? 0) + 1,
      titel,
      beschreibung: String(formular.get('beschreibung') ?? '').trim() || null,
    },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Tagesordnungspunkt',
    entitaetId: sitzungId,
    details: titel,
  });

  revalidatePath(`/sitzungen/${sitzungId}`);
}

/**
 * Erfasst einen Beschluss.
 *
 * Vor dem Speichern werden zwei Dinge geprueft, die sich im Nachhinein nicht
 * mehr heilen lassen: die Beschlussfaehigkeit nach § 33 Abs. 2 BetrVG und die
 * erforderliche Mehrheit. Fehlt die Beschlussfaehigkeit, wird der Vorgang
 * nicht als Beschluss, sondern als Feststellung der Nichtbeschlussfaehigkeit
 * gespeichert – so bleibt nachvollziehbar, dass kein wirksamer Beschluss vorliegt.
 */
export async function erfasseBeschluss(formular: FormData) {
  const benutzer = await verlangeRecht('beschluss.erfassen');

  const topId = String(formular.get('topId'));
  const wortlaut = String(formular.get('wortlaut')).trim();
  const rechtsgrundlage = String(formular.get('rechtsgrundlage') ?? '').trim() || null;
  const art = String(formular.get('art') ?? 'OFFEN') === 'GEHEIM' ? 'GEHEIM' : 'OFFEN';
  const mehrheit = String(formular.get('mehrheit') ?? 'EINFACHE_MEHRHEIT_ANWESENDE') as Mehrheitserfordernis;
  const ja = Number(formular.get('ja') ?? 0);
  const nein = Number(formular.get('nein') ?? 0);
  const enthaltung = Number(formular.get('enthaltung') ?? 0);

  if (!wortlaut) throw new Error('Der Wortlaut des Beschlusses ist nach § 34 Abs. 1 S. 2 BetrVG festzuhalten.');

  const top = await prisma.tagesordnungspunkt.findUniqueOrThrow({
    where: { id: topId },
    include: {
      sitzung: {
        include: {
          gremium: true,
          ausschuss: { include: { mitglieder: { where: { ende: null } } } },
          teilnahmen: true,
        },
      },
    },
  });

  const sitzung = top.sitzung;
  const groesse = sitzung.gremium?.sollGroesse ?? sitzung.ausschuss?.mitglieder.length ?? 0;

  // § 33 Abs. 2 BetrVG knuepft an die tatsaechliche Teilnahme an. Solange die
  // Anwesenheit nicht festgestellt ist, gibt es keine belastbare Grundlage –
  // ein trotzdem erfasster Beschluss waere angreifbar.
  if (istVorDerSitzung(sitzung.status)) {
    throw new Error(
      'Vor Feststellung der Anwesenheit können keine Beschlüsse erfasst werden. ' +
        'Die Beschlussfähigkeit ist zu Beginn der Sitzung nach § 33 Abs. 2 BetrVG festzustellen.',
    );
  }

  const anwesend = zaehleAnwesend(sitzung.teilnahmen);
  const fachlich = pruefeBeschlussfaehigkeit(groesse, anwesend);
  const abstimmung = werteAbstimmung(ja, nein, enthaltung, anwesend, groesse, mehrheit);

  const jahr = new Date().getFullYear();
  const anzahl = await prisma.beschluss.count({ where: { gefasstAm: { gte: new Date(`${jahr}-01-01`) } } });
  const aktenzeichen = `BR-B-${jahr}-${String(anzahl + 1).padStart(3, '0')}`;

  const ergebnis = !fachlich.beschlussfaehig
    ? 'NICHT_BESCHLUSSFAEHIG'
    : abstimmung.angenommen
      ? 'ANGENOMMEN'
      : 'ABGELEHNT';

  await prisma.beschluss.create({
    data: {
      topId,
      aktenzeichen,
      wortlaut,
      rechtsgrundlage,
      art,
      jaStimmen: ja,
      neinStimmen: nein,
      enthaltungen: enthaltung,
      anwesendStimmberechtigt: anwesend,
      mehrheitserfordernis: mehrheit,
      ergebnis,
      gefasstAm: new Date(),
      bemerkung: `${fachlich.begruendung} ${abstimmung.begruendung}`,
      vorgangId: top.vorgangId,
    },
  });

  await prisma.tagesordnungspunkt.update({
    where: { id: topId },
    data: { status: fachlich.beschlussfaehig ? 'BESCHLOSSEN' : 'VERTAGT' },
  });

  if (top.vorgangId && fachlich.beschlussfaehig) {
    await prisma.vorgang.update({ where: { id: top.vorgangId }, data: { status: 'BESCHLOSSEN' } });
  }

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Beschluss',
    entitaetId: aktenzeichen,
    details: `${ergebnis}. ${fachlich.begruendung} ${abstimmung.begruendung}`,
  });

  revalidatePath(`/sitzungen/${sitzung.id}`);
  revalidatePath('/beschluesse');
}

/** Stellt die Beschlussfaehigkeit zu Beginn der Sitzung fest. */
export async function stelleBeschlussfaehigkeitFest(formular: FormData) {
  const benutzer = await verlangeRecht('sitzung.leiten');

  const sitzungId = String(formular.get('sitzungId'));
  const sitzung = await prisma.sitzung.findUniqueOrThrow({
    where: { id: sitzungId },
    include: {
      gremium: true,
      ausschuss: { include: { mitglieder: { where: { ende: null } } } },
      teilnahmen: true,
      verhinderungen: true,
    },
  });

  const groesse = sitzung.gremium?.sollGroesse ?? sitzung.ausschuss?.mitglieder.length ?? 0;

  // Anwesenheitsliste aus der Ladung erzeugen: alle ordentlichen Mitglieder
  // ohne Verhinderungsmeldung sowie die geladenen Ersatzmitglieder gelten
  // zunaechst als anwesend. Die Sitzungsleitung korrigiert anschliessend, wer
  // tatsaechlich fehlt – die Liste ist nach § 34 Abs. 1 S. 3 BetrVG von den
  // Teilnehmenden zu unterzeichnen.
  if (sitzung.gremiumId) {
    const amtsperiode = await prisma.amtsperiode.findFirst({ where: { aktiv: true } });
    const ordentliche = await prisma.mitgliedschaft.findMany({
      where: {
        gremiumId: sitzung.gremiumId,
        status: 'ORDENTLICH',
        ende: null,
        ...(amtsperiode ? { amtsperiodeId: amtsperiode.id } : {}),
      },
      select: { personId: true },
    });
    const verhindert = new Set(sitzung.verhinderungen.map((v) => v.personId));
    for (const m of ordentliche) {
      if (verhindert.has(m.personId)) continue;
      await prisma.teilnahme.upsert({
        where: { sitzungId_personId: { sitzungId, personId: m.personId } },
        create: { sitzungId, personId: m.personId, rolle: 'ORDENTLICHES_MITGLIED', status: 'ANWESEND', stimmberechtigt: true },
        update: { status: 'ANWESEND', stimmberechtigt: true },
      });
    }
    await prisma.teilnahme.updateMany({
      where: { sitzungId, status: 'GELADEN' },
      data: { status: 'ANWESEND' },
    });
  }

  const teilnahmen = await prisma.teilnahme.findMany({ where: { sitzungId } });
  const anwesend = zaehleAnwesend(teilnahmen);
  const pruefung = pruefeBeschlussfaehigkeit(groesse, anwesend);

  await prisma.sitzung.update({
    where: { id: sitzungId },
    data: {
      beschlussfaehig: pruefung.beschlussfaehig,
      anwesendZahl: anwesend,
      erforderlichZahl: pruefung.erforderlich,
      status: 'LAUFEND',
      nichtoeffentlichkeitBestaetigt: true,
    },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Sitzung',
    entitaetId: sitzungId,
    details: pruefung.begruendung,
  });

  revalidatePath(`/sitzungen/${sitzungId}`);
}
