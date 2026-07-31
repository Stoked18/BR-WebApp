/**
 * Strukturregeln des BetrVG als pruefbare Funktionen.
 *
 * Diese Datei bildet die Schwellenwerte und Quoren ab, die im Alltag eines
 * Betriebsrats staendig gebraucht und erfahrungsgemaess falsch gerechnet
 * werden – vor allem die Beschlussfaehigkeit (§ 33) und die qualifizierten
 * Mehrheiten bei der Aufgabenuebertragung (§§ 27, 28).
 *
 * Jede Funktion nennt ihre Fundstelle. Die Werte sind bewusst nicht in der
 * Datenbank konfigurierbar, weil es sich um zwingendes Recht handelt.
 */

// ---------------------------------------------------------------------------
// § 9 BetrVG – Zahl der Betriebsratsmitglieder
// ---------------------------------------------------------------------------

const GROESSE_STAFFEL: ReadonlyArray<{ bis: number; mitglieder: number }> = [
  { bis: 20, mitglieder: 1 },
  { bis: 50, mitglieder: 3 },
  { bis: 100, mitglieder: 5 },
  { bis: 200, mitglieder: 7 },
  { bis: 400, mitglieder: 9 },
  { bis: 700, mitglieder: 11 },
  { bis: 1000, mitglieder: 13 },
  { bis: 1500, mitglieder: 15 },
  { bis: 2000, mitglieder: 17 },
  { bis: 2500, mitglieder: 19 },
  { bis: 3000, mitglieder: 21 },
  { bis: 3500, mitglieder: 23 },
  { bis: 4000, mitglieder: 25 },
  { bis: 4500, mitglieder: 27 },
  { bis: 5000, mitglieder: 29 },
  { bis: 6000, mitglieder: 31 },
  { bis: 7000, mitglieder: 33 },
  { bis: 9000, mitglieder: 35 },
];

/**
 * Regelgroesse des Betriebsrats nach § 9 BetrVG.
 *
 * Achtung auf den Schwellenwert 700/701: bei genau 700 wahlberechtigten
 * Arbeitnehmern besteht der Betriebsrat aus 11, ab 701 aus 13 Mitgliedern.
 * Massgeblich ist die Zahl der in der Regel Beschaeftigten am Tag des
 * Wahlausschreibens, nicht die Zahl am Wahltag.
 *
 * @param wahlberechtigte Zahl der in der Regel beschaeftigten wahlberechtigten Arbeitnehmer
 */
export function groesseBetriebsrat(wahlberechtigte: number): number {
  if (wahlberechtigte < 5) return 0; // § 1 Abs. 1 BetrVG: erst ab 5 Wahlberechtigten
  for (const stufe of GROESSE_STAFFEL) {
    if (wahlberechtigte <= stufe.bis) return stufe.mitglieder;
  }
  // Ueber 9.000: je angefangene weitere 3.000 Arbeitnehmer zwei Mitglieder mehr.
  const ueber = wahlberechtigte - 9000;
  return 35 + 2 * Math.ceil(ueber / 3000);
}

/** Prueft, ob die tatsaechliche Gremiumsgroesse zur Beschaeftigtenzahl passt. */
export function pruefeGroesse(
  wahlberechtigte: number,
  istGroesse: number,
): { stimmig: boolean; soll: number; hinweis: string } {
  const soll = groesseBetriebsrat(wahlberechtigte);
  if (soll === istGroesse) {
    return { stimmig: true, soll, hinweis: `Die Groesse entspricht § 9 BetrVG (${soll} Mitglieder).` };
  }
  return {
    stimmig: false,
    soll,
    hinweis:
      `Bei ${wahlberechtigte} wahlberechtigten Arbeitnehmern sieht § 9 BetrVG ${soll} Mitglieder vor, ` +
      `erfasst sind aber ${istGroesse}. Massgeblich ist die Beschaeftigtenzahl am Tag des Wahlausschreibens; ` +
      `eine spaetere Veraenderung laesst das Gremium nach § 13 Abs. 2 Nr. 1 BetrVG erst dann neu waehlen, ` +
      `wenn die Zahl um die Haelfte, mindestens aber um fuenfzig, gestiegen oder gefallen ist.`,
  };
}

// ---------------------------------------------------------------------------
// § 33 BetrVG – Beschlussfaehigkeit und Mehrheiten
// ---------------------------------------------------------------------------

/**
 * Mindestzahl teilnehmender Mitglieder fuer die Beschlussfaehigkeit,
 * § 33 Abs. 2 BetrVG: mindestens die Haelfte der Mitglieder.
 * Bei ungerader Mitgliederzahl wird aufgerundet (13 -> 7).
 */
