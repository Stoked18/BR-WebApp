/**
 * Automatische Rechtspruefung.
 *
 * Sammelt die Punkte, an denen der Datenbestand von den Vorgaben des BetrVG
 * abweicht. Bewusst als reine Funktion ueber einem Datenschnappschuss gebaut,
 * damit sie testbar bleibt und nicht von Datenbankzugriffen abhaengt.
 *
 * Die Pruefung ersetzt keine Rechtsberatung. Sie zeigt, wo hinzusehen ist.
 */

import {
  aufsichtsratLage,
  betriebsausschuss,
  erforderlicheTeilnehmer,
  freistellungen,
  groesseBetriebsrat,
  wirtschaftsausschuss,
} from './betrvg';

export type Schwere = 'KRITISCH' | 'HINWEIS' | 'ERFUELLT';

export type Befund = {
  schluessel: string;
  bereich: string;
  norm: string;
  schwere: Schwere;
  titel: string;
  text: string;
  empfehlung?: string;
};

export type Pruefdaten = {
  wahlberechtigte: number;
  beschaeftigte: number;
  gremiumsgroesse: number;
  besetzteSitze: number;
  ersatzmitglieder: number;
  hatVorsitz: boolean;
  hatStellvertretung: boolean;
  hatBetriebsausschuss: boolean;
  betriebsausschussGroesse: number;
  hatWirtschaftsausschuss: boolean;
  freistellungenErfasst: number;
  ausschuesseMitUebertragung: number;
  geschaeftsordnungVorhanden: boolean;
  videoteilnahmeGeregelt: boolean;
  letzteBetriebsversammlung: Date | null;
  letztesMonatsgespraech: Date | null;
  letzteAsaSitzung: Date | null;
  sitzungenOhneNiederschrift: number;
  niederschriftenOhneZweiteUnterschrift: number;
  vorgaengeFristVerstrichen: number;
  bvOhneTarifpruefung: number;
  vvtEintraege: number;
  loeschregeln: number;
  vorgaengeUeberAufbewahrung: number;
  aufsichtsratProjektVorhanden: boolean;
  jetzt?: Date;
};

function monateHer(bezug: Date | null, jetzt: Date): number | null {
  if (!bezug) return null;
  return (jetzt.getTime() - bezug.getTime()) / (30.44 * 86_400_000);
}

