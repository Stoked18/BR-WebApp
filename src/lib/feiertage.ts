/**
 * Gesetzliche Feiertage – Schwerpunkt Nordrhein-Westfalen.
 *
 * Warum das hier eigenstaendig implementiert ist: Fristen nach § 193 BGB
 * verschieben sich auf den naechsten Werktag, wenn das Fristende auf einen
 * Sonnabend, Sonntag oder gesetzlichen Feiertag faellt. Massgeblich ist das
 * Feiertagsrecht am Ort der Leistung – fuer einen Betrieb in NRW also das
 * Feiertagsgesetz NRW (FeiertagsG NRW). Fronleichnam und Allerheiligen sind
 * dort Feiertage, in den meisten anderen Bundeslaendern nicht. Genau diese
 * beiden Tage kippen in der Praxis eine Wochenfrist nach § 99 BetrVG.
 */

/** Kalenderdatum ohne Uhrzeit und ohne Zeitzonenbezug. */
export type Kalendertag = { jahr: number; monat: number; tag: number };

export type Feiertag = {
  datum: Kalendertag;
  bezeichnung: string;
  /** Bundeslaender, in denen der Tag gesetzlicher Feiertag ist. */
  laender: readonly string[];
};

/** Alle Bundeslaender – fuer die bundeseinheitlichen Feiertage. */
const BUNDESWEIT = [
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI',
  'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
] as const;

export function tagAlsIso(t: Kalendertag): string {
  return `${String(t.jahr).padStart(4, '0')}-${String(t.monat).padStart(2, '0')}-${String(t.tag).padStart(2, '0')}`;
}

export function isoAlsTag(iso: string): Kalendertag {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!treffer) throw new Error(`Ungueltiges Datum: ${iso}`);
  return { jahr: Number(treffer[1]), monat: Number(treffer[2]), tag: Number(treffer[3]) };
}

/** Rechnet einen Kalendertag in einen UTC-Mitternachtszeitpunkt um (nur fuer Arithmetik). */
function alsUtc(t: Kalendertag): number {
  return Date.UTC(t.jahr, t.monat - 1, t.tag);
}

function ausUtc(ms: number): Kalendertag {
  const d = new Date(ms);
  return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth() + 1, tag: d.getUTCDate() };
}

/** Verschiebt einen Kalendertag um n Tage. */
export function plusTage(t: Kalendertag, n: number): Kalendertag {
  return ausUtc(alsUtc(t) + n * 86_400_000);
}

/** 0 = Sonntag, 1 = Montag, ... 6 = Sonnabend. */
export function wochentag(t: Kalendertag): number {
  return new Date(alsUtc(t)).getUTCDay();
}

export function istWochenende(t: Kalendertag): boolean {
  const w = wochentag(t);
  return w === 0 || w === 6;
}

export function vergleiche(a: Kalendertag, b: Kalendertag): number {
  return alsUtc(a) - alsUtc(b);
}

export function tageZwischen(von: Kalendertag, bis: Kalendertag): number {
  return Math.round((alsUtc(bis) - alsUtc(von)) / 86_400_000);
}

/**
 * Ostersonntag nach dem anonymen gregorianischen Algorithmus (Meeus/Jones/Butcher).
 * Gueltig fuer alle Jahre des gregorianischen Kalenders.
 */
export function ostersonntag(jahr: number): Kalendertag {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return { jahr, monat, tag };
}

/**
 * Alle gesetzlichen Feiertage eines Jahres mit Angabe der Bundeslaender.
 * Nicht enthalten sind Tage ohne bundeslandweiten Feiertagsstatus
 * (z. B. Mariae Himmelfahrt nur in Teilen Bayerns, Fronleichnam nur in
 * einzelnen Gemeinden Sachsens/Thueringens) – fuer NRW ist die Liste vollstaendig.
 */