export function erforderlicheTeilnehmer(gremiumsgroesse: number): number {
  return Math.ceil(gremiumsgroesse / 2);
}

export type Beschlussfaehigkeit = {
  beschlussfaehig: boolean;
  anwesend: number;
  erforderlich: number;
  gremiumsgroesse: number;
  begruendung: string;
};

/**
 * § 33 Abs. 2 BetrVG. Mitgerechnet werden auch Ersatzmitglieder, die fuer
 * verhinderte ordentliche Mitglieder nachgerueckt sind. Nach § 33 Abs. 1 S. 2
 * BetrVG steht die Teilnahme per Video- oder Telefonkonferenz der
 * Anwesenheit gleich, wenn die Voraussetzungen des § 30 Abs. 2 BetrVG vorliegen.
 */
export function pruefeBeschlussfaehigkeit(
  gremiumsgroesse: number,
  anwesendStimmberechtigt: number,
): Beschlussfaehigkeit {
  const erforderlich = erforderlicheTeilnehmer(gremiumsgroesse);
  const beschlussfaehig = anwesendStimmberechtigt >= erforderlich;
  return {
    beschlussfaehig,
    anwesend: anwesendStimmberechtigt,
    erforderlich,
    gremiumsgroesse,
    begruendung: beschlussfaehig
      ? `Beschlussfaehig: ${anwesendStimmberechtigt} von ${gremiumsgroesse} stimmberechtigten Mitgliedern ` +
        `nehmen teil; § 33 Abs. 2 BetrVG verlangt mindestens ${erforderlich}.`
      : `Nicht beschlussfaehig: nur ${anwesendStimmberechtigt} von ${gremiumsgroesse} stimmberechtigten ` +
        `Mitgliedern nehmen teil; § 33 Abs. 2 BetrVG verlangt mindestens ${erforderlich}. ` +
        `Gefasste Beschluesse waeren unwirksam.`,
  };
}

export type Mehrheitsart = 'EINFACHE_MEHRHEIT_ANWESENDE' | 'MEHRHEIT_DER_MITGLIEDER' | 'ZWEI_DRITTEL';

export type Abstimmungsergebnis = {
  angenommen: boolean;
  ja: number;
  nein: number;
  enthaltung: number;
  erforderlich: number;
  begruendung: string;
};

/**
 * Wertet eine Abstimmung aus.
 *
 * Regelfall § 33 Abs. 1 BetrVG: Mehrheit der Stimmen der anwesenden Mitglieder.
 * Enthaltungen zaehlen dabei nicht als Ja-Stimmen; bei Stimmengleichheit ist
 * der Antrag abgelehnt.
 *
 * Sonderfall "Mehrheit der Stimmen der Mitglieder des Betriebsrats"
 * (§ 27 Abs. 2 S. 2, § 28 Abs. 1 S. 3 BetrVG): massgeblich ist die gesetzliche
 * Mitgliederzahl, nicht die Zahl der Anwesenden.
 */
export function werteAbstimmung(
  ja: number,
  nein: number,
  enthaltung: number,
  anwesendStimmberechtigt: number,
  gremiumsgroesse: number,
  art: Mehrheitsart = 'EINFACHE_MEHRHEIT_ANWESENDE',
): Abstimmungsergebnis {
  let erforderlich: number;
  let grundlage: string;

  switch (art) {
    case 'MEHRHEIT_DER_MITGLIEDER':
      erforderlich = Math.floor(gremiumsgroesse / 2) + 1;
      grundlage =
        `Mehrheit der Stimmen der Mitglieder des Betriebsrats (${gremiumsgroesse} Mitglieder), ` +
        `erforderlich sind ${erforderlich} Ja-Stimmen`;
      break;
    case 'ZWEI_DRITTEL':
      erforderlich = Math.ceil((2 * anwesendStimmberechtigt) / 3);
      grundlage = `Zwei-Drittel-Mehrheit der ${anwesendStimmberechtigt} Anwesenden, erforderlich sind ${erforderlich} Ja-Stimmen`;
      break;
    default:
      erforderlich = Math.floor((ja + nein) / 2) + 1;
      grundlage =
        `einfache Mehrheit der abgegebenen Stimmen nach § 33 Abs. 1 BetrVG ` +
        `(${ja + nein} Stimmen ohne ${enthaltung} Enthaltung(en)), erforderlich sind ${erforderlich} Ja-Stimmen`;
      break;
  }

  const angenommen = ja >= erforderlich && ja > nein;
  return {
    angenommen,
    ja,
    nein,
    enthaltung,
    erforderlich,
    begruendung:
      `${ja} Ja, ${nein} Nein, ${enthaltung} Enthaltung(en) bei ${anwesendStimmberechtigt} anwesenden ` +
      `stimmberechtigten Mitgliedern. Massstab: ${grundlage}. ` +
      (angenommen
        ? 'Der Antrag ist angenommen.'
        : ja === nein
          ? 'Stimmengleichheit bedeutet Ablehnung; der Antrag ist abgelehnt.'
          : 'Der Antrag ist abgelehnt.'),
  };
}

