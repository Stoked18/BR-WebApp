/**
 * Fristberechnung fuer betriebsverfassungsrechtliche Vorgaenge.
 *
 * Rechtlicher Rahmen:
 *  - § 187 Abs. 1 BGB  Ereignisfrist: der Tag des Ereignisses (Zugang der
 *                      Unterrichtung) wird nicht mitgerechnet.
 *  - § 188 Abs. 1 BGB  Tagesfrist endet mit Ablauf des letzten Tages.
 *  - § 188 Abs. 2 BGB  Wochen-/Monatsfrist endet mit Ablauf des Tages, der
 *                      durch Benennung oder Zahl dem Ereignistag entspricht.
 *  - § 188 Abs. 3 BGB  fehlt dieser Tag im Monat, endet die Frist am Monatsletzten.
 *  - § 193 BGB         faellt das Ende auf Sonnabend, Sonntag oder gesetzlichen
 *                      Feiertag, tritt der naechste Werktag an seine Stelle.
 *
 * Jede Berechnung liefert eine lesbare Herleitung mit, die im Vorgang
 * gespeichert wird. Im Streitfall muss nachvollziehbar sein, warum der
 * Betriebsrat eine Frist als gewahrt oder versaeumt angesehen hat.
 */

import {
  type Kalendertag,
  feiertagName,
  istWerktag,
  isoAlsTag,
  naechsterWerktag,
  plusTage,
  tagAlsIso,
  vergleiche,
  wochentag,
} from './feiertage';

export type Fristeinheit = 'TAGE' | 'WOCHEN' | 'MONATE' | 'WERKTAGE';

export type Fristberechnung = {
  /** Tag des fristausloesenden Ereignisses (z. B. Zugang der Unterrichtung). */
  ereignistag: Kalendertag;
  /** Erster Tag der Frist, § 187 Abs. 1 BGB. */
  beginn: Kalendertag;
  /** Rechnerisches Ende vor Anwendung des § 193 BGB. */
  endeRechnerisch: Kalendertag;
  /** Massgebliches Fristende nach § 193 BGB. */
  ende: Kalendertag;
  /** Wurde das Ende nach § 193 BGB verschoben? */
  verschobenNach193: boolean;
  /** Zeitpunkt des Fristablaufs (24:00 Uhr Ortszeit des Fristendes). */
  ablauf: Date;
  /** Nachvollziehbare Herleitung fuer die Akte. */
  herleitung: string;
};

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Sonnabend'];

function formatiere(t: Kalendertag): string {
  return `${WOCHENTAG_KURZ(t)}, ${String(t.tag).padStart(2, '0')}.${String(t.monat).padStart(2, '0')}.${t.jahr}`;
}

function WOCHENTAG_KURZ(t: Kalendertag): string {
  return WOCHENTAGE[wochentag(t)];
}

/** Zeitzonenversatz von Europe/Berlin in Minuten fuer den angegebenen Zeitpunkt. */
function berlinVersatzMinuten(utcMs: number): number {
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(utcMs));
  const name = teile.find((t) => t.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const treffer = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!treffer) return 0;
  const vorzeichen = treffer[1] === '-' ? -1 : 1;
  return vorzeichen * (Number(treffer[2]) * 60 + Number(treffer[3]));
}

/**
 * Zeitpunkt des Fristablaufs: 24:00 Uhr deutscher Ortszeit des Fristendes,
 * technisch abgebildet als 23:59:59.999.
 */
export function ablaufZeitpunkt(t: Kalendertag): Date {
  const mittags = Date.UTC(t.jahr, t.monat - 1, t.tag, 12, 0, 0);
  const versatz = berlinVersatzMinuten(mittags);
  return new Date(Date.UTC(t.jahr, t.monat - 1, t.tag, 23, 59, 59, 999) - versatz * 60_000);
}

/** Wandelt einen Zeitpunkt in den zugehoerigen Kalendertag deutscher Ortszeit. */
export function alsKalendertag(d: Date): Kalendertag {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return isoAlsTag(teile);
}

