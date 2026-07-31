/**
 * Beispieldatenbestand.
 *
 * Bildet den beschriebenen Betrieb ab: Medizintechnik mit Kunststoffspritzguss
 * und Montage, rund 700 Beschaeftigte, vollkontinuierlicher Schichtbetrieb an
 * 350 Tagen, 13-koepfiger Betriebsrat aus Personenwahl, Zugehoerigkeit zu einem
 * boersennotierten Konzern, Aufsichtsrat in Vorbereitung.
 *
 * Alle Personen sind frei erfunden. Die Fristen werden relativ zum Ausfuehrungstag
 * berechnet, damit der Bestand jederzeit ein realistisches Bild ergibt.
 */

import { PrismaClient, type Systemrolle } from '@prisma/client';
import { hashePasswort } from '../src/lib/passwort';
import { berechneNachVorlage } from '../src/lib/fristen';
import { alsKalendertag } from '../src/lib/fristen';
import { betriebsausschuss, freistellungen, groesseBetriebsrat } from '../src/lib/betrvg';

const prisma = new PrismaClient();

const HEUTE = new Date();
function tageVersetzt(tage: number): Date {
  const d = new Date(HEUTE);
  d.setDate(d.getDate() + tage);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function leere() {
  // Reihenfolge folgt den Fremdschluesseln.
  await prisma.$transaction([
    prisma.auditEintrag.deleteMany(),
    prisma.sitzungstoken.deleteMany(),
    prisma.einspruch.deleteMany(),
    prisma.niederschrift.deleteMany(),
    prisma.aufgabe.deleteMany(),
    prisma.dokument.deleteMany(),
    prisma.beschluss.deleteMany(),
    prisma.tagesordnungspunkt.deleteMany(),
    prisma.teilnahme.deleteMany(),
    prisma.verhinderung.deleteMany(),
    prisma.sitzung.deleteMany(),
    prisma.fristereignis.deleteMany(),
    prisma.vorgang.deleteMany(),
    prisma.betriebsvereinbarung.deleteMany(),
    prisma.schulung.deleteMany(),
    prisma.sprechstunde.deleteMany(),
    prisma.funktion.deleteMany(),
    prisma.freistellung.deleteMany(),
    prisma.ausschussMitgliedschaft.deleteMany(),
    prisma.ausschuss.deleteMany(),
    prisma.mitgliedschaft.deleteMany(),
    prisma.wahlergebnis.deleteMany(),
    prisma.benutzer.deleteMany(),
    prisma.person.deleteMany(),
    prisma.schichtgruppe.deleteMany(),
    prisma.schichtmodell.deleteMany(),
    prisma.gremium.deleteMany(),
    prisma.amtsperiode.deleteMany(),
    prisma.betrieb.deleteMany(),
    prisma.aufsichtsratMeilenstein.deleteMany(),
    prisma.aufsichtsratProjekt.deleteMany(),
    prisma.verarbeitungstaetigkeit.deleteMany(),
    prisma.loeschregel.deleteMany(),
    prisma.betroffenenanfrage.deleteMany(),
    prisma.einstellung.deleteMany(),
  ]);
}

type Bewerber = {
  vorname: string;
  nachname: string;
  stimmen: number;
  geschlecht: 'WEIBLICH' | 'MAENNLICH';
  abteilung: string;
  personalnummer: string;
};

/** Ergebnis der Personenwahl, absteigend nach Stimmenzahl. */
const BEWERBER: Bewerber[] = [
  { vorname: 'Martina', nachname: 'Kowalski', stimmen: 312, geschlecht: 'WEIBLICH', abteilung: 'Montage', personalnummer: '10241' },
  { vorname: 'Frank', nachname: 'Osterhues', stimmen: 287, geschlecht: 'MAENNLICH', abteilung: 'Spritzguss', personalnummer: '10088' },
  { vorname: 'Aylin', nachname: 'Demirci', stimmen: 265, geschlecht: 'WEIBLICH', abteilung: 'Qualitätssicherung', personalnummer: '10517' },
  { vorname: 'Thomas', nachname: 'Brenner', stimmen: 241, geschlecht: 'MAENNLICH', abteilung: 'Instandhaltung', personalnummer: '10032' },
  { vorname: 'Sabine', nachname: 'Wolters', stimmen: 233, geschlecht: 'WEIBLICH', abteilung: 'Montage', personalnummer: '10604' },
  { vorname: 'Dieter', nachname: 'Havemann', stimmen: 219, geschlecht: 'MAENNLICH', abteilung: 'Werkzeugbau', personalnummer: '10015' },
  { vorname: 'Nadine', nachname: 'Krüger', stimmen: 208, geschlecht: 'WEIBLICH', abteilung: 'Logistik', personalnummer: '10733' },
  { vorname: 'Murat', nachname: 'Yildiz', stimmen: 196, geschlecht: 'MAENNLICH', abteilung: 'Spritzguss', personalnummer: '10199' },
  { vorname: 'Kerstin', nachname: 'Lohmann', stimmen: 187, geschlecht: 'WEIBLICH', abteilung: 'Reinraum', personalnummer: '10422' },
  { vorname: 'Andreas', nachname: 'Petzold', stimmen: 174, geschlecht: 'MAENNLICH', abteilung: 'Prozesstechnik', personalnummer: '10276' },
  { vorname: 'Beate', nachname: 'Sillmann', stimmen: 168, geschlecht: 'WEIBLICH', abteilung: 'Montage', personalnummer: '10851' },
  { vorname: 'Jörg', nachname: 'Rademacher', stimmen: 159, geschlecht: 'MAENNLICH', abteilung: 'Instandhaltung', personalnummer: '10067' },
  { vorname: 'Elena', nachname: 'Novak', stimmen: 151, geschlecht: 'WEIBLICH', abteilung: 'Qualitätssicherung', personalnummer: '10688' },
  // Ab hier nicht gewaehlte Bewerber – Ersatzmitglieder nach § 25 Abs. 2 S. 2 BetrVG
  { vorname: 'Christoph', nachname: 'Vahle', stimmen: 143, geschlecht: 'MAENNLICH', abteilung: 'Spritzguss', personalnummer: '10310' },
  { vorname: 'Petra', nachname: 'Bäumer', stimmen: 138, geschlecht: 'WEIBLICH', abteilung: 'Montage', personalnummer: '10945' },
  { vorname: 'Sven', nachname: 'Kleinschmidt', stimmen: 129, geschlecht: 'MAENNLICH', abteilung: 'Logistik', personalnummer: '10123' },
  { vorname: 'Fatma', nachname: 'Öztürk', stimmen: 121, geschlecht: 'WEIBLICH', abteilung: 'Reinraum', personalnummer: '10559' },
  { vorname: 'Ralf', nachname: 'Timmermann', stimmen: 114, geschlecht: 'MAENNLICH', abteilung: 'Werkzeugbau', personalnummer: '10044' },
  { vorname: 'Ingrid', nachname: 'Sanders', stimmen: 106, geschlecht: 'WEIBLICH', abteilung: 'Qualitätssicherung', personalnummer: '10777' },
  { vorname: 'Bernd', nachname: 'Alsdorf', stimmen: 97, geschlecht: 'MAENNLICH', abteilung: 'Prozesstechnik', personalnummer: '10201' },
  { vorname: 'Julia', nachname: 'Rehberg', stimmen: 89, geschlecht: 'WEIBLICH', abteilung: 'Montage', personalnummer: '10982' },
];

async function main() {
  console.log('Leere den Bestand ...');
  await leere();

  // -------------------------------------------------------------------------
  // Betrieb und Amtsperiode
  // -------------------------------------------------------------------------

  // Hinweis zur Schwelle des § 9 BetrVG: 13 Mitglieder setzen mindestens 701
  // wahlberechtigte Arbeitnehmer voraus. Bei rund 700 Stammbeschaeftigten wird
  // diese Schwelle regelmaessig erst mit den nach § 7 S. 2 BetrVG
  // wahlberechtigten Leiharbeitnehmern erreicht. Der Wert ist deshalb bewusst
  // getrennt von der Zahl der Stammbeschaeftigten gefuehrt.
  const betrieb = await prisma.betrieb.create({
    data: {
      name: 'Medizintechnik Werk Rhein-Ruhr GmbH',
      ort: 'Solingen',
      bundesland: 'NW',
      anzahlWahlberechtigte: 712,
      anzahlBeschaeftigte: 700,
      tarifgebunden: true,
      tarifvertrag: 'Tarifvertrag der Metall- und Elektroindustrie NRW',
      konzernName: 'Global MedTech Holdings Inc.',
      boersennotiert: true,
    },
  });

  const amtsperiode = await prisma.amtsperiode.create({
    data: {
      betriebId: betrieb.id,
      bezeichnung: 'Amtsperiode 2026–2030',
      // § 13 Abs. 1 BetrVG: regelmaessige Wahlen alle vier Jahre zwischen dem
      // 1. Maerz und dem 31. Mai. § 21 BetrVG: Amtszeit vier Jahre.
      wahltag: new Date('2026-03-17T00:00:00Z'),
      beginn: new Date('2026-03-18T00:00:00Z'),
      ende: new Date('2030-05-31T00:00:00Z'),
      wahlverfahren: 'PERSONENWAHL',
      aktiv: true,
    },
  });

  const sollGroesse = groesseBetriebsrat(betrieb.anzahlWahlberechtigte);

  const gremium = await prisma.gremium.create({
    data: {
      betriebId: betrieb.id,
      typ: 'BETRIEBSRAT',
      bezeichnung: 'Betriebsrat Werk Solingen',
      sollGroesse,
      videoteilnahmeErlaubt: true,
    },
  });

  // -------------------------------------------------------------------------
  // Schichtmodelle – Grundlage der Terminplanung nach § 30 Abs. 1 S. 2 BetrVG
  // -------------------------------------------------------------------------

  const vierSchicht = await prisma.schichtmodell.create({
    data: {
      betriebId: betrieb.id,
      bezeichnung: 'Vollkontinuierliches Vierschichtsystem',
      beschreibung:
        'Spritzguss und Reinraum laufen an 350 Tagen im Jahr durch. Vier Schichtgruppen ' +
        'im rollierenden Wechsel, Wochenenden eingeschlossen.',
      tageProJahr: 350,
      gruppen: {
        create: [
          { bezeichnung: 'Gruppe A – Frühschicht', beginnUhrzeit: '06:00', endeUhrzeit: '14:00' },
          { bezeichnung: 'Gruppe B – Spätschicht', beginnUhrzeit: '14:00', endeUhrzeit: '22:00' },
          { bezeichnung: 'Gruppe C – Nachtschicht', beginnUhrzeit: '22:00', endeUhrzeit: '06:00' },
          { bezeichnung: 'Gruppe D – Freischicht/Springer', beginnUhrzeit: '06:00', endeUhrzeit: '14:00' },
        ],
      },
    },
    include: { gruppen: true },
  });

  await prisma.schichtmodell.create({
    data: {
      betriebId: betrieb.id,
      bezeichnung: 'Zweischichtsystem Montage',
      beschreibung: 'Montagelinien im Zweischichtbetrieb von Montag bis Freitag.',
      tageProJahr: 250,
      gruppen: {
        create: [
          { bezeichnung: 'Montage Früh', beginnUhrzeit: '06:00', endeUhrzeit: '14:30' },
          { bezeichnung: 'Montage Spät', beginnUhrzeit: '14:30', endeUhrzeit: '23:00' },
        ],
      },
    },
  });

  await prisma.schichtmodell.create({
    data: {
      betriebId: betrieb.id,
      bezeichnung: 'Tagschicht Verwaltung und Technik',
      beschreibung: 'Gleitzeit mit Kernarbeitszeit 09:00 bis 15:00 Uhr.',
      tageProJahr: 250,
      gruppen: { create: [{ bezeichnung: 'Tagschicht', beginnUhrzeit: '07:00', endeUhrzeit: '16:00' }] },
    },
  });

  // -------------------------------------------------------------------------
  // Personen, Wahlergebnis, Mitgliedschaften
  // -------------------------------------------------------------------------

  console.log('Lege Personen und Wahlergebnis an ...');
  const personen: { id: string; name: string; bewerber: Bewerber }[] = [];

  for (const [index, b] of BEWERBER.entries()) {
    const gewaehlt = index < sollGroesse;
    const person = await prisma.person.create({
      data: {
        vorname: b.vorname,
        nachname: b.nachname,
        personalnummer: b.personalnummer,
        email: `${b.vorname.toLowerCase().replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[m]!)}.${b.nachname
          .toLowerCase()
          .replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[m]!)}@medtech-solingen.example`,
        abteilung: b.abteilung,
        geschlecht: b.geschlecht,
        schichtgruppeId: vierSchicht.gruppen[index % vierSchicht.gruppen.length].id,
      },
    });
    personen.push({ id: person.id, name: `${b.vorname} ${b.nachname}`, bewerber: b });

    await prisma.wahlergebnis.create({
      data: {
        amtsperiodeId: amtsperiode.id,
        personId: person.id,
        stimmen: b.stimmen,
        gewaehlt,
        nachrueckRang: gewaehlt ? null : index - sollGroesse + 1,
      },
    });

    await prisma.mitgliedschaft.create({
      data: {
        personId: person.id,
        gremiumId: gremium.id,
        amtsperiodeId: amtsperiode.id,
        status: gewaehlt ? 'ORDENTLICH' : 'ERSATZMITGLIED',
        nachrueckRang: gewaehlt ? null : index - sollGroesse + 1,
        beginn: amtsperiode.beginn,
      },
    });
  }

  const p = (nachname: string) => personen.find((x) => x.bewerber.nachname === nachname)!;

  // -------------------------------------------------------------------------
  // Funktionen und Freistellungen
  // -------------------------------------------------------------------------

  const funktionsBeginn = amtsperiode.beginn;
  await prisma.funktion.createMany({
    data: [
      { personId: p('Kowalski').id, typ: 'VORSITZ', gremiumId: gremium.id, beginn: funktionsBeginn },
      { personId: p('Osterhues').id, typ: 'STELLV_VORSITZ', gremiumId: gremium.id, beginn: funktionsBeginn },
      { personId: p('Novak').id, typ: 'SCHRIFTFUEHRUNG', gremiumId: gremium.id, beginn: funktionsBeginn },
      { personId: p('Demirci').id, typ: 'DATENSCHUTZKOORDINATION', gremiumId: gremium.id, beginn: funktionsBeginn },
    ],
  });

  // § 38 Abs. 1 BetrVG: bei 700 Arbeitnehmern sind zwei Mitglieder freizustellen.
  const freizustellen = freistellungen(betrieb.anzahlBeschaeftigte);
  await prisma.freistellung.createMany({
    data: [
      { personId: p('Kowalski').id, umfang: 'VOLL', beginn: funktionsBeginn },
      { personId: p('Osterhues').id, umfang: 'VOLL', beginn: funktionsBeginn },
      // Dritte, freiwillig vereinbarte Teilfreistellung ueber das gesetzliche Mindestmass hinaus
      { personId: p('Demirci').id, umfang: 'TEILWEISE', prozent: 50, beginn: funktionsBeginn },
    ],
  });
  console.log(`  ${freizustellen.anzahl} Freistellungen nach § 38 BetrVG, zusätzlich eine Teilfreistellung.`);

  // -------------------------------------------------------------------------
  // Ausschuesse
  // -------------------------------------------------------------------------

  console.log('Lege Ausschüsse an ...');
  const ba = betriebsausschuss(sollGroesse);

  const betriebsausschussE = await prisma.ausschuss.create({
    data: {
      gremiumId: gremium.id,
      typ: 'BETRIEBSAUSSCHUSS',
      bezeichnung: 'Betriebsausschuss',
      beschreibung:
        'Führt die laufenden Geschäfte des Betriebsrats (§ 27 Abs. 2 S. 1 BetrVG) und nimmt die ' +
        'übertragenen Aufgaben zur selbständigen Erledigung wahr.',
      aufgabenUebertragen: true,
      uebertrageneAufgaben:
        'Vorbereitung und Abschluss von Regelungsabreden zur Terminplanung; Anhörungen nach § 102 BetrVG ' +
        'in Fällen ohne Widerspruchsempfehlung; Beschaffung von Sachmitteln nach § 40 Abs. 2 BetrVG bis 2.500 EUR.',
      beschlussbefugt: true,
      sollGroesse: ba.gesamt,
      mitglieder: {
        create: [
          { personId: p('Kowalski').id, vorsitz: true },
          { personId: p('Osterhues').id },
          { personId: p('Demirci').id },
          { personId: p('Brenner').id },
          { personId: p('Wolters').id },
        ],
      },
    },
  });

  const ausschussDaten: Array<{
    bezeichnung: string;
    beschreibung: string;
    typ: 'WEITERER_AUSSCHUSS' | 'ARBEITSSCHUTZAUSSCHUSS' | 'WIRTSCHAFTSAUSSCHUSS' | 'ARBEITSGRUPPE';
    uebertragen: boolean;
    aufgaben?: string;
    mitglieder: string[];
    vorsitz: string;
  }> = [
    {
      bezeichnung: 'Ausschuss Arbeitszeit und Schicht',
      beschreibung:
        'Zuständig für Schichtpläne, Schichtwechsel, Überstunden und Urlaubsgrundsätze ' +
        '(§ 87 Abs. 1 Nr. 2, 3 und 5 BetrVG). Betreut den vollkontinuierlichen Betrieb an 350 Tagen.',
      typ: 'WEITERER_AUSSCHUSS',
      uebertragen: true,
      aufgaben:
        'Zustimmung zu kurzfristigen Schichtplanabweichungen und zu Mehrarbeit im Umfang von bis zu ' +
        '40 Stunden je Woche und Kostenstelle (§ 87 Abs. 1 Nr. 3 BetrVG).',
      mitglieder: ['Osterhues', 'Yildiz', 'Havemann', 'Lohmann', 'Rademacher'],
      vorsitz: 'Osterhues',
    },
    {
      bezeichnung: 'Personalausschuss',
      beschreibung:
        'Bereitet personelle Einzelmaßnahmen nach §§ 99 bis 102 BetrVG vor und prüft die ' +
        'Vollständigkeit der Unterrichtung.',
      typ: 'WEITERER_AUSSCHUSS',
      uebertragen: false,
      mitglieder: ['Kowalski', 'Wolters', 'Krüger', 'Novak'],
      vorsitz: 'Wolters',
    },
    {
      bezeichnung: 'Ausschuss Digitalisierung und IT-Systeme',
      beschreibung:
        'Begleitet die Einführung und Änderung technischer Einrichtungen, die zur Überwachung von ' +
        'Verhalten oder Leistung geeignet sind (§ 87 Abs. 1 Nr. 6 BetrVG), einschließlich der ' +
        'Konzernsysteme des Mutterunternehmens.',
      typ: 'WEITERER_AUSSCHUSS',
      uebertragen: false,
      mitglieder: ['Demirci', 'Petzold', 'Brenner', 'Novak'],
      vorsitz: 'Demirci',
    },
    {
      bezeichnung: 'Ausschuss Arbeits- und Gesundheitsschutz',
      beschreibung:
        'Gefährdungsbeurteilungen, Reinraum- und Gefahrstoffthemen, betriebliches ' +
        'Eingliederungsmanagement (§ 87 Abs. 1 Nr. 7 BetrVG, § 167 Abs. 2 SGB IX).',
      typ: 'WEITERER_AUSSCHUSS',
      uebertragen: false,
      mitglieder: ['Brenner', 'Sillmann', 'Lohmann', 'Havemann'],
      vorsitz: 'Brenner',
    },
    {
      bezeichnung: 'Ausschuss Qualifizierung und Berufsbildung',
      beschreibung: 'Berufsbildung und betriebliche Weiterbildung (§§ 96 bis 98 BetrVG).',
      typ: 'WEITERER_AUSSCHUSS',
      uebertragen: false,
      mitglieder: ['Krüger', 'Novak', 'Petzold'],
      vorsitz: 'Krüger',
    },
    {
      bezeichnung: 'Arbeitsschutzausschuss (ASA)',
      beschreibung:
        'Gemeinsames Gremium mit Arbeitgeber, Betriebsarzt, Fachkraft für Arbeitssicherheit und ' +
        'Sicherheitsbeauftragten; tagt mindestens vierteljährlich (§ 11 ASiG).',
      typ: 'ARBEITSSCHUTZAUSSCHUSS',
      uebertragen: false,
      mitglieder: ['Brenner', 'Sillmann'],
      vorsitz: 'Brenner',
    },
    {
      bezeichnung: 'Wirtschaftsausschuss',
      beschreibung:
        'Unterrichtung über wirtschaftliche Angelegenheiten des Unternehmens (§§ 106 ff. BetrVG), ' +
        'einschließlich der Berichtspflichten gegenüber der Konzernmutter.',
      typ: 'WIRTSCHAFTSAUSSCHUSS',
      uebertragen: false,
      mitglieder: ['Kowalski', 'Osterhues', 'Petzold'],
      vorsitz: 'Kowalski',
    },
    {
      bezeichnung: 'Arbeitsgruppe Aufsichtsratswahl',
      beschreibung:
        'Bereitet die Wahl der Arbeitnehmervertreter in den zu bildenden Aufsichtsrat nach dem ' +
        'DrittelbG vor und begleitet den Zeitplan des Unternehmens.',
      typ: 'ARBEITSGRUPPE',
      uebertragen: false,
      mitglieder: ['Kowalski', 'Osterhues', 'Demirci', 'Yildiz'],
      vorsitz: 'Kowalski',
    },
  ];

  const ausschuesse: Record<string, string> = { Betriebsausschuss: betriebsausschussE.id };
  for (const a of ausschussDaten) {
    const angelegt = await prisma.ausschuss.create({
      data: {
        gremiumId: gremium.id,
        typ: a.typ,
        bezeichnung: a.bezeichnung,
        beschreibung: a.beschreibung,
        aufgabenUebertragen: a.uebertragen,
        uebertrageneAufgaben: a.aufgaben,
        beschlussbefugt: a.uebertragen,
        sollGroesse: a.mitglieder.length,
        mitglieder: {
          create: a.mitglieder.map((n) => ({ personId: p(n).id, vorsitz: n === a.vorsitz })),
        },
      },
    });
    ausschuesse[a.bezeichnung] = angelegt.id;
  }

  // -------------------------------------------------------------------------
  // Benutzerkonten
  // -------------------------------------------------------------------------

  console.log('Lege Benutzerkonten an ...');
  const standardPasswort = await hashePasswort('Start!Passwort2026');

  const konten: Array<{ email: string; name: string; rollen: Systemrolle[]; nachname?: string }> = [
    { email: 'm.kowalski@medtech-solingen.example', name: 'Martina Kowalski', rollen: ['BR_VORSITZ'], nachname: 'Kowalski' },
    { email: 'f.osterhues@medtech-solingen.example', name: 'Frank Osterhues', rollen: ['BR_STELLV'], nachname: 'Osterhues' },
    { email: 'a.demirci@medtech-solingen.example', name: 'Aylin Demirci', rollen: ['BR_MITGLIED'], nachname: 'Demirci' },
    { email: 't.brenner@medtech-solingen.example', name: 'Thomas Brenner', rollen: ['BR_MITGLIED'], nachname: 'Brenner' },
    { email: 'e.novak@medtech-solingen.example', name: 'Elena Novak', rollen: ['BR_MITGLIED'], nachname: 'Novak' },
    { email: 'c.vahle@medtech-solingen.example', name: 'Christoph Vahle', rollen: ['ERSATZMITGLIED'], nachname: 'Vahle' },
    { email: 'personal@medtech-solingen.example', name: 'Katrin Feldhaus (Personalabteilung)', rollen: ['AG_PERSONAL'] },
    { email: 'produktionsleitung@medtech-solingen.example', name: 'Dr. Ulrich Sander (Produktionsleitung)', rollen: ['AG_FACHBEREICH'] },
    { email: 'sicherheit@medtech-solingen.example', name: 'Marco Lentz (Fachkraft für Arbeitssicherheit)', rollen: ['AG_ARBEITSSICHERHEIT'] },
    { email: 'datenschutz@medtech-solingen.example', name: 'Rechtsanwältin Ines Bergfeld (DSB)', rollen: ['DSB'] },
    { email: 'it-betrieb@medtech-solingen.example', name: 'Systembetrieb (ohne Fachzugriff)', rollen: ['IT_BETRIEB'] },
  ];

  for (const k of konten) {
    await prisma.benutzer.create({
      data: {
        email: k.email,
        anzeigename: k.name,
        passwortHash: standardPasswort,
        rollen: k.rollen,
        passwortWechsel: true,
        personId: k.nachname ? p(k.nachname).id : null,
      },
    });
  }

  const vorsitzKonto = await prisma.benutzer.findUnique({
    where: { email: 'm.kowalski@medtech-solingen.example' },
  });
  const personalKonto = await prisma.benutzer.findUnique({
    where: { email: 'personal@medtech-solingen.example' },
  });

  // -------------------------------------------------------------------------
  // Betriebsvereinbarungen
  // -------------------------------------------------------------------------

  console.log('Lege Betriebsvereinbarungen an ...');
  const bvDaten = [
    {
      nummer: 'BV 2026-01',
      titel: 'Arbeitszeit und Schichtsysteme',
      gegenstand:
        'Regelt Lage und Verteilung der Arbeitszeit in den vollkontinuierlichen Schichtsystemen, ' +
        'Schichtwechsel, Freischichten sowie den Ausgleich für Nacht-, Sonn- und Feiertagsarbeit.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 2 und 3 BetrVG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2026-04-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
      tarifvorbehaltVermerk:
        'Der Manteltarifvertrag der Metall- und Elektroindustrie NRW enthält eine Öffnungsklausel ' +
        'für betriebliche Schichtregelungen; § 77 Abs. 3 BetrVG steht daher nicht entgegen.',
    },
    {
      nummer: 'BV 2026-02',
      titel: 'Elektronische Arbeitszeiterfassung',
      gegenstand:
        'Erfassung von Beginn, Ende und Dauer der täglichen Arbeitszeit einschließlich der Pausen; ' +
        'Zweckbindung und Auswertungsverbot für Verhaltens- und Leistungskontrolle.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 6 BetrVG, § 3 Abs. 2 Nr. 1 ArbSchG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2026-05-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
    },
    {
      nummer: 'BV 2024-07',
      titel: 'Nutzung konzernweiter IT-Systeme (Microsoft 365, ServiceNow)',
      gegenstand:
        'Einsatz der vom Mutterunternehmen bereitgestellten Systeme, Protokollierungsumfang, ' +
        'Auswertungsverbot, Regelungen zur Datenübermittlung in Drittländer.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 6 BetrVG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2024-09-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
    },
    {
      nummer: 'BV 2025-03',
      titel: 'Betriebliches Eingliederungsmanagement',
      gegenstand:
        'Verfahren, Beteiligte und Datenschutz beim betrieblichen Eingliederungsmanagement ' +
        'einschließlich der Einbindung der Schwerbehindertenvertretung.',
      rechtsgrundlage: '§ 167 Abs. 2 SGB IX, § 87 Abs. 1 Nr. 7 BetrVG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2025-06-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
    },
    {
      nummer: 'BV 2025-08',
      titel: 'Hinweisgebersystem',
      gegenstand:
        'Betrieb der internen Meldestelle, Ausgestaltung des konzernweiten Meldekanals, ' +
        'Schutz der Identität hinweisgebender Personen.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 1 und 6 BetrVG, §§ 12 ff. HinSchG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2025-10-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
    },
    {
      nummer: 'BV 2022-04',
      titel: 'Videoüberwachung Werkgelände und Wareneingang',
      gegenstand: 'Standorte, Aufzeichnungsdauer, Zugriffsberechtigungen und Löschfristen.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 6 BetrVG, § 26 BDSG',
      status: 'GEKUENDIGT' as const,
      inkrafttretenAm: new Date('2022-07-01'),
      gekuendigtAm: tageVersetzt(-40),
      gekuendigtVon: 'Arbeitgeber',
      kuendigungsfristMonate: 3,
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
      bemerkung:
        'Nach Ablauf der Kündigungsfrist wirkt die Vereinbarung nach § 77 Abs. 6 BetrVG nach, ' +
        'weil es sich um eine erzwingbare Angelegenheit handelt. Neuverhandlung läuft.',
    },
    {
      nummer: 'BV 2026-05',
      titel: 'Einführung eines Manufacturing Execution Systems (MES)',
      gegenstand:
        'Maschinen- und auftragsbezogene Datenerfassung an den Spritzgussmaschinen, ' +
        'Verknüpfung mit Personalnummern, Auswertungsregeln und Rollenkonzept.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 6 BetrVG',
      status: 'IN_VERHANDLUNG' as const,
      nachwirkung: false,
      tarifvorbehaltGeprueft: false,
    },
    {
      nummer: 'BV 2023-02',
      titel: 'Mobiles Arbeiten',
      gegenstand: 'Voraussetzungen, Erreichbarkeit, Arbeitsschutz und Kostenerstattung.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 2 und 6 BetrVG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2023-04-01'),
      nachwirkung: false,
      tarifvorbehaltGeprueft: true,
    },
    {
      nummer: 'BV 2021-06',
      titel: 'Betriebliches Vorschlagswesen',
      gegenstand: 'Einreichung, Bewertung und Prämierung von Verbesserungsvorschlägen.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 12 BetrVG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2021-09-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
    },
    {
      nummer: 'BV 2026-03',
      titel: 'Persönliche Schutzausrüstung und Reinraumbekleidung',
      gegenstand:
        'Bereitstellung, Tragezeiten, Anrechnung der Umkleidezeiten als Arbeitszeit und ' +
        'Hygieneanforderungen in den Reinraumbereichen.',
      rechtsgrundlage: '§ 87 Abs. 1 Nr. 1 und 7 BetrVG',
      status: 'IN_KRAFT' as const,
      inkrafttretenAm: new Date('2026-06-01'),
      nachwirkung: true,
      tarifvorbehaltGeprueft: true,
    },
  ];

  for (const bv of bvDaten) {
    await prisma.betriebsvereinbarung.create({ data: bv });
  }

  // -------------------------------------------------------------------------
  // Vorgaenge mit Fristen
  // -------------------------------------------------------------------------

  console.log('Lege Vorgänge mit Fristen an ...');

  type VorgangSaat = {
    aktenzeichen: string;
    typ: Parameters<typeof prisma.vorgang.create>[0]['data']['typ'];
    titel: string;
    sachverhalt: string;
    eingangVorTagen: number;
    vorlage: 'ZUSTIMMUNG_99' | 'ANHOERUNG_102_ORDENTLICH' | 'ANHOERUNG_102_AUSSERORDENTLICH' | 'VORLAEUFIGE_MASSNAHME_100' | null;
    status: Parameters<typeof prisma.vorgang.create>[0]['data']['status'];
    fachbereich: string;
    personalnummer?: string;
    initialen?: string;
    ausschuss?: string;
    aufbewahrungMonate: number;
  };

  const vorgangSaat: VorgangSaat[] = [
    {
      aktenzeichen: 'BR-2026-0187',
      typ: 'EINSTELLUNG_99',
      titel: 'Einstellung Maschinenbediener Spritzguss (Nachtschicht)',
      sachverhalt:
        'Unbefristete Einstellung für die Kostenstelle 4711 zum 01.09.2026. Unterrichtung mit ' +
        'Bewerbungsunterlagen, Stellenbeschreibung und Eingruppierungsvorschlag EG 5 ERA.',
      eingangVorTagen: 2,
      vorlage: 'ZUSTIMMUNG_99',
      status: 'IN_PRUEFUNG',
      fachbereich: 'Produktion Spritzguss',
      initialen: 'M. T.',
      ausschuss: 'Personalausschuss',
      aufbewahrungMonate: 36,
    },
    {
      aktenzeichen: 'BR-2026-0188',
      typ: 'VERSETZUNG_99',
      titel: 'Versetzung aus der Montage in den Reinraum',
      sachverhalt:
        'Dauerhafte Versetzung mit Wechsel des Schichtsystems vom Zweischicht- in den ' +
        'vollkontinuierlichen Betrieb. Auswirkungen auf Zuschläge und Kinderbetreuung sind zu prüfen.',
      eingangVorTagen: 5,
      vorlage: 'ZUSTIMMUNG_99',
      status: 'AUF_TAGESORDNUNG',
      fachbereich: 'Produktion Montage',
      initialen: 'S. K.',
      ausschuss: 'Personalausschuss',
      aufbewahrungMonate: 36,
    },
    {
      aktenzeichen: 'BR-2026-0189',
      typ: 'KUENDIGUNG_AUSSERORDENTLICH_102',
      titel: 'Anhörung zur außerordentlichen Kündigung',
      sachverhalt:
        'Vorwurf der wiederholten Manipulation von Qualitätsprüfprotokollen im Reinraum. ' +
        'Der Arbeitgeber stützt sich auf zwei Zeugenaussagen und eine Auswertung des Prüfsystems.',
      eingangVorTagen: 1,
      vorlage: 'ANHOERUNG_102_AUSSERORDENTLICH',
      status: 'IN_PRUEFUNG',
      fachbereich: 'Qualitätssicherung',
      initialen: 'R. B.',
      aufbewahrungMonate: 36,
    },
    {
      aktenzeichen: 'BR-2026-0184',
      typ: 'KUENDIGUNG_ORDENTLICH_102',
      titel: 'Anhörung zur ordentlichen betriebsbedingten Kündigung',
      sachverhalt:
        'Wegfall eines Arbeitsplatzes in der Vormontage nach Verlagerung der Linie 3. ' +
        'Sozialauswahl nach Punkteschema der BV 2019-04 vorgelegt.',
      eingangVorTagen: 9,
      vorlage: 'ANHOERUNG_102_ORDENTLICH',
      status: 'BEANTWORTET',
      fachbereich: 'Produktion Montage',
      initialen: 'H. W.',
      aufbewahrungMonate: 36,
    },
    {
      aktenzeichen: 'BR-2026-0190',
      typ: 'EINGRUPPIERUNG_99',
      titel: 'Umgruppierung Werkzeugmechaniker von EG 7 nach EG 8 ERA',
      sachverhalt:
        'Höhergruppierung nach Übernahme von Rüst- und Einfahrtätigkeiten an den Zweikomponenten-Werkzeugen.',
      eingangVorTagen: 3,
      vorlage: 'ZUSTIMMUNG_99',
      status: 'IN_PRUEFUNG',
      fachbereich: 'Werkzeugbau',
      initialen: 'D. P.',
      ausschuss: 'Personalausschuss',
      aufbewahrungMonate: 36,
    },
    {
      aktenzeichen: 'BR-2026-0181',
      typ: 'MITBESTIMMUNG_87',
      titel: 'Einführung eines Manufacturing Execution Systems',
      sachverhalt:
        'Das System erfasst maschinenbezogen Rüstzeiten, Stillstände und Ausschussquoten und ordnet ' +
        'sie über die Anmeldung am Terminal einzelnen Beschäftigten zu. Damit ist es zur Überwachung ' +
        'von Leistung und Verhalten geeignet.',
      eingangVorTagen: 34,
      vorlage: null,
      status: 'IM_AUSSCHUSS',
      fachbereich: 'Prozesstechnik / Konzern-IT',
      ausschuss: 'Ausschuss Digitalisierung und IT-Systeme',
      aufbewahrungMonate: 120,
    },
    {
      aktenzeichen: 'BR-2026-0175',
      typ: 'BETRIEBSAENDERUNG_111',
      titel: 'Verlagerung der Montagelinie 3 an den Konzernstandort Tschechien',
      sachverhalt:
        'Betroffen sind 42 Arbeitsplätze. Der Arbeitgeber hat die Aufnahme von Verhandlungen über ' +
        'Interessenausgleich und Sozialplan angeboten.',
      eingangVorTagen: 61,
      vorlage: null,
      status: 'IM_AUSSCHUSS',
      fachbereich: 'Werkleitung',
      aufbewahrungMonate: 120,
    },
    {
      aktenzeichen: 'BR-2026-0186',
      typ: 'UNTERRICHTUNG_80',
      titel: 'Auskunft über Einsatz von Leiharbeitnehmern im dritten Quartal',
      sachverhalt:
        'Verlangen nach Auskunft über Zahl, Einsatzdauer und Einsatzbereiche der überlassenen ' +
        'Arbeitnehmer sowie Vorlage der Überlassungsverträge in anonymisierter Form.',
      eingangVorTagen: 12,
      vorlage: null,
      status: 'EINGEGANGEN',
      fachbereich: 'Personalabteilung',
      aufbewahrungMonate: 24,
    },
    {
      aktenzeichen: 'BR-2026-0191',
      typ: 'VORLAEUFIGE_MASSNAHME_100',
      titel: 'Vorläufige Versetzung in die Instandhaltung',
      sachverhalt:
        'Der Arbeitgeber beruft sich auf einen kurzfristigen Personalausfall und hält die Maßnahme ' +
        'für dringend erforderlich.',
      eingangVorTagen: 1,
      vorlage: 'VORLAEUFIGE_MASSNAHME_100',
      status: 'IN_PRUEFUNG',
      fachbereich: 'Instandhaltung',
      initialen: 'A. S.',
      aufbewahrungMonate: 36,
    },
  ];

  for (const v of vorgangSaat) {
    const eingang = tageVersetzt(-v.eingangVorTagen);
    const frist = v.vorlage ? berechneNachVorlage(v.vorlage, alsKalendertag(eingang), 'NW') : null;

    const loeschen = new Date(eingang);
    loeschen.setMonth(loeschen.getMonth() + v.aufbewahrungMonate);

    const angelegt = await prisma.vorgang.create({
      data: {
        aktenzeichen: v.aktenzeichen,
        typ: v.typ,
        titel: v.titel,
        sachverhalt: v.sachverhalt,
        gremiumId: gremium.id,
        ausschussId: v.ausschuss ? ausschuesse[v.ausschuss] : null,
        einreicherId: personalKonto?.id ?? null,
        fachbereich: v.fachbereich,
        betroffeneInitialen: v.initialen ?? null,
        eingegangenAm: eingang,
        fristBis: frist?.ablauf ?? null,
        fristTage: frist?.vorlage.einheit === 'WOCHEN' ? frist.vorlage.dauer * 7 : frist?.vorlage.dauer ?? null,
        fristArt: frist ? (frist.vorlage.einheit === 'WOCHEN' ? 'WOCHEN' : 'KALENDERTAGE') : null,
        zustimmungsfiktion: v.vorlage === 'ZUSTIMMUNG_99',
        status: v.status,
        vertraulichkeit: v.initialen ? 'PERSONENBEZOGEN' : 'VERTRAULICH',
        loeschenAb: loeschen,
        antwortText:
          v.status === 'BEANTWORTET'
            ? 'Der Betriebsrat hat der Kündigung widersprochen (§ 102 Abs. 3 Nr. 1 BetrVG). Die ' +
              'Sozialauswahl berücksichtigt die Unterhaltspflichten nicht ausreichend; zudem besteht ' +
              'auf der Linie 5 ein freier vergleichbarer Arbeitsplatz.'
            : null,
        antwortAm: v.status === 'BEANTWORTET' ? tageVersetzt(-v.eingangVorTagen + 5) : null,
      },
    });

    if (frist) {
      await prisma.fristereignis.create({
        data: {
          vorgangId: angelegt.id,
          bezeichnung: frist.vorlage.bezeichnung,
          grundlage: `${frist.vorlage.grundlage} i.V.m. §§ 187 Abs. 1, 188 BGB`,
          startAm: eingang,
          endeAm: frist.ablauf,
          berechnung: frist.herleitung,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Sitzungen
  // -------------------------------------------------------------------------

  console.log('Lege Sitzungen an ...');
  const ordentlicheIds = personen.slice(0, sollGroesse).map((x) => x.id);

  // Zurueckliegende Sitzung mit freigegebener Niederschrift
  const vergangen = tageVersetzt(-21);
  vergangen.setHours(13, 0, 0, 0);

  const sitzungAlt = await prisma.sitzung.create({
    data: {
      gremiumId: gremium.id,
      art: 'ORDENTLICH',
      nummer: '2026/12',
      titel: 'Ordentliche Betriebsratssitzung',
      beginn: vergangen,
      ende: new Date(vergangen.getTime() + 3 * 3_600_000),
      ort: 'Betriebsratsbüro, Gebäude C, Raum 1.14',
      form: 'PRAESENZ',
      status: 'PROTOKOLL_FREIGEGEBEN',
      einladungVersendetAm: tageVersetzt(-28),
      nichtoeffentlichkeitBestaetigt: true,
      leitungId: vorsitzKonto?.id ?? null,
      beschlussfaehig: true,
      anwesendZahl: 12,
      erforderlichZahl: Math.ceil(sollGroesse / 2),
    },
  });

  for (const [i, id] of ordentlicheIds.entries()) {
    await prisma.teilnahme.create({
      data: {
        sitzungId: sitzungAlt.id,
        personId: id,
        rolle: 'ORDENTLICHES_MITGLIED',
        // Ein Mitglied war verhindert; an seiner Stelle nahm ein Ersatzmitglied teil.
        status: i === 11 ? 'VERTRETEN' : 'ANWESEND',
        stimmberechtigt: i !== 11,
        unterschriebenAm: i === 11 ? null : vergangen,
      },
    });
  }
  await prisma.teilnahme.create({
    data: {
      sitzungId: sitzungAlt.id,
      personId: p('Vahle').id,
      rolle: 'ERSATZMITGLIED',
      status: 'ANWESEND',
      stimmberechtigt: true,
      unterschriebenAm: vergangen,
    },
  });
  await prisma.verhinderung.create({
    data: {
      sitzungId: sitzungAlt.id,
      personId: p('Rademacher').id,
      grund: 'SCHICHT',
      gemeldetAm: tageVersetzt(-23),
      ersatzPersonId: p('Vahle').id,
      ersatzGeladenAm: tageVersetzt(-23),
    },
  });

  const topsAlt = [
    {
      nummer: 1,
      titel: 'Feststellung der Beschlussfähigkeit und Genehmigung der Tagesordnung',
      status: 'ZUR_KENNTNIS' as const,
    },
    {
      nummer: 2,
      titel: 'Übertragung von Aufgaben auf den Ausschuss Arbeitszeit und Schicht',
      beschreibung:
        'Beschluss über die Übertragung der Zustimmung zu kurzfristigen Schichtplanabweichungen ' +
        'zur selbständigen Erledigung.',
      status: 'BESCHLOSSEN' as const,
      beschluss: {
        aktenzeichen: 'BR-B-2026-041',
        wortlaut:
          'Der Betriebsrat überträgt dem Ausschuss Arbeitszeit und Schicht gemäß § 28 Abs. 1 BetrVG die ' +
          'Aufgabe, über die Zustimmung zu kurzfristigen Abweichungen vom Schichtplan sowie über Mehrarbeit ' +
          'bis zu 40 Stunden je Woche und Kostenstelle zur selbständigen Erledigung zu entscheiden. Die ' +
          'Übertragung ist schriftlich niederzulegen und jederzeit widerruflich.',
        rechtsgrundlage: '§ 28 Abs. 1 S. 3 BetrVG i.V.m. § 27 Abs. 2 BetrVG',
        mehrheit: 'MEHRHEIT_DER_MITGLIEDER' as const,
        ja: 11,
        nein: 1,
        enthaltung: 1,
      },
    },
    {
      nummer: 3,
      titel: 'Anhörung zur ordentlichen betriebsbedingten Kündigung (BR-2026-0184)',
      status: 'BESCHLOSSEN' as const,
      beschluss: {
        aktenzeichen: 'BR-B-2026-042',
        wortlaut:
          'Der Betriebsrat widerspricht der beabsichtigten ordentlichen Kündigung nach § 102 Abs. 3 Nr. 1 ' +
          'BetrVG. Die Sozialauswahl berücksichtigt die Unterhaltspflichten nicht ausreichend. Ferner ist ' +
          'eine Weiterbeschäftigung auf einem freien vergleichbaren Arbeitsplatz auf der Linie 5 möglich ' +
          '(§ 102 Abs. 3 Nr. 3 BetrVG). Der Vorsitzende wird beauftragt, den Widerspruch schriftlich ' +
          'innerhalb der Wochenfrist zuzustellen.',
        rechtsgrundlage: '§ 102 Abs. 3 Nr. 1 und 3 BetrVG',
        mehrheit: 'EINFACHE_MEHRHEIT_ANWESENDE' as const,
        ja: 10,
        nein: 2,
        enthaltung: 1,
      },
    },
    {
      nummer: 4,
      titel: 'Sachstand Verlagerung Montagelinie 3',
      beschreibung: 'Bericht aus den Verhandlungen zu Interessenausgleich und Sozialplan.',
      status: 'VERTAGT' as const,
      vertraulichkeit: 'VERTRAULICH' as const,
    },
    {
      nummer: 5,
      titel: 'Schulungsanmeldungen nach § 37 Abs. 6 BetrVG',
      status: 'BESCHLOSSEN' as const,
      beschluss: {
        aktenzeichen: 'BR-B-2026-043',
        wortlaut:
          'Der Betriebsrat beschließt die Teilnahme von Frau Novak und Herrn Petzold an der Schulung ' +
          '„Mitbestimmung bei technischen Einrichtungen – § 87 Abs. 1 Nr. 6 BetrVG" vom 14. bis ' +
          '16.09.2026. Die Kenntnisse sind für die laufende Verhandlung zum MES erforderlich. Der ' +
          'Arbeitgeber ist nach § 37 Abs. 6 S. 4 BetrVG unter Angabe der betrieblichen Notwendigkeiten ' +
          'zu unterrichten.',
        rechtsgrundlage: '§ 37 Abs. 6 BetrVG',
        mehrheit: 'EINFACHE_MEHRHEIT_ANWESENDE' as const,
        ja: 13,
        nein: 0,
        enthaltung: 0,
      },
    },
  ];

  for (const t of topsAlt) {
    const top = await prisma.tagesordnungspunkt.create({
      data: {
        sitzungId: sitzungAlt.id,
        nummer: t.nummer,
        titel: t.titel,
        beschreibung: 'beschreibung' in t ? t.beschreibung : null,
        status: t.status,
        vertraulichkeit: 'vertraulichkeit' in t ? t.vertraulichkeit! : 'INTERN_BR',
      },
    });
    if ('beschluss' in t && t.beschluss) {
      await prisma.beschluss.create({
        data: {
          topId: top.id,
          aktenzeichen: t.beschluss.aktenzeichen,
          wortlaut: t.beschluss.wortlaut,
          rechtsgrundlage: t.beschluss.rechtsgrundlage,
          art: 'OFFEN',
          jaStimmen: t.beschluss.ja,
          neinStimmen: t.beschluss.nein,
          enthaltungen: t.beschluss.enthaltung,
          anwesendStimmberechtigt: 13,
          mehrheitserfordernis: t.beschluss.mehrheit,
          ergebnis: 'ANGENOMMEN',
          gefasstAm: vergangen,
        },
      });
    }
  }

  await prisma.niederschrift.create({
    data: {
      sitzungId: sitzungAlt.id,
      inhalt:
        'Die Vorsitzende eröffnet die Sitzung um 13:00 Uhr und stellt fest, dass form- und fristgerecht ' +
        'unter Mitteilung der Tagesordnung geladen wurde (§ 29 Abs. 2 BetrVG). Von 13 Mitgliedern nehmen ' +
        '12 ordentliche Mitglieder sowie das nachgerückte Ersatzmitglied Herr Vahle teil. Herr Rademacher ' +
        'ist wegen Nachtschicht verhindert; das Ersatzmitglied wurde nach § 25 Abs. 1 BetrVG geladen. Der ' +
        'Betriebsrat ist mit 13 stimmberechtigten Mitgliedern beschlussfähig (§ 33 Abs. 2 BetrVG).\n\n' +
        'Die Tagesordnung wird ohne Änderung genehmigt. Zu den einzelnen Punkten wird auf die gefassten ' +
        'Beschlüsse verwiesen, deren Wortlaut dieser Niederschrift als Anlage beigefügt ist ' +
        '(§ 34 Abs. 1 S. 2 BetrVG).\n\n' +
        'TOP 4 wird auf die nächste Sitzung vertagt, weil die vom Arbeitgeber zugesagten Unterlagen zur ' +
        'Kostenrechnung noch nicht vorliegen.\n\n' +
        'Die Sitzung endet um 16:05 Uhr.',
      erstelltVonPersonId: p('Novak').id,
      unterschriftVorsitzPersonId: p('Kowalski').id,
      unterschriftVorsitzAm: tageVersetzt(-19),
      unterschriftWeiteresPersonId: p('Novak').id,
      unterschriftWeiteresAm: tageVersetzt(-19),
      einspruchsfristBis: tageVersetzt(-5),
      freigegebenAm: tageVersetzt(-5),
    },
  });

  // Bevorstehende Sitzung
  const kommend = tageVersetzt(6);
  kommend.setHours(13, 0, 0, 0);

  const sitzungNeu = await prisma.sitzung.create({
    data: {
      gremiumId: gremium.id,
      art: 'ORDENTLICH',
      nummer: '2026/13',
      titel: 'Ordentliche Betriebsratssitzung',
      beginn: kommend,
      ende: new Date(kommend.getTime() + 3 * 3_600_000),
      ort: 'Betriebsratsbüro, Gebäude C, Raum 1.14',
      form: 'HYBRID',
      status: 'EINGELADEN',
      einladungVersendetAm: tageVersetzt(-1),
      nichtoeffentlichkeitBestaetigt: true,
      leitungId: vorsitzKonto?.id ?? null,
      erforderlichZahl: Math.ceil(sollGroesse / 2),
    },
  });

  const topsNeu = [
    { nummer: 1, titel: 'Feststellung der Beschlussfähigkeit und Genehmigung der Tagesordnung' },
    { nummer: 2, titel: 'Einstellung Maschinenbediener Spritzguss (BR-2026-0187)', vertraulichkeit: 'PERSONENBEZOGEN' as const },
    { nummer: 3, titel: 'Versetzung Montage in Reinraum (BR-2026-0188)', vertraulichkeit: 'PERSONENBEZOGEN' as const },
    { nummer: 4, titel: 'Umgruppierung Werkzeugmechaniker (BR-2026-0190)', vertraulichkeit: 'PERSONENBEZOGEN' as const },
    { nummer: 5, titel: 'Zwischenbericht Ausschuss Digitalisierung zum MES' },
    { nummer: 6, titel: 'Vorbereitung der Betriebsversammlung im dritten Quartal' },
    { nummer: 7, titel: 'Sachstand Bildung des Aufsichtsrats nach DrittelbG' },
    { nummer: 8, titel: 'Verschiedenes' },
  ];
  for (const t of topsNeu) {
    await prisma.tagesordnungspunkt.create({
      data: {
        sitzungId: sitzungNeu.id,
        nummer: t.nummer,
        titel: t.titel,
        status: 'OFFEN',
        vertraulichkeit: 'vertraulichkeit' in t ? t.vertraulichkeit! : 'INTERN_BR',
      },
    });
  }

  // Betriebsversammlung und Ausschusssitzungen
  await prisma.sitzung.create({
    data: {
      gremiumId: gremium.id,
      art: 'BETRIEBSVERSAMMLUNG',
      nummer: '2026/Q3',
      titel: 'Betriebsversammlung – Teilversammlung Frühschicht',
      beginn: tageVersetzt(27),
      ort: 'Werkskantine',
      form: 'PRAESENZ',
      status: 'GEPLANT',
      // § 44 Abs. 1 BetrVG erlaubt Teilversammlungen, wenn die Eigenart des
      // Betriebs eine gemeinsame Versammlung nicht zulaesst – im
      // vollkontinuierlichen Betrieb der Regelfall.
    },
  });
  await prisma.sitzung.create({
    data: {
      ausschussId: ausschuesse['Ausschuss Digitalisierung und IT-Systeme'],
      art: 'AUSSCHUSS',
      nummer: '2026/DIG-07',
      titel: 'Ausschusssitzung MES – Auswertung des Rollenkonzepts',
      beginn: tageVersetzt(3),
      ort: 'Besprechungsraum B 2.03',
      form: 'PRAESENZ',
      status: 'EINGELADEN',
      einladungVersendetAm: tageVersetzt(-2),
    },
  });
  await prisma.sitzung.create({
    data: {
      ausschussId: ausschuesse['Arbeitsschutzausschuss (ASA)'],
      art: 'ASA',
      nummer: '2026/ASA-03',
      titel: 'Arbeitsschutzausschuss – 3. Quartalssitzung',
      beginn: tageVersetzt(13),
      ort: 'Besprechungsraum A 0.05',
      form: 'PRAESENZ',
      status: 'GEPLANT',
    },
  });
  await prisma.sitzung.create({
    data: {
      gremiumId: gremium.id,
      art: 'MONATSGESPRAECH',
      nummer: '2026/MG-07',
      titel: 'Monatsgespräch mit der Werkleitung',
      beginn: tageVersetzt(9),
      ort: 'Werkleitung, Gebäude A',
      form: 'PRAESENZ',
      status: 'GEPLANT',
    },
  });

  // -------------------------------------------------------------------------
  // Aufgaben
  // -------------------------------------------------------------------------

  console.log('Lege Aufgaben an ...');
  const aufgaben = [
    {
      titel: 'Widerspruch zur Kündigung BR-2026-0184 zustellen',
      beschreibung: 'Schriftform wahren, Zugang beim Arbeitgeber dokumentieren.',
      zustaendig: 'Kowalski',
      faellig: -6,
      status: 'ERLEDIGT' as const,
      prioritaet: 'HOCH' as const,
    },
    {
      titel: 'Vollständigkeit der Unterrichtung zu BR-2026-0187 prüfen',
      beschreibung:
        'Fehlen Angaben nach § 99 Abs. 1 BetrVG, ist dies dem Arbeitgeber unverzüglich mitzuteilen; ' +
        'die Wochenfrist beginnt dann nicht zu laufen.',
      zustaendig: 'Wolters',
      faellig: 1,
      status: 'IN_ARBEIT' as const,
      prioritaet: 'KRITISCH' as const,
    },
    {
      titel: 'Rollen- und Berechtigungskonzept des MES anfordern',
      zustaendig: 'Demirci',
      faellig: 4,
      status: 'OFFEN' as const,
      prioritaet: 'HOCH' as const,
    },
    {
      titel: 'Teilversammlungen für alle vier Schichtgruppen terminieren',
      beschreibung:
        'Nach § 43 Abs. 1 BetrVG ist je Kalendervierteljahr eine Betriebsversammlung durchzuführen. ' +
        'Im vollkontinuierlichen Betrieb sind dafür Teilversammlungen nach § 44 Abs. 1 BetrVG anzusetzen.',
      zustaendig: 'Osterhues',
      faellig: 10,
      status: 'OFFEN' as const,
      prioritaet: 'NORMAL' as const,
    },
    {
      titel: 'Sachverständigen für die MES-Verhandlung auswählen',
      beschreibung: 'Hinzuziehung nach § 80 Abs. 3 BetrVG erfordert eine nähere Vereinbarung mit dem Arbeitgeber.',
      zustaendig: 'Petzold',
      faellig: 18,
      status: 'OFFEN' as const,
      prioritaet: 'NORMAL' as const,
    },
    {
      titel: 'Zeitplan zur Aufsichtsratswahl mit der Werkleitung abstimmen',
      zustaendig: 'Kowalski',
      faellig: 21,
      status: 'IN_ARBEIT' as const,
      prioritaet: 'HOCH' as const,
    },
    {
      titel: 'Neuverhandlung der BV Videoüberwachung vorbereiten',
      beschreibung: 'Die gekündigte Vereinbarung wirkt nach § 77 Abs. 6 BetrVG nach.',
      zustaendig: 'Brenner',
      faellig: 30,
      status: 'OFFEN' as const,
      prioritaet: 'NORMAL' as const,
    },
    {
      titel: 'Gefährdungsbeurteilung psychische Belastung Nachtschicht einfordern',
      zustaendig: 'Sillmann',
      faellig: 24,
      status: 'OFFEN' as const,
      prioritaet: 'NORMAL' as const,
    },
  ];

  for (const a of aufgaben) {
    await prisma.aufgabe.create({
      data: {
        titel: a.titel,
        beschreibung: 'beschreibung' in a ? a.beschreibung : null,
        status: a.status,
        prioritaet: a.prioritaet,
        faelligAm: tageVersetzt(a.faellig),
        erledigtAm: a.status === 'ERLEDIGT' ? tageVersetzt(a.faellig) : null,
        zustaendigId: p(a.zustaendig).id,
        erstellerId: vorsitzKonto?.id ?? null,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Schulungen
  // -------------------------------------------------------------------------

  await prisma.schulung.createMany({
    data: [
      {
        personId: p('Novak').id,
        amtsperiodeId: amtsperiode.id,
        titel: 'Mitbestimmung bei technischen Einrichtungen – § 87 Abs. 1 Nr. 6 BetrVG',
        anbieter: 'Bildungswerk der Gewerkschaft',
        ort: 'Düsseldorf',
        beginn: tageVersetzt(45),
        ende: tageVersetzt(47),
        tage: 3,
        grundlage: 'ERFORDERLICH_37_6',
        status: 'AG_INFORMIERT',
        kostenEuro: 1290,
        agMitgeteiltAm: tageVersetzt(-18),
      },
      {
        personId: p('Petzold').id,
        amtsperiodeId: amtsperiode.id,
        titel: 'Mitbestimmung bei technischen Einrichtungen – § 87 Abs. 1 Nr. 6 BetrVG',
        anbieter: 'Bildungswerk der Gewerkschaft',
        ort: 'Düsseldorf',
        beginn: tageVersetzt(45),
        ende: tageVersetzt(47),
        tage: 3,
        grundlage: 'ERFORDERLICH_37_6',
        status: 'AG_INFORMIERT',
        kostenEuro: 1290,
        agMitgeteiltAm: tageVersetzt(-18),
      },
      {
        personId: p('Sillmann').id,
        amtsperiodeId: amtsperiode.id,
        titel: 'Betriebsverfassungsrecht Teil 1 (Grundlagen)',
        anbieter: 'Bildungswerk der Gewerkschaft',
        ort: 'Sprockhövel',
        beginn: tageVersetzt(-70),
        ende: tageVersetzt(-66),
        tage: 5,
        grundlage: 'ERFORDERLICH_37_6',
        status: 'DURCHGEFUEHRT',
        kostenEuro: 1850,
      },
      {
        personId: p('Lohmann').id,
        amtsperiodeId: amtsperiode.id,
        titel: 'Arbeitszeitgestaltung im Schichtbetrieb',
        anbieter: 'Institut für Arbeitswissenschaft',
        ort: 'Dortmund',
        beginn: tageVersetzt(60),
        ende: tageVersetzt(62),
        tage: 3,
        grundlage: 'GEEIGNET_37_7',
        status: 'GEPLANT',
        kostenEuro: 990,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Sprechstunden – auf alle Schichten verteilt
  // -------------------------------------------------------------------------

  await prisma.sprechstunde.createMany({
    data: [
      { personId: p('Kowalski').id, beginn: tageVersetzt(4), ende: tageVersetzt(4), ort: 'BR-Büro C 1.14', schichtbezug: 'Frühschicht' },
      { personId: p('Osterhues').id, beginn: tageVersetzt(5), ende: tageVersetzt(5), ort: 'BR-Büro C 1.14', schichtbezug: 'Spätschicht' },
      { personId: p('Demirci').id, beginn: tageVersetzt(7), ende: tageVersetzt(7), ort: 'Pausenraum Halle 2', schichtbezug: 'Nachtschicht' },
      { personId: p('Kowalski').id, beginn: tageVersetzt(11), ende: tageVersetzt(11), ort: 'BR-Büro C 1.14', schichtbezug: 'Frühschicht' },
    ],
  });

  // -------------------------------------------------------------------------
  // Aufsichtsrat nach DrittelbG
  // -------------------------------------------------------------------------

  console.log('Lege Aufsichtsratsprojekt an ...');
  await prisma.aufsichtsratProjekt.create({
    data: {
      bezeichnung: 'Bildung des Aufsichtsrats mit Drittelbeteiligung',
      rechtsgrundlage: 'DrittelbG',
      sitzeGesamt: 6,
      sitzeArbeitnehmer: 2,
      status: 'VORBEREITUNG',
      zieldatum: tageVersetzt(210),
      bemerkung:
        'Das Unternehmen beschäftigt in der Regel mehr als 500 Arbeitnehmer; nach § 1 Abs. 1 Nr. 1 ' +
        'DrittelbG ist ein Aufsichtsrat zu bilden, der zu einem Drittel aus Arbeitnehmervertretern ' +
        'besteht. Die gesellschaftsrechtliche Umsetzung (Satzungsänderung, Statusverfahren nach ' +
        '§§ 97 ff. AktG) obliegt dem Unternehmen. Der Betriebsrat begleitet den Zeitplan und ' +
        'organisiert die Wahl der Arbeitnehmervertreter.',
      meilensteine: {
        create: [
          {
            bezeichnung: 'Rechtsform und Schwellenwert durch das Unternehmen bestätigen lassen',
            rechtsgrundlage: '§ 1 Abs. 1 Nr. 1 DrittelbG',
            faelligAm: tageVersetzt(14),
            reihenfolge: 1,
          },
          {
            bezeichnung: 'Zurechnung von Konzernunternehmen prüfen',
            rechtsgrundlage: '§ 2 Abs. 2 DrittelbG',
            faelligAm: tageVersetzt(21),
            reihenfolge: 2,
          },
          {
            bezeichnung: 'Größe des Aufsichtsrats und Sitzverteilung klären',
            rechtsgrundlage: '§ 4 Abs. 1 DrittelbG, § 95 AktG',
            faelligAm: tageVersetzt(35),
            reihenfolge: 3,
          },
          {
            bezeichnung: 'Betriebsratsbeschluss zur Einsetzung des Wahlvorstands fassen',
            rechtsgrundlage: '§ 5 DrittelbG i.V.m. der Wahlordnung zum DrittelbG',
            faelligAm: tageVersetzt(56),
            reihenfolge: 4,
          },
          {
            bezeichnung: 'Wahlausschreiben erlassen und Fristenplan veröffentlichen',
            rechtsgrundlage: 'Wahlordnung zum DrittelbG',
            faelligAm: tageVersetzt(84),
            reihenfolge: 5,
          },
          {
            bezeichnung: 'Wahlvorschläge einholen und prüfen',
            rechtsgrundlage: '§ 6 DrittelbG',
            faelligAm: tageVersetzt(119),
            reihenfolge: 6,
          },
          {
            bezeichnung: 'Wahl in allen vier Schichtgruppen durchführen',
            rechtsgrundlage: '§ 5 Abs. 1 DrittelbG',
            faelligAm: tageVersetzt(168),
            reihenfolge: 7,
          },
          {
            bezeichnung: 'Konstituierende Sitzung des Aufsichtsrats begleiten',
            faelligAm: tageVersetzt(210),
            reihenfolge: 8,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // Datenschutz: Verarbeitungsverzeichnis und Loeschregeln
  // -------------------------------------------------------------------------

  console.log('Lege Datenschutzunterlagen an ...');
  await prisma.verarbeitungstaetigkeit.createMany({
    data: [
      {
        bezeichnung: 'Personelle Einzelmaßnahmen (§§ 99, 100 BetrVG)',
        zweck:
          'Prüfung der Zustimmung zu Einstellungen, Versetzungen sowie Ein- und Umgruppierungen und ' +
          'Dokumentation der Beschlussfassung.',
        rechtsgrundlage:
          'Art. 6 Abs. 1 lit. c DSGVO i.V.m. § 99 BetrVG; für besondere Kategorien Art. 9 Abs. 2 lit. b ' +
          'DSGVO i.V.m. § 26 Abs. 3 BDSG.',
        betroffeneKategorien: 'Bewerberinnen und Bewerber, Beschäftigte, Leiharbeitnehmer',
        datenkategorien:
          'Name, Personalnummer, Abteilung, Eingruppierung, Qualifikation, Einsatzort, Schichtzuordnung, ' +
          'bei Schwerbehinderung der Status (besondere Kategorie).',
        empfaenger: 'Betriebsratsgremium, zuständiger Ausschuss, Schwerbehindertenvertretung im Rahmen ihrer Aufgaben',
        drittlandtransfer: false,
        loeschfrist:
          'Drei Jahre nach Abschluss des Vorgangs (Regelverjährung §§ 195, 199 BGB); bei laufendem ' +
          'gerichtlichem Verfahren bis zu dessen rechtskräftigem Abschluss.',
        tom: 'Rollenbasierte Zugriffskontrolle, Verschlüsselung der Dokumentenablage, revisionssicheres Protokoll.',
        dsfaErforderlich: false,
      },
      {
        bezeichnung: 'Anhörungen zu Kündigungen (§§ 102, 103 BetrVG)',
        zweck: 'Prüfung der beabsichtigten Kündigung, Beschlussfassung über Bedenken oder Widerspruch.',
        rechtsgrundlage: 'Art. 6 Abs. 1 lit. c DSGVO i.V.m. § 102 BetrVG',
        betroffeneKategorien: 'Beschäftigte',
        datenkategorien:
          'Name, Personalnummer, Sozialdaten (Lebensalter, Betriebszugehörigkeit, Unterhaltspflichten, ' +
          'Schwerbehinderung), Kündigungsgründe, gegebenenfalls Angaben zu Gesundheit oder Verhalten.',
        empfaenger: 'Betriebsratsgremium, Personalausschuss',
        drittlandtransfer: false,
        loeschfrist:
          'Drei Jahre nach Abschluss des Vorgangs; bei Kündigungsschutzklage bis zum rechtskräftigen Abschluss.',
        tom: 'Zugriff auf Gremium und Personalausschuss beschränkt, Vertraulichkeitsstufe PERSONENBEZOGEN.',
        dsfaErforderlich: true,
        dsfaVermerk:
          'Wegen der Verarbeitung von Gesundheits- und Sozialdaten in einem für die Betroffenen ' +
          'einschneidenden Verfahren wurde eine Datenschutz-Folgenabschätzung nach Art. 35 DSGVO ' +
          'durchgeführt. Ergebnis: zulässig bei strikter Zweckbindung und enger Zugriffsbeschränkung.',
      },
      {
        bezeichnung: 'Sitzungsverwaltung und Niederschriften',
        zweck: 'Ladung, Anwesenheitsdokumentation, Beschlussfassung und Niederschrift nach §§ 29 bis 34 BetrVG.',
        rechtsgrundlage: 'Art. 6 Abs. 1 lit. c DSGVO i.V.m. §§ 29 bis 34 BetrVG',
        betroffeneKategorien: 'Mitglieder des Betriebsrats, Ersatzmitglieder, Gäste',
        datenkategorien: 'Name, Funktion, Anwesenheit, Abstimmungsverhalten bei offener Abstimmung, Verhinderungsgrund',
        empfaenger: 'Betriebsratsgremium',
        drittlandtransfer: false,
        loeschfrist:
          'Niederschriften werden für die Dauer der Amtszeit und weitere vier Jahre aufbewahrt, damit ' +
          'Beschlüsse in Streitfällen nachweisbar bleiben. Verhinderungsgründe werden nach Ablauf der ' +
          'Amtszeit gelöscht.',
        tom: 'Zugriff nur für Gremiumsmitglieder, Freigabe der Niederschrift mit Integritätshash.',
        dsfaErforderlich: false,
      },
      {
        bezeichnung: 'Sprechstunden und Beschwerden (§§ 39, 84, 85 BetrVG)',
        zweck: 'Entgegennahme und Bearbeitung von Anliegen und Beschwerden einzelner Beschäftigter.',
        rechtsgrundlage: 'Art. 6 Abs. 1 lit. c DSGVO i.V.m. §§ 84, 85 BetrVG',
        betroffeneKategorien: 'Beschäftigte',
        datenkategorien: 'Name, Anliegen, gegebenenfalls Gesundheits- oder Konfliktangaben',
        empfaenger: 'Beauftragte Mitglieder des Betriebsrats',
        drittlandtransfer: false,
        loeschfrist: 'Ein Jahr nach Erledigung, sofern kein weiterer Vorgang anhängig ist.',
        tom: 'Erfassung nur im erforderlichen Umfang, keine Freitextspeicherung von Gesundheitsdaten ohne Anlass.',
        dsfaErforderlich: false,
      },
      {
        bezeichnung: 'Protokollierung der Systemnutzung',
        zweck:
          'Nachweis der Rechtmäßigkeit der Verarbeitung und Schutz der Vertraulichkeit der ' +
          'Betriebsratsunterlagen gegenüber unbefugtem Zugriff.',
        rechtsgrundlage: 'Art. 6 Abs. 1 lit. c DSGVO i.V.m. Art. 5 Abs. 2, Art. 32 DSGVO',
        betroffeneKategorien: 'Benutzerinnen und Benutzer der Anwendung',
        datenkategorien: 'Benutzerkennung, Zeitpunkt, Aktion, betroffener Datensatz, pseudonymisierte IP-Adresse',
        empfaenger: 'Betriebsratsvorsitz, Datenschutzbeauftragte:r, Revision',
        drittlandtransfer: false,
        loeschfrist: 'Ein Jahr; Einträge zu Beschlüssen und Freigaben werden mit dem Fachdatensatz aufbewahrt.',
        tom: 'Hash-Kette gegen nachträgliche Veränderung, kein Zugriff für den IT-Betrieb.',
        dsfaErforderlich: false,
      },
    ],
  });

  await prisma.loeschregel.createMany({
    data: [
      {
        entitaet: 'Vorgang:PERSONELL',
        bezeichnung: 'Personelle Einzelmaßnahmen und Anhörungen',
        aufbewahrungMonate: 36,
        begruendung:
          'Orientiert an der Regelverjährung nach §§ 195, 199 BGB. Läuft ein arbeitsgerichtliches ' +
          'Verfahren, ist die Löschung bis zum rechtskräftigen Abschluss auszusetzen.',
      },
      {
        entitaet: 'Vorgang:KOLLEKTIV',
        bezeichnung: 'Kollektive Angelegenheiten und Betriebsänderungen',
        aufbewahrungMonate: 120,
        begruendung:
          'Kollektivvorgänge enthalten regelmäßig keine oder nur wenige personenbezogene Daten und ' +
          'sind für die Auslegung späterer Vereinbarungen von Bedeutung.',
      },
      {
        entitaet: 'Niederschrift',
        bezeichnung: 'Sitzungsniederschriften',
        aufbewahrungMonate: 96,
        begruendung:
          'Amtszeit von vier Jahren zuzüglich vier Jahren, damit Beschlüsse auch nach einem ' +
          'Gremienwechsel nachweisbar bleiben.',
      },
      {
        entitaet: 'AuditEintrag',
        bezeichnung: 'Protokolleinträge',
        aufbewahrungMonate: 12,
        begruendung: 'Kurze Frist nach dem Grundsatz der Speicherbegrenzung, Art. 5 Abs. 1 lit. e DSGVO.',
      },
      {
        entitaet: 'Sprechstunde',
        bezeichnung: 'Aufzeichnungen aus Sprechstunden',
        aufbewahrungMonate: 12,
        begruendung: 'Anliegen sind nach Erledigung nicht mehr erforderlich.',
      },
    ],
  });

  await prisma.betroffenenanfrage.create({
    data: {
      typ: 'AUSKUNFT_15',
      antragstellerName: 'H. Weber',
      personalnummer: '10412',
      eingegangenAm: tageVersetzt(-6),
      fristBis: berechneNachVorlage('AUSKUNFT_DSGVO', alsKalendertag(tageVersetzt(-6)), 'NW').ablauf,
      status: 'IN_BEARBEITUNG',
      beschreibung:
        'Auskunft darüber, welche Daten der Betriebsrat im Zusammenhang mit der Anhörung zur ' +
        'betriebsbedingten Kündigung verarbeitet hat.',
      dsbEinbezogen: true,
    },
  });

  await prisma.einstellung.createMany({
    data: [
      { schluessel: 'betrieb.aktiv', wert: betrieb.id, beschreibung: 'Betrieb, der in der Oberfläche angezeigt wird.' },
      { schluessel: 'gremium.aktiv', wert: gremium.id, beschreibung: 'Vorbelegtes Gremium.' },
      { schluessel: 'ladungsfrist.tage', wert: '7', beschreibung: 'Ladungsfrist nach der Geschäftsordnung (§ 29 Abs. 2 BetrVG).' },
      {
        schluessel: 'einspruchsfrist.niederschrift.wochen',
        wert: '2',
        beschreibung: 'Frist für Einwendungen gegen die Niederschrift nach der Geschäftsordnung.',
      },
    ],
  });

  console.log('\nFertig.');
  console.log(`  Betrieb:            ${betrieb.name}, ${betrieb.anzahlBeschaeftigte} Beschäftigte`);
  console.log(`  Betriebsrat:        ${sollGroesse} Mitglieder (§ 9 BetrVG), ${BEWERBER.length - sollGroesse} Ersatzmitglieder`);
  console.log(`  Betriebsausschuss:  ${ba.gesamt} Personen (§ 27 BetrVG)`);
  console.log(`  Freistellungen:     ${freizustellen.anzahl} (§ 38 BetrVG)`);
  console.log(`  Ausschüsse:         ${Object.keys(ausschuesse).length}`);
  console.log(`  Benutzerkonten:     ${konten.length}, Passwort "Start!Passwort2026"`);
}

main()
  .catch((fehler) => {
    console.error(fehler);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