// ---------------------------------------------------------------------------
// Quoren "ein Viertel der Mitglieder"
// ---------------------------------------------------------------------------

/**
 * Ein Viertel der Mitglieder – Quorum fuer
 *  - § 29 Abs. 3 BetrVG  Einberufung einer Sitzung
 *  - § 30 Abs. 2 Nr. 3 BetrVG  Widerspruch gegen Video-/Telefonsitzung
 *  - § 31 BetrVG  Hinzuziehung eines Gewerkschaftsbeauftragten
 *  - § 43 Abs. 3 BetrVG  Antrag auf Betriebsversammlung
 * Bruchteile werden aufgerundet (13 Mitglieder -> 4).
 */
export function viertelQuorum(gremiumsgroesse: number): number {
  return Math.ceil(gremiumsgroesse / 4);
}

// ---------------------------------------------------------------------------
// § 27 BetrVG – Betriebsausschuss
// ---------------------------------------------------------------------------

export type Betriebsausschuss = {
  erforderlich: boolean;
  weitereMitglieder: number;
  gesamt: number;
  grundlage: string;
};

/**
 * § 27 Abs. 1 BetrVG. Ab neun Mitgliedern bildet der Betriebsrat einen
 * Betriebsausschuss aus dem Vorsitzenden, dessen Stellvertreter und weiteren
 * Mitgliedern. Bei einem 13-koepfigen Betriebsrat sind das drei weitere
 * Mitglieder, der Ausschuss hat also fuenf Mitglieder.
 */
export function betriebsausschuss(gremiumsgroesse: number): Betriebsausschuss {
  if (gremiumsgroesse < 9) {
    return {
      erforderlich: false,
      weitereMitglieder: 0,
      gesamt: 0,
      grundlage:
        `§ 27 Abs. 1 BetrVG verlangt einen Betriebsausschuss erst ab neun Mitgliedern; ` +
        `der Betriebsrat hat ${gremiumsgroesse}. Aufgaben koennen gleichwohl nach § 28 Abs. 1 BetrVG ` +
        `auf Ausschuesse uebertragen werden.`,
    };
  }
  let weitere: number;
  if (gremiumsgroesse <= 15) weitere = 3;
  else if (gremiumsgroesse <= 23) weitere = 5;
  else if (gremiumsgroesse <= 35) weitere = 7;
  else weitere = 9;
  return {
    erforderlich: true,
    weitereMitglieder: weitere,
    gesamt: weitere + 2,
    grundlage:
      `§ 27 Abs. 1 BetrVG: bei ${gremiumsgroesse} Mitgliedern besteht der Betriebsausschuss aus dem ` +
      `Vorsitzenden, dem Stellvertreter und ${weitere} weiteren Mitgliedern, insgesamt ${weitere + 2} Personen. ` +
      `Die weiteren Mitglieder werden nach § 27 Abs. 1 S. 3 BetrVG in geheimer Wahl und nach den ` +
      `Grundsaetzen der Verhaeltniswahl gewaehlt.`,
  };
}

// ---------------------------------------------------------------------------
// § 38 BetrVG – Freistellungen
// ---------------------------------------------------------------------------

const FREISTELLUNGS_STAFFEL: ReadonlyArray<{ bis: number; anzahl: number }> = [
  { bis: 500, anzahl: 1 },
  { bis: 900, anzahl: 2 },
  { bis: 1500, anzahl: 3 },
  { bis: 2000, anzahl: 4 },
  { bis: 3000, anzahl: 5 },
  { bis: 4000, anzahl: 6 },
  { bis: 5000, anzahl: 7 },
  { bis: 6000, anzahl: 8 },
  { bis: 7000, anzahl: 9 },
  { bis: 8000, anzahl: 10 },
  { bis: 9000, anzahl: 11 },
  { bis: 10000, anzahl: 12 },
];

/**
 * Zahl der freizustellenden Betriebsratsmitglieder nach § 38 Abs. 1 BetrVG.
 * Es handelt sich um Mindestfreistellungen; weitergehende Freistellungen
 * koennen vereinbart werden. Teilfreistellungen sind zulaessig und duerfen
 * nach § 38 Abs. 1 S. 4 BetrVG zusammengefasst werden.
 *
 * @param arbeitnehmer Zahl der in der Regel beschaeftigten Arbeitnehmer
 */