/** Monatsfrist nach § 188 Abs. 2, 3 BGB. */
function plusMonate(t: Kalendertag, n: number): { ergebnis: Kalendertag; gekuerzt: boolean } {
  const gesamt = (t.monat - 1) + n;
  const jahr = t.jahr + Math.floor(gesamt / 12);
  const monat = (gesamt % 12 + 12) % 12 + 1;
  const letzterTag = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const gekuerzt = t.tag > letzterTag;
  return { ergebnis: { jahr, monat, tag: Math.min(t.tag, letzterTag) }, gekuerzt };
}

/**
 * Berechnet eine Ereignisfrist.
 *
 * @param ereignistag Tag des Zugangs bzw. der Kenntnisnahme
 * @param dauer       Anzahl der Zeiteinheiten
 * @param einheit     Tage, Wochen, Monate oder Werktage
 * @param land        Bundesland fuer die Feiertagspruefung (Vorgabe NRW)
 * @param param193    § 193 BGB anwenden (Vorgabe ja)
 */
export function berechneFrist(
  ereignistag: Kalendertag,
  dauer: number,
  einheit: Fristeinheit,
  land = 'NW',
  param193 = true,
): Fristberechnung {
  if (dauer <= 0) throw new Error('Die Fristdauer muss groesser als null sein.');

  // § 187 Abs. 1 BGB – der Ereignistag zaehlt nicht mit.
  const beginn = plusTage(ereignistag, 1);

  const schritte: string[] = [];
  schritte.push(
    `Fristausloesendes Ereignis am ${formatiere(ereignistag)}. ` +
      `Nach § 187 Abs. 1 BGB wird dieser Tag nicht mitgerechnet; die Frist beginnt am ${formatiere(beginn)}.`,
  );

  let endeRechnerisch: Kalendertag;

  switch (einheit) {
    case 'TAGE': {
      // § 188 Abs. 1 BGB
      endeRechnerisch = plusTage(ereignistag, dauer);
      schritte.push(
        `Frist von ${dauer} Kalendertagen; sie endet nach § 188 Abs. 1 BGB mit Ablauf des ${formatiere(endeRechnerisch)}.`,
      );
      break;
    }
    case 'WOCHEN': {
      // § 188 Abs. 2 BGB – gleicher Wochentag wie der Ereignistag
      endeRechnerisch = plusTage(ereignistag, dauer * 7);
      schritte.push(
        `Frist von ${dauer} Woche(n); sie endet nach § 188 Abs. 2 BGB mit Ablauf des Tages der letzten Woche, ` +
          `der dem Ereignistag durch seine Benennung entspricht – also ${formatiere(endeRechnerisch)}.`,
      );
      break;
    }
    case 'MONATE': {
      const { ergebnis, gekuerzt } = plusMonate(ereignistag, dauer);
      endeRechnerisch = ergebnis;
      schritte.push(
        `Frist von ${dauer} Monat(en); sie endet nach § 188 Abs. 2 BGB mit Ablauf des ${formatiere(endeRechnerisch)}.` +
          (gekuerzt
            ? ' Da der entsprechende Tag im Zielmonat fehlt, tritt nach § 188 Abs. 3 BGB der letzte Tag des Monats an seine Stelle.'
            : ''),
      );
      break;
    }
    case 'WERKTAGE': {
      // Reine Werktagsfrist (kommt im BetrVG nicht vor, aber in Geschaeftsordnungen
      // und Betriebsvereinbarungen). Gezaehlt werden Werktage i. S. d. § 193 BGB.
      let k = beginn;
      let gezaehlt = 0;
      while (gezaehlt < dauer) {
        if (istWerktag(k, land)) gezaehlt++;
        if (gezaehlt < dauer) k = plusTage(k, 1);
      }
      endeRechnerisch = k;
      schritte.push(
        `Frist von ${dauer} Werktagen (ohne Sonnabende, Sonntage und gesetzliche Feiertage in ${land}); ` +
          `sie endet mit Ablauf des ${formatiere(endeRechnerisch)}.`,
      );
      break;
    }
  }

  // § 193 BGB – Verlegung auf den naechsten Werktag
  let ende = endeRechnerisch;
  let verschoben = false;
  if (param193 && einheit !== 'WERKTAGE' && !istWerktag(endeRechnerisch, land)) {
    ende = naechsterWerktag(endeRechnerisch, land);
    verschoben = true;
    const grund = feiertagName(endeRechnerisch, land)
      ? `ein gesetzlicher Feiertag in ${land} (${feiertagName(endeRechnerisch, land)})`
      : `ein ${WOCHENTAG_KURZ(endeRechnerisch)}`;
    schritte.push(
      `Das rechnerische Fristende ist ${grund}. Nach § 193 BGB tritt an seine Stelle der naechste Werktag: ` +
        `${formatiere(ende)}.`,
    );
  }

  schritte.push(`Die Frist laeuft ab mit Ablauf des ${formatiere(ende)} (24:00 Uhr).`);

  return {
    ereignistag,
    beginn,
    endeRechnerisch,
    ende,
    verschobenNach193: verschoben,
    ablauf: ablaufZeitpunkt(ende),
    herleitung: schritte.join(' '),
  };
}