export function pruefe(d: Pruefdaten): Befund[] {
  const jetzt = d.jetzt ?? new Date();
  const befunde: Befund[] = [];

  const melde = (b: Befund) => befunde.push(b);

  // --- Zusammensetzung ------------------------------------------------------

  const soll = groesseBetriebsrat(d.wahlberechtigte);
  melde({
    schluessel: 'groesse',
    bereich: 'Zusammensetzung',
    norm: '§ 9 BetrVG',
    schwere: soll === d.gremiumsgroesse ? 'ERFUELLT' : 'HINWEIS',
    titel: 'Größe des Betriebsrats',
    text:
      soll === d.gremiumsgroesse
        ? `Bei ${d.wahlberechtigte} wahlberechtigten Arbeitnehmern sieht § 9 BetrVG ${soll} Mitglieder vor; das Gremium ist entsprechend besetzt.`
        : `Bei ${d.wahlberechtigte} wahlberechtigten Arbeitnehmern sieht § 9 BetrVG ${soll} Mitglieder vor, erfasst sind ${d.gremiumsgroesse}.`,
    empfehlung:
      soll === d.gremiumsgroesse
        ? undefined
        : 'Maßgeblich ist die Zahl am Tag des Wahlausschreibens. Die Stammdaten sind auf diesen Stichtag zu prüfen; eine Neuwahl kommt nur unter den Voraussetzungen des § 13 Abs. 2 BetrVG in Betracht.',
  });

  if (d.besetzteSitze < d.gremiumsgroesse) {
    melde({
      schluessel: 'unterbesetzung',
      bereich: 'Zusammensetzung',
      norm: '§ 13 Abs. 2 Nr. 2 BetrVG',
      schwere: 'KRITISCH',
      titel: 'Gremium unterbesetzt',
      text: `Es sind ${d.besetzteSitze} von ${d.gremiumsgroesse} Sitzen besetzt.`,
      empfehlung:
        'Sinkt die Zahl der Mitglieder unter die vorgeschriebene Zahl und stehen keine Ersatzmitglieder mehr zur Verfügung, ist der Betriebsrat neu zu wählen.',
    });
  }

  if (d.ersatzmitglieder === 0) {
    melde({
      schluessel: 'ersatzmitglieder',
      bereich: 'Zusammensetzung',
      norm: '§ 25 BetrVG',
      schwere: 'HINWEIS',
      titel: 'Keine Ersatzmitglieder verfügbar',
      text: 'Bei zeitweiliger Verhinderung eines Mitglieds kann niemand nachrücken.',
      empfehlung: 'Die Beschlussfähigkeit ist bei jeder Sitzung gesondert zu prüfen.',
    });
  }

  melde({
    schluessel: 'vorsitz',
    bereich: 'Zusammensetzung',
    norm: '§ 26 Abs. 1 BetrVG',
    schwere: d.hatVorsitz && d.hatStellvertretung ? 'ERFUELLT' : 'KRITISCH',
    titel: 'Vorsitz und Stellvertretung',
    text:
      d.hatVorsitz && d.hatStellvertretung
        ? 'Vorsitz und Stellvertretung sind gewählt.'
        : `Es fehlt ${!d.hatVorsitz ? 'der Vorsitz' : 'die Stellvertretung'}.`,
    empfehlung:
      d.hatVorsitz && d.hatStellvertretung
        ? undefined
        : 'Der Betriebsrat wählt aus seiner Mitte den Vorsitzenden und dessen Stellvertreter. Ohne Vorsitz fehlt die Vertretungsbefugnis nach § 26 Abs. 2 BetrVG; Erklärungen des Gremiums können unwirksam sein.',
  });

  // --- Ausschuesse ----------------------------------------------------------

  const ba = betriebsausschuss(d.gremiumsgroesse);
  if (ba.erforderlich) {
    melde({
      schluessel: 'betriebsausschuss',
      bereich: 'Ausschüsse',
      norm: '§ 27 Abs. 1 BetrVG',
      schwere: d.hatBetriebsausschuss ? 'ERFUELLT' : 'KRITISCH',
      titel: 'Betriebsausschuss',
      text: d.hatBetriebsausschuss
        ? `Der Betriebsausschuss ist gebildet (${d.betriebsausschussGroesse} von ${ba.gesamt} Sitzen besetzt).`
        : ba.grundlage,
      empfehlung: d.hatBetriebsausschuss
        ? d.betriebsausschussGroesse !== ba.gesamt
          ? `Vorgesehen sind ${ba.gesamt} Mitglieder (Vorsitz, Stellvertretung und ${ba.weitereMitglieder} weitere).`
          : undefined
        : 'Der Betriebsausschuss ist zwingend zu bilden. Ohne ihn dürfen auch keine weiteren Ausschüsse nach § 28 BetrVG gebildet werden.',
    });

    if (d.ausschuesseMitUebertragung > 0 && !d.hatBetriebsausschuss) {
      melde({
        schluessel: 'uebertragung-ohne-ba',
        bereich: 'Ausschüsse',
        norm: '§ 28 Abs. 1 S. 1 BetrVG',
        schwere: 'KRITISCH',
        titel: 'Aufgabenübertragung ohne Betriebsausschuss',
        text: `${d.ausschuesseMitUebertragung} Ausschüsse haben übertragene Aufgaben, obwohl kein Betriebsausschuss besteht.`,
        empfehlung: 'Die Übertragungen sind unwirksam. Beschlüsse dieser Ausschüsse binden den Betriebsrat nicht.',
      });
    }
  }

  const wa = wirtschaftsausschuss(d.beschaeftigte);
  if (wa.erforderlich) {
    melde({
      schluessel: 'wirtschaftsausschuss',
      bereich: 'Ausschüsse',
      norm: '§ 106 Abs. 1 BetrVG',
      schwere: d.hatWirtschaftsausschuss ? 'ERFUELLT' : 'KRITISCH',
      titel: 'Wirtschaftsausschuss',
      text: d.hatWirtschaftsausschuss ? 'Der Wirtschaftsausschuss ist gebildet.' : wa.grundlage,
      empfehlung: d.hatWirtschaftsausschuss
        ? undefined
        : 'Der Wirtschaftsausschuss ist vom Betriebsrat zu bestellen. Er hat Anspruch auf rechtzeitige und umfassende Unterrichtung über wirtschaftliche Angelegenheiten einschließlich der Unterlagen.',
    });
  }

  // --- Freistellungen -------------------------------------------------------

  const frei = freistellungen(d.beschaeftigte);
  melde({
    schluessel: 'freistellungen',
    bereich: 'Ressourcen',
    norm: '§ 38 Abs. 1 BetrVG',
    schwere: d.freistellungenErfasst >= frei.anzahl ? 'ERFUELLT' : 'KRITISCH',
    titel: 'Freistellungen',
    text: `${d.freistellungenErfasst} Freistellungen erfasst, gesetzlich vorgeschrieben sind ${frei.anzahl}.`,
    empfehlung:
      d.freistellungenErfasst >= frei.anzahl
        ? undefined
        : 'Die Freistellungen sind Mindestansprüche und nach Beratung mit dem Arbeitgeber vom Betriebsrat in geheimer Wahl zu bestimmen.',
  });

  // --- Geschaeftsordnung ----------------------------------------------------

  melde({
    schluessel: 'geschaeftsordnung',
    bereich: 'Verfahren',
    norm: '§ 36 BetrVG',
    schwere: d.geschaeftsordnungVorhanden ? 'ERFUELLT' : 'HINWEIS',
    titel: 'Geschäftsordnung',
    text: d.geschaeftsordnungVorhanden
      ? 'Eine schriftliche Geschäftsordnung ist hinterlegt.'
      : 'Es ist keine Geschäftsordnung hinterlegt.',
    empfehlung: d.geschaeftsordnungVorhanden
      ? undefined
      : 'Die Geschäftsordnung ist zwar nicht zwingend, regelt aber Ladungsfristen, Einspruchsfristen zur Niederschrift und – seit 2021 zwingend – die Voraussetzungen der Video- und Telefonkonferenz.',
  });

  if (!d.videoteilnahmeGeregelt) {
    melde({
      schluessel: 'videoregelung',
      bereich: 'Verfahren',
      norm: '§ 30 Abs. 2 Nr. 1 BetrVG',
      schwere: 'HINWEIS',
      titel: 'Video- und Telefonkonferenz nicht geregelt',
      text: 'Ohne Regelung in der Geschäftsordnung dürfen Sitzungen nicht per Video oder Telefon stattfinden.',
      empfehlung:
        'Gerade im vollkontinuierlichen Schichtbetrieb erleichtert eine solche Regelung die Teilnahme aus der Freischicht erheblich. Der Vorrang der Präsenzsitzung muss dabei gewahrt bleiben.',
    });
  }

  // --- Turnusverpflichtungen ------------------------------------------------

  const bvMonate = monateHer(d.letzteBetriebsversammlung, jetzt);
  melde({
    schluessel: 'betriebsversammlung',
    bereich: 'Regeltermine',
    norm: '§ 43 Abs. 1 S. 1 BetrVG',
    schwere: bvMonate !== null && bvMonate <= 3 ? 'ERFUELLT' : 'KRITISCH',
    titel: 'Betriebsversammlung je Kalendervierteljahr',
    text:
      bvMonate === null
        ? 'Es ist keine Betriebsversammlung erfasst.'
        : `Die letzte Betriebsversammlung liegt rund ${Math.round(bvMonate)} Monate zurück.`,
    empfehlung:
      bvMonate !== null && bvMonate <= 3
        ? undefined
        : 'Im vollkontinuierlichen Betrieb sind nach § 44 Abs. 1 BetrVG Teilversammlungen zulässig, damit alle Schichtgruppen erreicht werden. Der Betriebsrat hat einen Tätigkeitsbericht zu erstatten.',
  });

  const mgMonate = monateHer(d.letztesMonatsgespraech, jetzt);
  melde({
    schluessel: 'monatsgespraech',
    bereich: 'Regeltermine',
    norm: '§ 74 Abs. 1 S. 1 BetrVG',
    schwere: mgMonate !== null && mgMonate <= 1.2 ? 'ERFUELLT' : 'HINWEIS',
    titel: 'Monatsgespräch mit dem Arbeitgeber',
    text:
      mgMonate === null
        ? 'Es ist kein Monatsgespräch erfasst.'
        : `Das letzte Monatsgespräch liegt rund ${Math.round(mgMonate)} Monate zurück.`,
    empfehlung:
      mgMonate !== null && mgMonate <= 1.2
        ? undefined
        : 'Arbeitgeber und Betriebsrat haben mindestens einmal im Monat zusammenzutreten und strittige Fragen mit dem ernsten Willen zur Einigung zu beraten.',
  });

  const asaMonate = monateHer(d.letzteAsaSitzung, jetzt);
  melde({
    schluessel: 'asa',
    bereich: 'Regeltermine',
    norm: '§ 11 ASiG',
    schwere: asaMonate !== null && asaMonate <= 3 ? 'ERFUELLT' : 'HINWEIS',
    titel: 'Arbeitsschutzausschuss',
    text:
      asaMonate === null
        ? 'Es ist keine ASA-Sitzung erfasst.'
        : `Die letzte ASA-Sitzung liegt rund ${Math.round(asaMonate)} Monate zurück.`,
    empfehlung:
      asaMonate !== null && asaMonate <= 3
        ? undefined
        : 'Der Arbeitsschutzausschuss hat mindestens einmal vierteljährlich zusammenzutreten.',
  });

  // --- Dokumentation --------------------------------------------------------

  if (d.sitzungenOhneNiederschrift > 0) {
    melde({
      schluessel: 'niederschriften',
      bereich: 'Dokumentation',
      norm: '§ 34 Abs. 1 BetrVG',
      schwere: 'KRITISCH',
      titel: 'Fehlende Niederschriften',
      text: `Für ${d.sitzungenOhneNiederschrift} zurückliegende Sitzungen ist keine Niederschrift erfasst.`,
      empfehlung:
        'Über jede Sitzung ist eine Niederschrift zu führen, die mindestens den Wortlaut der Beschlüsse und das Stimmenverhältnis enthält. Fehlt sie, lässt sich die Wirksamkeit eines Beschlusses im Streitfall kaum belegen.',
    });
  }

  if (d.niederschriftenOhneZweiteUnterschrift > 0) {
    melde({
      schluessel: 'unterschriften',
      bereich: 'Dokumentation',
      norm: '§ 34 Abs. 1 S. 2 BetrVG',
      schwere: 'HINWEIS',
      titel: 'Unterschriften unvollständig',
      text: `${d.niederschriftenOhneZweiteUnterschrift} Niederschriften sind nicht von Vorsitz und einem weiteren Mitglied unterzeichnet.`,
      empfehlung: 'Die Niederschrift ist von dem Vorsitzenden und einem weiteren Mitglied zu unterzeichnen.',
    });
  }

  if (d.vorgaengeFristVerstrichen > 0) {
    melde({
      schluessel: 'fristen',
      bereich: 'Fristen',
      norm: '§ 99 Abs. 3, § 102 Abs. 2 BetrVG',
      schwere: 'KRITISCH',
      titel: 'Verstrichene Fristen',
      text: `${d.vorgaengeFristVerstrichen} offene Vorgänge haben eine bereits abgelaufene Frist.`,
      empfehlung:
        'Bei § 99 BetrVG gilt die Zustimmung als erteilt, bei § 102 BetrVG das Schweigen als abschließende Stellungnahme. Zu prüfen bleibt, ob die Unterrichtung vollständig war – nur dann ist die Frist überhaupt angelaufen.',
    });
  }

  if (d.bvOhneTarifpruefung > 0) {
    melde({
      schluessel: 'tarifvorbehalt',
      bereich: 'Betriebsvereinbarungen',
      norm: '§ 77 Abs. 3 BetrVG',
      schwere: 'HINWEIS',
      titel: 'Tarifvorbehalt nicht dokumentiert',
      text: `${d.bvOhneTarifpruefung} Betriebsvereinbarungen enthalten keinen Vermerk zur Prüfung des Tarifvorbehalts.`,
      empfehlung:
        'Bei Tarifbindung ist für jede Vereinbarung zu prüfen, ob der Gegenstand tarifvertraglich geregelt ist oder üblicherweise geregelt wird. Andernfalls droht die Unwirksamkeit.',
    });
  }

  // --- Datenschutz ----------------------------------------------------------

  melde({
    schluessel: 'vvt',
    bereich: 'Datenschutz',
    norm: 'Art. 30 DSGVO, § 79a BetrVG',
    schwere: d.vvtEintraege > 0 ? 'ERFUELLT' : 'KRITISCH',
    titel: 'Verzeichnis von Verarbeitungstätigkeiten',
    text:
      d.vvtEintraege > 0
        ? `${d.vvtEintraege} Verarbeitungstätigkeiten sind dokumentiert.`
        : 'Es ist keine Verarbeitungstätigkeit dokumentiert.',
    empfehlung:
      d.vvtEintraege > 0
        ? undefined
        : 'Verantwortlicher ist nach § 79a S. 2 BetrVG der Arbeitgeber. Der Betriebsrat muss ihn dabei unterstützen und die eigenen Verarbeitungen zuliefern, ohne dabei vertrauliche Inhalte offenzulegen.',
  });

  melde({
    schluessel: 'loeschkonzept',
    bereich: 'Datenschutz',
    norm: 'Art. 5 Abs. 1 lit. e DSGVO',
    schwere: d.loeschregeln > 0 ? 'ERFUELLT' : 'HINWEIS',
    titel: 'Löschkonzept',
    text: d.loeschregeln > 0 ? `${d.loeschregeln} Löschregeln sind hinterlegt.` : 'Es sind keine Löschregeln hinterlegt.',
  });

  if (d.vorgaengeUeberAufbewahrung > 0) {
    melde({
      schluessel: 'loeschung-faellig',
      bereich: 'Datenschutz',
      norm: 'Art. 17 Abs. 1 lit. a DSGVO',
      schwere: 'KRITISCH',
      titel: 'Löschung überfällig',
      text: `${d.vorgaengeUeberAufbewahrung} Vorgänge haben ihre Aufbewahrungsfrist überschritten.`,
      empfehlung:
        'Personenbezogene Daten sind zu löschen, sobald der Zweck entfallen ist. Ausnahme: ein laufendes arbeitsgerichtliches Verfahren – dann ist die Löschung bis zum rechtskräftigen Abschluss auszusetzen und dies zu vermerken.',
    });
  }

  // --- Aufsichtsrat ---------------------------------------------------------

  const ar = aufsichtsratLage(d.beschaeftigte);
  if (ar.pflicht) {
    melde({
      schluessel: 'aufsichtsrat',
      bereich: 'Unternehmensmitbestimmung',
      norm: '§ 1 Abs. 1 DrittelbG',
      schwere: d.aufsichtsratProjektVorhanden ? 'ERFUELLT' : 'HINWEIS',
      titel: 'Aufsichtsrat mit Drittelbeteiligung',
      text: d.aufsichtsratProjektVorhanden
        ? 'Die Bildung des Aufsichtsrats wird als Projekt begleitet.'
        : ar.grundlage,
      empfehlung: d.aufsichtsratProjektVorhanden
        ? undefined
        : 'Die gesellschaftsrechtliche Umsetzung obliegt dem Unternehmen. Der Betriebsrat sollte den Zeitplan einfordern und die Wahl der Arbeitnehmervertreter vorbereiten.',
    });
  }

  return befunde;
}

/** Verdichtet die Befunde zu einer Kennzahl. */
export function bewertung(befunde: Befund[]): { kritisch: number; hinweise: number; erfuellt: number; quote: number } {
  const kritisch = befunde.filter((b) => b.schwere === 'KRITISCH').length;
  const hinweise = befunde.filter((b) => b.schwere === 'HINWEIS').length;
  const erfuellt = befunde.filter((b) => b.schwere === 'ERFUELLT').length;
  const gesamt = befunde.length || 1;
  return { kritisch, hinweise, erfuellt, quote: Math.round((erfuellt / gesamt) * 100) };
}

export { erforderlicheTeilnehmer };