export function freistellungen(arbeitnehmer: number): { anzahl: number; grundlage: string } {
  if (arbeitnehmer < 200) {
    return {
      anzahl: 0,
      grundlage:
        `§ 38 Abs. 1 BetrVG sieht Vollfreistellungen erst ab 200 Arbeitnehmern vor. ` +
        `Die Arbeitsbefreiung im Einzelfall nach § 37 Abs. 2 BetrVG bleibt unberuehrt.`,
    };
  }
  let anzahl = 12;
  for (const stufe of FREISTELLUNGS_STAFFEL) {
    if (arbeitnehmer <= stufe.bis) {
      anzahl = stufe.anzahl;
      break;
    }
  }
  if (arbeitnehmer > 10000) anzahl = 12 + Math.ceil((arbeitnehmer - 10000) / 2000);
  return {
    anzahl,
    grundlage:
      `§ 38 Abs. 1 BetrVG: bei ${arbeitnehmer} Arbeitnehmern sind mindestens ${anzahl} ` +
      `Betriebsratsmitglieder von der beruflichen Taetigkeit freizustellen.`,
  };
}

// ---------------------------------------------------------------------------
// § 106 BetrVG – Wirtschaftsausschuss
// ---------------------------------------------------------------------------

export function wirtschaftsausschuss(arbeitnehmerImUnternehmen: number): {
  erforderlich: boolean;
  minMitglieder: number;
  maxMitglieder: number;
  grundlage: string;
} {
  const erforderlich = arbeitnehmerImUnternehmen > 100;
  return {
    erforderlich,
    minMitglieder: 3,
    maxMitglieder: 7,
    grundlage: erforderlich
      ? `§ 106 Abs. 1 BetrVG: in Unternehmen mit in der Regel mehr als 100 staendig beschaeftigten ` +
        `Arbeitnehmern (hier ${arbeitnehmerImUnternehmen}) ist ein Wirtschaftsausschuss zu bilden. ` +
        `Er besteht nach § 107 Abs. 1 BetrVG aus drei bis sieben Mitgliedern, von denen mindestens ` +
        `eines Betriebsratsmitglied sein muss.`
      : `§ 106 Abs. 1 BetrVG greift erst bei mehr als 100 staendig beschaeftigten Arbeitnehmern.`,
  };
}

// ---------------------------------------------------------------------------
// § 15 Abs. 2 BetrVG – Geschlecht in der Minderheit
// ---------------------------------------------------------------------------

export type Minderheitensitze = {
  anwendbar: boolean;
  minderheit: 'WEIBLICH' | 'MAENNLICH' | null;
  mindestsitze: number;
  verteilung: { weiblich: number; maennlich: number };
  grundlage: string;
};

/**
 * Mindestsitze des Geschlechts in der Minderheit nach § 15 Abs. 2 BetrVG.
 * Die Verteilung erfolgt nach § 15 Abs. 2 WO nach dem Hoechstzahlverfahren
 * d'Hondt: die Beschaeftigtenzahlen beider Geschlechter werden fortlaufend
 * durch 1, 2, 3 ... geteilt, die groessten Quotienten erhalten die Sitze.
 *
 * Die Regelung gilt nur, wenn der Betriebsrat aus mindestens drei Mitgliedern
 * besteht.
 */