// ---------------------------------------------------------------------------
// Katalog der Fristen des BetrVG und angrenzender Vorschriften
// ---------------------------------------------------------------------------

export type Fristvorlage = {
  schluessel: string;
  bezeichnung: string;
  grundlage: string;
  dauer: number;
  einheit: Fristeinheit;
  /** Tritt bei Fristablauf eine Fiktion oder Praeklusion ein? */
  folgeBeiAblauf?: string;
  /** Rechtsfolge ist gesetzlich geregelt (true) oder nur Praxis/Geschaeftsordnung (false). */
  gesetzlich: boolean;
  hinweis?: string;
};

export const FRISTVORLAGEN: Record<string, Fristvorlage> = {
  ZUSTIMMUNG_99: {
    schluessel: 'ZUSTIMMUNG_99',
    bezeichnung: 'Zustimmungsverweigerung bei personeller Einzelmassnahme',
    grundlage: '§ 99 Abs. 3 S. 1 BetrVG',
    dauer: 1,
    einheit: 'WOCHEN',
    gesetzlich: true,
    folgeBeiAblauf:
      'Die Zustimmung gilt nach § 99 Abs. 3 S. 2 BetrVG als erteilt. Die Verweigerung muss dem ' +
      'Arbeitgeber innerhalb der Frist schriftlich und unter Angabe von Gruenden aus dem Katalog ' +
      'des § 99 Abs. 2 BetrVG zugehen.',
    hinweis:
      'Die Frist laeuft erst ab vollstaendiger Unterrichtung. Fehlen erforderliche Angaben oder ' +
      'Unterlagen (§ 99 Abs. 1 S. 1, 2 BetrVG), wird die Frist nicht in Gang gesetzt.',
  },
  ANHOERUNG_102_ORDENTLICH: {
    schluessel: 'ANHOERUNG_102_ORDENTLICH',
    bezeichnung: 'Bedenken gegen eine ordentliche Kuendigung',
    grundlage: '§ 102 Abs. 2 S. 1 BetrVG',
    dauer: 1,
    einheit: 'WOCHEN',
    gesetzlich: true,
    folgeBeiAblauf:
      'Schweigen gilt nach § 102 Abs. 2 S. 2 BetrVG als Zustimmung. Ein Widerspruch nach ' +
      '§ 102 Abs. 3 BetrVG (Weiterbeschaeftigungsanspruch, § 102 Abs. 5 BetrVG) ist danach nicht mehr moeglich.',
  },
  ANHOERUNG_102_AUSSERORDENTLICH: {
    schluessel: 'ANHOERUNG_102_AUSSERORDENTLICH',
    bezeichnung: 'Bedenken gegen eine ausserordentliche Kuendigung',
    grundlage: '§ 102 Abs. 2 S. 3 BetrVG',
    dauer: 3,
    einheit: 'TAGE',
    gesetzlich: true,
    folgeBeiAblauf: 'Schweigen gilt als abschliessende Stellungnahme; die Kuendigung kann ausgesprochen werden.',
    hinweis:
      'Die Stellungnahme hat unverzueglich zu erfolgen, spaetestens innerhalb von drei Tagen. ' +
      'Ob § 193 BGB anwendbar ist, ist umstritten – die Anwendung hier ist die fuer den Betriebsrat ' +
      'guenstigere Auslegung. Im Zweifel sollte fristwahrend vor dem Wochenende geantwortet werden.',
  },
  ZUSTIMMUNG_103: {
    schluessel: 'ZUSTIMMUNG_103',
    bezeichnung: 'Zustimmung zur ausserordentlichen Kuendigung eines Mandatstraegers',
    grundlage: '§ 103 Abs. 1 BetrVG',
    dauer: 3,
    einheit: 'TAGE',
    gesetzlich: false,
    folgeBeiAblauf:
      'Keine gesetzliche Fiktion. Verweigert der Betriebsrat die Zustimmung oder schweigt er, ' +
      'muss der Arbeitgeber sie nach § 103 Abs. 2 BetrVG beim Arbeitsgericht ersetzen lassen.',
    hinweis:
      '§ 103 BetrVG enthaelt keine eigene Frist. Die drei Tage sind eine Praxisvorgabe in Anlehnung ' +
      'an § 102 Abs. 2 S. 3 BetrVG und wegen der Zwei-Wochen-Frist des § 626 Abs. 2 BGB beim Arbeitgeber. ' +
      'Ein Fristablauf begruendet hier keine Zustimmungsfiktion.',
  },
  VORLAEUFIGE_MASSNAHME_100: {
    schluessel: 'VORLAEUFIGE_MASSNAHME_100',
    bezeichnung: 'Bestreiten der dringenden Erforderlichkeit einer vorlaeufigen Massnahme',
    grundlage: '§ 100 Abs. 2 S. 3 BetrVG',
    dauer: 3,
    einheit: 'TAGE',
    gesetzlich: true,
    folgeBeiAblauf:
      'Bestreitet der Betriebsrat nicht fristgerecht, darf die vorlaeufige Massnahme aufrechterhalten werden.',
  },
  EINSPRUCH_NIEDERSCHRIFT: {
    schluessel: 'EINSPRUCH_NIEDERSCHRIFT',
    bezeichnung: 'Einwendungen gegen die Sitzungsniederschrift',
    grundlage: '§ 34 Abs. 1 BetrVG i.V.m. der Geschaeftsordnung',
    dauer: 2,
    einheit: 'WOCHEN',
    gesetzlich: false,
    hinweis:
      'Das BetrVG kennt keine gesetzliche Einspruchsfrist. Die Zwei-Wochen-Frist ergibt sich aus der ' +
      'Geschaeftsordnung nach § 36 BetrVG und ist dort anzupassen.',
  },
  LADUNGSFRIST: {
    schluessel: 'LADUNGSFRIST',
    bezeichnung: 'Ladungsfrist zur Betriebsratssitzung',
    grundlage: '§ 29 Abs. 2 S. 3 BetrVG i.V.m. der Geschaeftsordnung',
    dauer: 7,
    einheit: 'TAGE',
    gesetzlich: false,
    hinweis:
      '§ 29 Abs. 2 S. 3 BetrVG verlangt die rechtzeitige Ladung unter Mitteilung der Tagesordnung, ' +
      'nennt aber keine Tageszahl. Die konkrete Frist regelt die Geschaeftsordnung. Bei ' +
      'Schichtbetrieb ist die Ladung so zu bemessen, dass auch Nacht- und Wochenendschichten erreicht werden.',
  },
  AUSKUNFT_DSGVO: {
    schluessel: 'AUSKUNFT_DSGVO',
    bezeichnung: 'Beantwortung eines Betroffenenantrags',
    grundlage: 'Art. 12 Abs. 3 DSGVO',
    dauer: 1,
    einheit: 'MONATE',
    gesetzlich: true,
    folgeBeiAblauf:
      'Verstoss gegen Art. 12 Abs. 3 DSGVO. Eine Verlaengerung um zwei weitere Monate ist nur ' +
      'bei Komplexitaet und nach Unterrichtung der betroffenen Person zulaessig.',
  },
  KUENDIGUNG_BV: {
    schluessel: 'KUENDIGUNG_BV',
    bezeichnung: 'Kuendigung einer Betriebsvereinbarung',
    grundlage: '§ 77 Abs. 5 BetrVG',
    dauer: 3,
    einheit: 'MONATE',
    gesetzlich: true,
    folgeBeiAblauf:
      'Nach Ablauf endet die Betriebsvereinbarung. Bei erzwingbarer Mitbestimmung wirkt sie ' +
      'nach § 77 Abs. 6 BetrVG bis zu einer anderen Abmachung nach.',
    hinweis: 'Die Frist gilt nur, soweit nichts anderes vereinbart ist.',
  },
  WIDERSPRUCH_KUENDIGUNG_ARBEITNEHMER: {
    schluessel: 'WIDERSPRUCH_KUENDIGUNG_ARBEITNEHMER',
    bezeichnung: 'Kuendigungsschutzklage der betroffenen Beschaeftigten',
    grundlage: '§ 4 S. 1 KSchG',
    dauer: 3,
    einheit: 'WOCHEN',
    gesetzlich: true,
    folgeBeiAblauf: 'Die Kuendigung gilt nach § 7 KSchG als von Anfang an rechtswirksam.',
    hinweis:
      'Frist der beschaeftigten Person, nicht des Betriebsrats. Sie wird mitgefuehrt, damit die ' +
      'Beratung in der Sprechstunde rechtzeitig erfolgt.',
  },
};

