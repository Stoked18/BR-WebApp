/**
 * Betriebseinstellungen.
 *
 * Bewusst als schmaler, benannter Katalog statt als freier Schluessel-Wert-
 * Speicher: jede Einstellung greift in einen Rechtsablauf ein (Ladungsfrist,
 * Einwendungsfrist gegen die Niederschrift), deshalb ist der zulaessige
 * Wertebereich hier festgelegt und wird beim Speichern geprueft. Was der
 * Betriebsrat in seiner Geschaeftsordnung nach § 36 BetrVG regelt, bildet
 * diese Seite ab – sie ersetzt die Geschaeftsordnung nicht.
 */

export type Einstellungsart = 'zahl' | 'schalter';

export type Einstellungsdefinition = {
  schluessel: string;
  bezeichnung: string;
  beschreibung: string;
  art: Einstellungsart;
  vorgabe: string;
  /** nur bei art === 'zahl' */
  min?: number;
  max?: number;
  norm?: string;
};

export const EINSTELLUNGEN: Einstellungsdefinition[] = [
  {
    schluessel: 'betrieb.testbetrieb',
    bezeichnung: 'Testbetrieb',
    beschreibung:
      'Blendet in der gesamten Anwendung einen Hinweisbalken ein. Solange er steht, gilt der ' +
      'Bestand als Erprobung: Fristen und Beschlüsse in diesem System entfalten keine Wirkung ' +
      'nach außen, maßgeblich bleiben die Papierakte und die Beschlusssammlung nach § 34 Abs. 2 BetrVG.',
    art: 'schalter',
    vorgabe: 'nein',
  },
  {
    schluessel: 'ladungsfrist.tage',
    bezeichnung: 'Ladungsfrist (Tage)',
    beschreibung:
      'Vorlauf zwischen Einladung und Sitzung. Das Gesetz nennt keine Tageszahl, sondern verlangt ' +
      'eine rechtzeitige Ladung unter Mitteilung der Tagesordnung. Was rechtzeitig ist, legt die ' +
      'Geschäftsordnung fest; üblich sind drei bis sieben Tage. Bei Eilbedürftigkeit kann kürzer ' +
      'geladen werden, wenn alle Mitglieder erscheinen und niemand widerspricht.',
    art: 'zahl',
    vorgabe: '7',
    min: 1,
    max: 21,
    norm: '§ 29 Abs. 2 S. 3 BetrVG',
  },
  {
    schluessel: 'einspruchsfrist.niederschrift.wochen',
    bezeichnung: 'Einwendungsfrist Niederschrift (Wochen)',
    beschreibung:
      'Zeitraum, in dem Mitglieder einer Niederschrift widersprechen können. Das Gesetz regelt nur, ' +
      'dass Einwendungen der Niederschrift beizufügen sind; die Frist selbst folgt aus der ' +
      'Geschäftsordnung.',
    art: 'zahl',
    vorgabe: '2',
    min: 1,
    max: 8,
    norm: '§ 34 Abs. 1 S. 2, 3 BetrVG',
  },
];

export function definition(schluessel: string): Einstellungsdefinition | undefined {
  return EINSTELLUNGEN.find((e) => e.schluessel === schluessel);
}

export type Pruefergebnis = { gueltig: true; wert: string } | { gueltig: false; fehler: string };

/** Prueft und normalisiert einen Wert gegen seine Definition. */
export function pruefeWert(schluessel: string, roh: string): Pruefergebnis {
  const def = definition(schluessel);
  if (!def) return { gueltig: false, fehler: `Unbekannte Einstellung "${schluessel}".` };

  if (def.art === 'schalter') {
    const ja = ['ja', 'true', 'on', '1'].includes(roh.trim().toLowerCase());
    return { gueltig: true, wert: ja ? 'ja' : 'nein' };
  }

  const zahl = Number(roh.trim());
  if (!Number.isInteger(zahl)) {
    return { gueltig: false, fehler: `${def.bezeichnung}: bitte eine ganze Zahl angeben.` };
  }
  if (def.min !== undefined && zahl < def.min) {
    return { gueltig: false, fehler: `${def.bezeichnung}: mindestens ${def.min}.` };
  }
  if (def.max !== undefined && zahl > def.max) {
    return { gueltig: false, fehler: `${def.bezeichnung}: höchstens ${def.max}.` };
  }
  return { gueltig: true, wert: String(zahl) };
}

/** Legt die gespeicherten Werte ueber die Vorgaben. */
export function mitVorgaben(gespeichert: Array<{ schluessel: string; wert: string }>): Record<string, string> {
  const karte: Record<string, string> = {};
  for (const def of EINSTELLUNGEN) karte[def.schluessel] = def.vorgabe;
  for (const e of gespeichert) if (e.schluessel in karte) karte[e.schluessel] = e.wert;
  return karte;
}

export function istAn(werte: Record<string, string>, schluessel: string): boolean {
  return werte[schluessel] === 'ja';
}