export function mindestsitzeMinderheit(
  beschaeftigteWeiblich: number,
  beschaeftigteMaennlich: number,
  sitze: number,
): Minderheitensitze {
  if (sitze < 3) {
    return {
      anwendbar: false,
      minderheit: null,
      mindestsitze: 0,
      verteilung: { weiblich: 0, maennlich: 0 },
      grundlage: '§ 15 Abs. 2 BetrVG gilt erst, wenn der Betriebsrat aus mindestens drei Mitgliedern besteht.',
    };
  }

  const quotienten: Array<{ wert: number; geschlecht: 'WEIBLICH' | 'MAENNLICH' }> = [];
  for (let teiler = 1; teiler <= sitze; teiler++) {
    quotienten.push({ wert: beschaeftigteWeiblich / teiler, geschlecht: 'WEIBLICH' });
    quotienten.push({ wert: beschaeftigteMaennlich / teiler, geschlecht: 'MAENNLICH' });
  }
  // Bei Gleichstand entscheidet nach § 15 Abs. 2 WO das Los; hier wird das
  // groessere Geschlecht bevorzugt, der Losentscheid ist manuell zu erfassen.
  quotienten.sort((a, b) => {
    if (b.wert !== a.wert) return b.wert - a.wert;
    const groesser = beschaeftigteWeiblich >= beschaeftigteMaennlich ? 'WEIBLICH' : 'MAENNLICH';
    return a.geschlecht === groesser ? -1 : 1;
  });

  const verteilung = { weiblich: 0, maennlich: 0 };
  for (const q of quotienten.slice(0, sitze)) {
    if (q.geschlecht === 'WEIBLICH') verteilung.weiblich++;
    else verteilung.maennlich++;
  }

  const minderheit: 'WEIBLICH' | 'MAENNLICH' | null =
    beschaeftigteWeiblich === beschaeftigteMaennlich
      ? null
      : beschaeftigteWeiblich < beschaeftigteMaennlich
        ? 'WEIBLICH'
        : 'MAENNLICH';

  const mindestsitze =
    minderheit === 'WEIBLICH' ? verteilung.weiblich : minderheit === 'MAENNLICH' ? verteilung.maennlich : 0;

  return {
    anwendbar: minderheit !== null,
    minderheit,
    mindestsitze,
    verteilung,
    grundlage:
      minderheit === null
        ? 'Beide Geschlechter sind gleich stark vertreten; ein Minderheitengeschlecht besteht nicht.'
        : `Bei ${beschaeftigteWeiblich} weiblichen und ${beschaeftigteMaennlich} maennlichen Beschaeftigten ` +
          `und ${sitze} Sitzen entfallen nach dem Hoechstzahlverfahren (§ 15 Abs. 2 WO) ` +
          `${verteilung.weiblich} Sitze auf weibliche und ${verteilung.maennlich} Sitze auf maennliche ` +
          `Beschaeftigte. Dem Geschlecht in der Minderheit (${minderheit === 'WEIBLICH' ? 'weiblich' : 'maennlich'}) ` +
          `stehen damit mindestens ${mindestsitze} Sitze zu.`,
  };
}

// ---------------------------------------------------------------------------
// § 30 Abs. 2 BetrVG – Video- und Telefonkonferenz
// ---------------------------------------------------------------------------

export type Videopruefung = {
  zulaessig: boolean;
  maengel: string[];
  hinweise: string[];
};

/**
 * Prueft die Voraussetzungen des § 30 Abs. 2 BetrVG fuer eine Sitzung per
 * Video- oder Telefonkonferenz. Die Praesenzsitzung bleibt der gesetzliche
 * Regelfall (§ 30 Abs. 2 Nr. 1 BetrVG: Vorrang der Praesenzsitzung).
 */
export function pruefeVideositzung(args: {
  gremiumsgroesse: number;
  geschaeftsordnungRegeltVideo: boolean;
  widersprueche: number;
  nichtoeffentlichkeitSichergestellt: boolean;
  aufzeichnungAusgeschlossen: boolean;
}): Videopruefung {
  const maengel: string[] = [];
  const hinweise: string[] = [];
  const quorum = viertelQuorum(args.gremiumsgroesse);

  if (!args.geschaeftsordnungRegeltVideo) {
    maengel.push(
      '§ 30 Abs. 2 Nr. 1 BetrVG: Die Geschaeftsordnung muss die Voraussetzungen der Video- und ' +
        'Telefonkonferenz regeln und dabei den Vorrang der Praesenzsitzung sichern.',
    );
  }
  if (args.widersprueche >= quorum) {
    maengel.push(
      `§ 30 Abs. 2 Nr. 3 BetrVG: ${args.widersprueche} Mitglieder haben widersprochen; ` +
        `bereits ${quorum} Widersprueche (ein Viertel von ${args.gremiumsgroesse}) schliessen die ` +
        `Video- oder Telefonsitzung aus.`,
    );
  } else if (args.widersprueche > 0) {
    hinweise.push(
      `${args.widersprueche} von ${quorum} erforderlichen Widerspruechen liegen vor. ` +
        `Bei ${quorum} Widerspruechen ist in Praesenz zu tagen.`,
    );
  }
  if (!args.nichtoeffentlichkeitSichergestellt) {
    maengel.push(
      '§ 30 Abs. 2 Nr. 2 BetrVG: Die Nichtoeffentlichkeit der Sitzung muss sichergestellt sein. ' +
        'Die Teilnehmenden haben zu bestaetigen, dass sie allein und unbeobachtet teilnehmen.',
    );
  }
  if (!args.aufzeichnungAusgeschlossen) {
    maengel.push(
      '§ 30 Abs. 2 S. 2 BetrVG: Eine Aufzeichnung der Sitzung ist unzulaessig und technisch auszuschliessen.',
    );
  }

  hinweise.push(
    'Nach § 33 Abs. 1 S. 2 BetrVG steht die Teilnahme per Video- oder Telefonkonferenz der Anwesenheit ' +
      'gleich; die Teilnehmenden zaehlen fuer die Beschlussfaehigkeit mit.',
  );
  hinweise.push(
    'Die Anwesenheitsliste nach § 34 Abs. 1 S. 3 BetrVG wird bei Videositzungen durch die Bestaetigung ' +
      'der Teilnahme in Textform gegenueber dem Vorsitzenden ersetzt (§ 34 Abs. 1 S. 5 BetrVG).',
  );

  return { zulaessig: maengel.length === 0, maengel, hinweise };
}