/** Berechnet eine Frist anhand einer Vorlage aus dem Katalog. */
export function berechneNachVorlage(
  schluessel: keyof typeof FRISTVORLAGEN,
  ereignistag: Kalendertag,
  land = 'NW',
): Fristberechnung & { vorlage: Fristvorlage } {
  const vorlage = FRISTVORLAGEN[schluessel];
  if (!vorlage) throw new Error(`Unbekannte Fristvorlage: ${schluessel}`);
  const ergebnis = berechneFrist(ereignistag, vorlage.dauer, vorlage.einheit, land);
  return {
    ...ergebnis,
    vorlage,
    herleitung: `${vorlage.bezeichnung} nach ${vorlage.grundlage}. ${ergebnis.herleitung}` +
      (vorlage.folgeBeiAblauf ? ` Rechtsfolge bei Fristablauf: ${vorlage.folgeBeiAblauf}` : '') +
      (vorlage.hinweis ? ` Hinweis: ${vorlage.hinweis}` : ''),
  };
}

/** Ordnet einem Vorgangstyp die passende Fristvorlage zu. */
export function vorlageFuerVorgangstyp(typ: string): Fristvorlage | null {
  switch (typ) {
    case 'EINSTELLUNG_99':
    case 'VERSETZUNG_99':
    case 'EINGRUPPIERUNG_99':
      return FRISTVORLAGEN.ZUSTIMMUNG_99;
    case 'KUENDIGUNG_ORDENTLICH_102':
      return FRISTVORLAGEN.ANHOERUNG_102_ORDENTLICH;
    case 'KUENDIGUNG_AUSSERORDENTLICH_102':
      return FRISTVORLAGEN.ANHOERUNG_102_AUSSERORDENTLICH;
    case 'KUENDIGUNG_BR_MITGLIED_103':
      return FRISTVORLAGEN.ZUSTIMMUNG_103;
    case 'VORLAEUFIGE_MASSNAHME_100':
      return FRISTVORLAGEN.VORLAEUFIGE_MASSNAHME_100;
    default:
      return null;
  }
}

export type Fristampel = 'ABGELAUFEN' | 'KRITISCH' | 'WARNUNG' | 'OFFEN' | 'KEINE_FRIST';

/**
 * Bewertet den Fristenstand. Die Schwellen sind bewusst eng, weil bei
 * § 99 und § 102 BetrVG der Fristablauf materiell praekludiert.
 */
export function fristampel(ende: Date | null | undefined, jetzt = new Date()): Fristampel {
  if (!ende) return 'KEINE_FRIST';
  const stunden = (ende.getTime() - jetzt.getTime()) / 3_600_000;
  if (stunden < 0) return 'ABGELAUFEN';
  if (stunden <= 24) return 'KRITISCH';
  if (stunden <= 72) return 'WARNUNG';
  return 'OFFEN';
}

/** Verbleibende volle Tage bis zum Fristablauf (negativ nach Ablauf). */
export function verbleibendeTage(ende: Date, jetzt = new Date()): number {
  const a = alsKalendertag(jetzt);
  const b = alsKalendertag(ende);
  return Math.round((Date.UTC(b.jahr, b.monat - 1, b.tag) - Date.UTC(a.jahr, a.monat - 1, a.tag)) / 86_400_000);
}

export { tagAlsIso, isoAlsTag, vergleiche };