export function feiertage(jahr: number): Feiertag[] {
  const o = ostersonntag(jahr);
  const liste: Feiertag[] = [
    { datum: { jahr, monat: 1, tag: 1 }, bezeichnung: 'Neujahr', laender: BUNDESWEIT },
    { datum: { jahr, monat: 1, tag: 6 }, bezeichnung: 'Heilige Drei Koenige', laender: ['BW', 'BY', 'ST'] },
    { datum: { jahr, monat: 3, tag: 8 }, bezeichnung: 'Internationaler Frauentag', laender: ['BE', 'MV'] },
    { datum: plusTage(o, -2), bezeichnung: 'Karfreitag', laender: BUNDESWEIT },
    { datum: plusTage(o, 1), bezeichnung: 'Ostermontag', laender: BUNDESWEIT },
    { datum: { jahr, monat: 5, tag: 1 }, bezeichnung: 'Tag der Arbeit', laender: BUNDESWEIT },
    { datum: plusTage(o, 39), bezeichnung: 'Christi Himmelfahrt', laender: BUNDESWEIT },
    { datum: plusTage(o, 50), bezeichnung: 'Pfingstmontag', laender: BUNDESWEIT },
    { datum: plusTage(o, 60), bezeichnung: 'Fronleichnam', laender: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
    { datum: { jahr, monat: 8, tag: 15 }, bezeichnung: 'Mariae Himmelfahrt', laender: ['SL'] },
    { datum: { jahr, monat: 9, tag: 20 }, bezeichnung: 'Weltkindertag', laender: ['TH'] },
    { datum: { jahr, monat: 10, tag: 3 }, bezeichnung: 'Tag der Deutschen Einheit', laender: BUNDESWEIT },
    { datum: { jahr, monat: 10, tag: 31 }, bezeichnung: 'Reformationstag', laender: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
    { datum: { jahr, monat: 11, tag: 1 }, bezeichnung: 'Allerheiligen', laender: ['BW', 'BY', 'NW', 'RP', 'SL'] },
    { datum: bussUndBettag(jahr), bezeichnung: 'Buss- und Bettag', laender: ['SN'] },
    { datum: { jahr, monat: 12, tag: 25 }, bezeichnung: '1. Weihnachtstag', laender: BUNDESWEIT },
    { datum: { jahr, monat: 12, tag: 26 }, bezeichnung: '2. Weihnachtstag', laender: BUNDESWEIT },
  ];
  return liste.sort((a, b) => vergleiche(a.datum, b.datum));
}

/** Mittwoch vor dem 23. November. */
function bussUndBettag(jahr: number): Kalendertag {
  let t: Kalendertag = { jahr, monat: 11, tag: 22 };
  while (wochentag(t) !== 3) t = plusTage(t, -1);
  return t;
}

/** Feiertage eines Jahres im angegebenen Bundesland (Vorgabe: NRW). */
export function feiertageLand(jahr: number, land = 'NW'): Feiertag[] {
  return feiertage(jahr).filter((f) => f.laender.includes(land));
}

const zwischenspeicher = new Map<string, Map<string, string>>();

/** Indizierte Feiertage eines Jahres: ISO-Datum -> Bezeichnung. */
function feiertagsIndex(jahr: number, land: string): Map<string, string> {
  const schluessel = `${land}:${jahr}`;
  let index = zwischenspeicher.get(schluessel);
  if (!index) {
    index = new Map(feiertageLand(jahr, land).map((f) => [tagAlsIso(f.datum), f.bezeichnung]));
    zwischenspeicher.set(schluessel, index);
  }
  return index;
}

/** Bezeichnung des Feiertags oder null. */
export function feiertagName(t: Kalendertag, land = 'NW'): string | null {
  return feiertagsIndex(t.jahr, land).get(tagAlsIso(t)) ?? null;
}

export function istFeiertag(t: Kalendertag, land = 'NW'): boolean {
  return feiertagName(t, land) !== null;
}

/**
 * Werktag i. S. d. § 193 BGB: kein Sonnabend, kein Sonntag, kein gesetzlicher
 * Feiertag. Achtung: der Werktagsbegriff des BGB ist enger als der des
 * ArbZG (dort ist der Sonnabend Werktag).
 */
export function istWerktag(t: Kalendertag, land = 'NW'): boolean {
  return !istWochenende(t) && !istFeiertag(t, land);
}

/** Naechster Werktag ab (einschliesslich) dem uebergebenen Tag. */
export function naechsterWerktag(t: Kalendertag, land = 'NW'): Kalendertag {
  let k = t;
  // Schutz gegen Endlosschleifen bei fehlerhaften Feiertagsdaten.
  for (let i = 0; i < 30; i++) {
    if (istWerktag(k, land)) return k;
    k = plusTage(k, 1);
  }
  throw new Error('Kein Werktag innerhalb von 30 Tagen gefunden');
}

/** Zaehlt die Werktage im Zeitraum einschliesslich beider Randtage. */
export function werktageImZeitraum(von: Kalendertag, bis: Kalendertag, land = 'NW'): number {
  let anzahl = 0;
  for (let k = von; vergleiche(k, bis) <= 0; k = plusTage(k, 1)) {
    if (istWerktag(k, land)) anzahl++;
  }
  return anzahl;
}