// ---------------------------------------------------------------------------
// Turnusverpflichtungen
// ---------------------------------------------------------------------------

export type Turnuspflicht = {
  schluessel: string;
  bezeichnung: string;
  grundlage: string;
  /** Zeitraum in Monaten, in dem der Termin mindestens einmal stattfinden muss. */
  turnusMonate: number;
  hinweis?: string;
};

export const TURNUSPFLICHTEN: readonly Turnuspflicht[] = [
  {
    schluessel: 'BETRIEBSVERSAMMLUNG',
    bezeichnung: 'Betriebsversammlung',
    grundlage: '§ 43 Abs. 1 S. 1 BetrVG',
    turnusMonate: 3,
    hinweis:
      'Einmal in jedem Kalendervierteljahr; der Betriebsrat hat einen Taetigkeitsbericht zu erstatten. ' +
      'Bei durchgehendem Schichtbetrieb sind nach § 44 Abs. 1 BetrVG Teilversammlungen zulaessig, ' +
      'damit alle Schichten teilnehmen koennen.',
  },
  {
    schluessel: 'MONATSGESPRAECH',
    bezeichnung: 'Monatsgespraech mit dem Arbeitgeber',
    grundlage: '§ 74 Abs. 1 S. 1 BetrVG',
    turnusMonate: 1,
    hinweis: 'Mindestens einmal im Monat; strittige Fragen sind mit dem ernsten Willen zur Einigung zu beraten.',
  },
  {
    schluessel: 'ASA',
    bezeichnung: 'Arbeitsschutzausschuss',
    grundlage: '§ 11 ASiG',
    turnusMonate: 3,
    hinweis: 'Mindestens einmal vierteljaehrlich; Teilnahme von Betriebsarzt, Fachkraft fuer Arbeitssicherheit und Sicherheitsbeauftragten.',
  },
  {
    schluessel: 'BR_SITZUNG',
    bezeichnung: 'Ordentliche Betriebsratssitzung',
    grundlage: '§ 29 Abs. 2 BetrVG',
    turnusMonate: 1,
    hinweis:
      'Das BetrVG schreibt keinen festen Turnus vor. Ein monatlicher Rhythmus ist Praxisstandard und ' +
      'sollte in der Geschaeftsordnung nach § 36 BetrVG festgelegt werden.',
  },
  {
    schluessel: 'WIRTSCHAFTSAUSSCHUSS',
    bezeichnung: 'Sitzung des Wirtschaftsausschusses',
    grundlage: '§ 108 Abs. 1 BetrVG',
    turnusMonate: 1,
    hinweis: 'Der Wirtschaftsausschuss soll monatlich einmal zusammentreten.',
  },
];

// ---------------------------------------------------------------------------
// § 37 Abs. 7 BetrVG – Schulungskontingent
// ---------------------------------------------------------------------------

/**
 * Anspruch auf bezahlte Freistellung fuer geeignete Schulungen nach
 * § 37 Abs. 7 BetrVG: drei Wochen je Amtsperiode, im ersten Mandat vier Wochen.
 * Schulungen nach § 37 Abs. 6 BetrVG (erforderliche Kenntnisse) werden auf
 * dieses Kontingent nicht angerechnet.
 */
export function schulungskontingentTage(erstmalsGewaehlt: boolean, arbeitstageProWoche = 5): number {
  return (erstmalsGewaehlt ? 4 : 3) * arbeitstageProWoche;
}

// ---------------------------------------------------------------------------
// DrittelbG – Aufsichtsrat mit Drittelbeteiligung
// ---------------------------------------------------------------------------

export type Aufsichtsratlage = {
  pflicht: boolean;
  gesetz: 'DrittelbG' | 'MitbestG' | 'KEINE';
  sitzeGesamtVorschlag: number;
  sitzeArbeitnehmer: number;
  grundlage: string;
  hinweise: string[];
};

