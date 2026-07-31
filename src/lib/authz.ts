/**
 * Berechtigungsmodell.
 *
 * Leitgedanke ist die Trennung der Sphaeren. Der Betriebsrat fuehrt sein Amt
 * unabhaengig (§ 78 BetrVG) und unterliegt der Geheimhaltungspflicht des
 * § 79 BetrVG. Deshalb duerfen Rollen der Arbeitgeberseite in dieser Anwendung
 * nur das sehen, was sie selbst eingebracht haben – also ihre eigenen
 * Antraege und die dazu ergangene Antwort des Gremiums. Sitzungsverlaeufe,
 * Meinungsbilder, Abstimmungsergebnisse und interne Unterlagen bleiben ihnen
 * verschlossen.
 *
 * Auch die Rolle IT_BETRIEB hat bewusst keinerlei fachlichen Leserechte. Sie
 * existiert nur, damit technischer Betrieb ohne Fachzugriff moeglich ist.
 */

import type { Systemrolle, Vertraulichkeit } from '@prisma/client';

export type Recht =
  | 'gremium.lesen'
  | 'gremium.verwalten'
  | 'sitzung.lesen'
  | 'sitzung.planen'
  | 'sitzung.leiten'
  | 'sitzung.protokollieren'
  | 'sitzung.protokoll.freigeben'
  | 'beschluss.lesen'
  | 'beschluss.erfassen'
  | 'vorgang.lesen'
  | 'vorgang.einreichen'
  | 'vorgang.bearbeiten'
  | 'vorgang.beantworten'
  | 'bv.lesen'
  | 'bv.verwalten'
  | 'aufgabe.lesen'
  | 'aufgabe.verwalten'
  | 'dokument.lesen'
  | 'dokument.hochladen'
  | 'schulung.lesen'
  | 'schulung.verwalten'
  | 'datenschutz.lesen'
  | 'datenschutz.verwalten'
  | 'audit.lesen'
  | 'benutzer.verwalten'
  | 'system.verwalten';

const NUR_LESEN_GREMIUM: Recht[] = [
  'gremium.lesen',
  'sitzung.lesen',
  'beschluss.lesen',
  'vorgang.lesen',
  'bv.lesen',
  'aufgabe.lesen',
  'dokument.lesen',
  'schulung.lesen',
];

const VOLLES_MITGLIED: Recht[] = [
  ...NUR_LESEN_GREMIUM,
  'sitzung.planen',
  'sitzung.protokollieren',
  'beschluss.erfassen',
  'vorgang.bearbeiten',
  'aufgabe.verwalten',
  'dokument.hochladen',
];

const RECHTE: Record<Systemrolle, Recht[]> = {
  BR_VORSITZ: [
    ...VOLLES_MITGLIED,
    'gremium.verwalten',
    'sitzung.leiten',
    'sitzung.protokoll.freigeben',
    'vorgang.beantworten',
    'bv.verwalten',
    'schulung.verwalten',
    'datenschutz.lesen',
    'datenschutz.verwalten',
    'audit.lesen',
    'benutzer.verwalten',
  ],
  BR_STELLV: [
    ...VOLLES_MITGLIED,
    'gremium.verwalten',
    'sitzung.leiten',
    'sitzung.protokoll.freigeben',
    'vorgang.beantworten',
    'bv.verwalten',
    'schulung.verwalten',
    'datenschutz.lesen',
    'audit.lesen',
  ],
  BR_MITGLIED: VOLLES_MITGLIED,
  // Ersatzmitglieder erhalten Lesezugriff erst mit dem Nachruecken; die
  // zeitliche Begrenzung wird zusaetzlich ueber die Mitgliedschaft geprueft.
  ERSATZMITGLIED: NUR_LESEN_GREMIUM,
  JAV: ['gremium.lesen', 'sitzung.lesen', 'beschluss.lesen', 'aufgabe.lesen', 'dokument.lesen', 'bv.lesen'],
  SBV: ['gremium.lesen', 'sitzung.lesen', 'beschluss.lesen', 'vorgang.lesen', 'aufgabe.lesen', 'dokument.lesen', 'bv.lesen'],
  WIRTSCHAFTSAUSSCHUSS: ['gremium.lesen', 'sitzung.lesen', 'dokument.lesen', 'aufgabe.lesen'],
  AUFSICHTSRAT_AN: ['gremium.lesen', 'dokument.lesen'],
  // Arbeitgeberseite: ausschliesslich das Antragsportal.
  AG_PERSONAL: ['vorgang.einreichen'],
  AG_FACHBEREICH: ['vorgang.einreichen'],
  AG_ARBEITSSICHERHEIT: ['vorgang.einreichen'],
  // § 79a S. 3 BetrVG: die oder der Datenschutzbeauftragte ist gegenueber dem
  // Arbeitgeber zur Verschwiegenheit ueber Betriebsratsinformationen
  // verpflichtet. Einsicht besteht nur in das Datenschutzmodul.
  DSB: ['datenschutz.lesen', 'datenschutz.verwalten', 'audit.lesen'],
  IT_BETRIEB: ['system.verwalten'],
  AUDIT: ['audit.lesen'],
};