/**
 * Ordnet die Mitbestimmung im Aufsichtsrat anhand der Beschaeftigtenzahl ein.
 *
 * Achtung: massgeblich ist die Zahl der Arbeitnehmer des *Unternehmens*
 * (bei Konzernstrukturen ggf. einschliesslich zurechenbarer Konzernunternehmen,
 * § 2 Abs. 2 DrittelbG), nicht die des einzelnen Betriebs. Die Rechtsform des
 * Unternehmens ist zusaetzlich zu pruefen (§ 1 Abs. 1 DrittelbG).
 */
export function aufsichtsratLage(arbeitnehmerImUnternehmen: number, sitzeGesamt?: number): Aufsichtsratlage {
  const hinweise: string[] = [];

  if (arbeitnehmerImUnternehmen <= 500) {
    return {
      pflicht: false,
      gesetz: 'KEINE',
      sitzeGesamtVorschlag: 0,
      sitzeArbeitnehmer: 0,
      grundlage:
        `§ 1 Abs. 1 DrittelbG greift erst bei in der Regel mehr als 500 Arbeitnehmern; ` +
        `erfasst sind ${arbeitnehmerImUnternehmen}.`,
      hinweise: [],
    };
  }

  const gesetz: 'DrittelbG' | 'MitbestG' = arbeitnehmerImUnternehmen > 2000 ? 'MitbestG' : 'DrittelbG';

  if (gesetz === 'MitbestG') {
    hinweise.push(
      'Ab mehr als 2.000 Arbeitnehmern gilt das MitbestG mit paritaetischer Besetzung; ' +
        'die Zusammensetzung richtet sich dann nach § 7 MitbestG.',
    );
  }

  // § 95 S. 1, 3 AktG: mindestens drei Mitglieder, Zahl durch drei teilbar.
  const gesamt = sitzeGesamt && sitzeGesamt >= 3 ? Math.ceil(sitzeGesamt / 3) * 3 : 3;
  const arbeitnehmerSitze = gesetz === 'DrittelbG' ? gesamt / 3 : gesamt / 2;

  hinweise.push(
    'Die Arbeitnehmervertreter werden nach § 5 DrittelbG in unmittelbarer, geheimer Wahl von den ' +
      'Arbeitnehmern gewaehlt; das Verfahren regelt die Wahlordnung zum DrittelbG.',
  );
  hinweise.push(
    'Wahlvorschlaege koennen nach § 6 DrittelbG von den Betriebsraeten oder von einem Zehntel bzw. ' +
      '100 der wahlberechtigten Arbeitnehmer gemacht werden.',
  );
  hinweise.push(
    'Die Bildung des Aufsichtsrats ist gesellschaftsrechtlich vorzubereiten (Satzungsaenderung, ' +
      'Statusverfahren nach §§ 97 ff. AktG). Das ist Aufgabe des Unternehmens; der Betriebsrat sollte ' +
      'den Zeitplan begleiten und die Wahl der Arbeitnehmervertreter organisieren.',
  );
  hinweise.push(
    'Bei Zugehoerigkeit zu einem boersennotierten Konzern sind zusaetzlich die Vorgaben des ' +
      'Mutterunternehmens (Board-Struktur, Berichtspflichten) zu beruecksichtigen. Diese ersetzen die ' +
      'deutsche Mitbestimmung nicht.',
  );

  return {
    pflicht: true,
    gesetz,
    sitzeGesamtVorschlag: gesamt,
    sitzeArbeitnehmer: arbeitnehmerSitze,
    grundlage:
      gesetz === 'DrittelbG'
        ? `Bei ${arbeitnehmerImUnternehmen} Arbeitnehmern ist nach § 1 Abs. 1 DrittelbG ein Aufsichtsrat ` +
          `zu bilden, der zu einem Drittel aus Arbeitnehmervertretern besteht (§ 4 Abs. 1 DrittelbG). ` +
          `Bei ${gesamt} Sitzen entfallen ${arbeitnehmerSitze} auf die Arbeitnehmerseite.`
        : `Bei ${arbeitnehmerImUnternehmen} Arbeitnehmern gilt das MitbestG (paritaetische Besetzung).`,
    hinweise,
  };
}

// ---------------------------------------------------------------------------
// § 25 BetrVG – Nachruecken von Ersatzmitgliedern
// ---------------------------------------------------------------------------

export type Nachrueckkandidat = {
  personId: string;
  name: string;
  stimmen: number;
  geschlecht: 'WEIBLICH' | 'MAENNLICH' | 'DIVERS' | 'KEINE_ANGABE';
  rang: number;
};

export type Nachrueckvorschlag = {
  kandidat: Nachrueckkandidat | null;
  begruendung: string;
  warnungen: string[];
};

/**
 * Ermittelt das nachrueckende Ersatzmitglied bei Personenwahl (Mehrheitswahl).
 *
 * § 25 Abs. 2 S. 2 BetrVG: bei Personenwahl ruecken die nicht gewaehlten
 * Bewerber in der Reihenfolge ihrer Stimmenzahl nach.
 *
 * § 25 Abs. 2 S. 1 Halbs. 2 BetrVG schuetzt zusaetzlich das Geschlecht in der
 * Minderheit: scheidet ein Mitglied des Minderheitengeschlechts aus einem
 * Quotenplatz aus, rueckt vorrangig eine Person desselben Geschlechts nach,
 * solange dadurch die Mindestsitzzahl nach § 15 Abs. 2 BetrVG gewahrt bleibt.
 *
 * @param kandidaten     nicht gewaehlte Bewerber, absteigend nach Stimmen
 * @param bereitsAktiv   Personen-IDs, die bereits nachgerueckt sind
 */
export function ermittleNachruecker(
  kandidaten: Nachrueckkandidat[],
  bereitsAktiv: Set<string>,
  optionen?: {
    /** Ausgeschiedenes Mitglied gehoerte zum Geschlecht in der Minderheit auf einem Quotenplatz. */
    quotenplatzBetroffen?: boolean;
    minderheitengeschlecht?: 'WEIBLICH' | 'MAENNLICH' | null;
  },
): Nachrueckvorschlag {
  const warnungen: string[] = [];
  const verfuegbar = kandidaten
    .filter((k) => !bereitsAktiv.has(k.personId))
    .sort((a, b) => (b.stimmen - a.stimmen) || (a.rang - b.rang));

  if (verfuegbar.length === 0) {
    return {
      kandidat: null,
      begruendung:
        'Es steht kein Ersatzmitglied mehr zur Verfuegung. Sinkt die Zahl der Mitglieder unter die ' +
        'gesetzliche Zahl, ist nach § 13 Abs. 2 Nr. 2 BetrVG eine Neuwahl durchzufuehren.',
      warnungen: ['Ersatzmitgliederliste erschoepft – Neuwahl nach § 13 Abs. 2 Nr. 2 BetrVG pruefen.'],
    };
  }

  if (optionen?.quotenplatzBetroffen && optionen.minderheitengeschlecht) {
    const gleichesGeschlecht = verfuegbar.find((k) => k.geschlecht === optionen.minderheitengeschlecht);
    if (gleichesGeschlecht) {
      const vorRang = verfuegbar[0];
      if (gleichesGeschlecht.personId !== vorRang.personId) {
        warnungen.push(
          `Nach Stimmenzahl waere ${vorRang.name} an der Reihe. Da der frei gewordene Sitz ein ` +
            `Mindestsitz des Geschlechts in der Minderheit nach § 15 Abs. 2 BetrVG ist, rueckt ` +
            `${gleichesGeschlecht.name} vorrangig nach (§ 25 Abs. 2 S. 1 BetrVG).`,
        );
      }
      return {
        kandidat: gleichesGeschlecht,
        begruendung:
          `${gleichesGeschlecht.name} rueckt mit ${gleichesGeschlecht.stimmen} Stimmen nach. ` +
          `Der Sitz ist ein Mindestsitz des Geschlechts in der Minderheit (§ 15 Abs. 2 BetrVG), ` +
          `daher ist die Geschlechterzugehoerigkeit vorrangig zu beruecksichtigen.`,
        warnungen,
      };
    }
    warnungen.push(
      'Fuer den Mindestsitz des Geschlechts in der Minderheit steht kein Ersatzmitglied desselben ' +
        'Geschlechts zur Verfuegung. Es rueckt der Bewerber mit der naechsthoeheren Stimmenzahl nach.',
    );
  }

  const kandidat = verfuegbar[0];
  const gleichstand = verfuegbar.filter((k) => k.stimmen === kandidat.stimmen);
  if (gleichstand.length > 1) {
    warnungen.push(
      `Stimmengleichheit zwischen ${gleichstand.map((k) => k.name).join(', ')}. ` +
        `Nach § 25 Abs. 2 BetrVG i.V.m. der Wahlordnung entscheidet das Los; der Losentscheid ist ` +
        `zu dokumentieren und im System als Rangfolge zu hinterlegen.`,
    );
  }

  return {
    kandidat,
    begruendung:
      `${kandidat.name} rueckt als Bewerber mit der naechsthoechsten Stimmenzahl (${kandidat.stimmen}) nach. ` +
      `Grundlage ist § 25 Abs. 2 S. 2 BetrVG (Personenwahl).`,
    warnungen,
  };
}