export type Sitzungsbenutzer = {
  id: string;
  anzeigename: string;
  email: string;
  rollen: Systemrolle[];
  personId: string | null;
};

export function rechteVon(rollen: Systemrolle[]): Set<Recht> {
  const menge = new Set<Recht>();
  for (const rolle of rollen) for (const recht of RECHTE[rolle] ?? []) menge.add(recht);
  return menge;
}

export function darf(benutzer: Sitzungsbenutzer | null, recht: Recht): boolean {
  if (!benutzer) return false;
  return rechteVon(benutzer.rollen).has(recht);
}

export function darfEines(benutzer: Sitzungsbenutzer | null, ...rechte: Recht[]): boolean {
  return rechte.some((r) => darf(benutzer, r));
}

/** Gehoert die Rolle zur Arbeitgeberseite? Steuert die Sichtbarkeit im Menue. */
export function istArbeitgeberseite(benutzer: Sitzungsbenutzer | null): boolean {
  if (!benutzer) return false;
  const agRollen: Systemrolle[] = ['AG_PERSONAL', 'AG_FACHBEREICH', 'AG_ARBEITSSICHERHEIT'];
  return benutzer.rollen.some((r) => agRollen.includes(r)) && !istGremiumsseite(benutzer);
}

export function istGremiumsseite(benutzer: Sitzungsbenutzer | null): boolean {
  if (!benutzer) return false;
  const brRollen: Systemrolle[] = [
    'BR_VORSITZ', 'BR_STELLV', 'BR_MITGLIED', 'ERSATZMITGLIED', 'JAV', 'SBV',
    'WIRTSCHAFTSAUSSCHUSS', 'AUFSICHTSRAT_AN',
  ];
  return benutzer.rollen.some((r) => brRollen.includes(r));
}

/**
 * Darf die Person ein Dokument der angegebenen Vertraulichkeitsstufe sehen?
 *
 * VERTRAULICH bildet Betriebs- und Geschaeftsgeheimnisse i. S. d. § 79 BetrVG
 * ab. PERSONENBEZOGEN kennzeichnet Unterlagen zu einzelnen Beschaeftigten,
 * bei denen der Kreis der Einsichtsberechtigten nach dem Grundsatz der
 * Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO) klein zu halten ist.
 */
export function darfVertraulichkeit(benutzer: Sitzungsbenutzer | null, stufe: Vertraulichkeit): boolean {
  if (!benutzer) return false;
  if (stufe === 'OEFFENTLICH') return true;
  if (!istGremiumsseite(benutzer)) return false;
  const kern: Systemrolle[] = ['BR_VORSITZ', 'BR_STELLV', 'BR_MITGLIED', 'ERSATZMITGLIED'];
  switch (stufe) {
    case 'INTERN_BR':
      return benutzer.rollen.some((r) => [...kern, 'JAV', 'SBV'].includes(r));
    case 'VERTRAULICH':
    case 'PERSONENBEZOGEN':
      return benutzer.rollen.some((r) => kern.includes(r) || r === 'SBV');
    default:
      return false;
  }
}

/** Liste der Stufen, die diese Person sehen darf – fuer Datenbankfilter. */
export function sichtbareStufen(benutzer: Sitzungsbenutzer | null): Vertraulichkeit[] {
  const alle: Vertraulichkeit[] = ['OEFFENTLICH', 'INTERN_BR', 'VERTRAULICH', 'PERSONENBEZOGEN'];
  return alle.filter((s) => darfVertraulichkeit(benutzer, s));
}

export const ROLLENBEZEICHNUNG: Record<Systemrolle, string> = {
  BR_VORSITZ: 'Betriebsratsvorsitz',
  BR_STELLV: 'Stellvertretender Vorsitz',
  BR_MITGLIED: 'Betriebsratsmitglied',
  ERSATZMITGLIED: 'Ersatzmitglied',
  JAV: 'Jugend- und Auszubildendenvertretung',
  SBV: 'Schwerbehindertenvertretung',
  WIRTSCHAFTSAUSSCHUSS: 'Wirtschaftsausschuss',
  AUFSICHTSRAT_AN: 'Aufsichtsrat (Arbeitnehmerseite)',
  AG_PERSONAL: 'Personalabteilung',
  AG_FACHBEREICH: 'Fuehrungskraft Fachbereich',
  AG_ARBEITSSICHERHEIT: 'Arbeitssicherheit',
  DSB: 'Datenschutzbeauftragte:r',
  IT_BETRIEB: 'IT-Betrieb (ohne Fachzugriff)',
  AUDIT: 'Revision',
};
