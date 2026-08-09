/**
 * Einordnung und Verfahrensstand von Beteiligungsvorgaengen.
 *
 * Zwei Dinge werden hier geregelt, die im Alltag auseinandergehalten werden
 * muessen und es in der Praxis oft nicht werden:
 *
 * 1. Die Gruppierung der Vorgangsarten. Anhoerungen zu Kuendigungen
 *    (§§ 102, 103 BetrVG) sind etwas anderes als Zustimmungsverfahren zu
 *    personellen Einzelmassnahmen (§ 99 BetrVG) – andere Fristen, andere
 *    Rechtsfolgen, anderer Pruefungsmassstab.
 *
 * 2. Die Wirkung der Ruege einer unvollstaendigen Unterrichtung. Sie ist bei
 *    § 99 und § 102 BetrVG grundverschieden:
 *
 *    - § 99 Abs. 1 BetrVG: Die Wochenfrist des § 99 Abs. 3 S. 1 BetrVG laeuft
 *      erst ab vollstaendiger Unterrichtung. Ruegt der Betriebsrat rechtzeitig,
 *      ist die Frist nicht in Lauf gesetzt – die Zustimmungsfiktion tritt nicht
 *      ein. Die Ruege haelt die Frist also an.
 *
 *    - § 102 Abs. 1 BetrVG: Die Wochenfrist des § 102 Abs. 2 S. 1 BetrVG laeuft
 *      trotzdem weiter. Eine unvollstaendige Anhoerung fuehrt nach
 *      § 102 Abs. 1 S. 3 BetrVG zur Unwirksamkeit der Kuendigung, entbindet den
 *      Betriebsrat aber nicht davon, fristgerecht Stellung zu nehmen. Wer hier
 *      auf das Anhalten der Frist vertraut, verliert den Widerspruch nach
 *      § 102 Abs. 3 BetrVG.
 */

export type Vorgangsgruppe = 'ANHOERUNG' | 'ZUSTIMMUNG' | 'SOZIAL' | 'WIRTSCHAFTLICH' | 'SONSTIGES';

export type Gruppenbeschreibung = {
  schluessel: Vorgangsgruppe;
  bezeichnung: string;
  norm: string;
  erlaeuterung: string;
};

export const VORGANGSGRUPPEN: readonly Gruppenbeschreibung[] = [
  {
    schluessel: 'ANHOERUNG',
    bezeichnung: 'Anhörungen zu Kündigungen',
    norm: '§§ 102, 103 BetrVG',
    erlaeuterung:
      'Vor jeder Kündigung ist der Betriebsrat zu hören. Eine ohne Anhörung ausgesprochene ' +
      'Kündigung ist nach § 102 Abs. 1 S. 3 BetrVG unwirksam.',
  },
  {
    schluessel: 'ZUSTIMMUNG',
    bezeichnung: 'Personelle Einzelmaßnahmen',
    norm: '§§ 99, 100 BetrVG',
    erlaeuterung:
      'Einstellung, Versetzung, Ein- und Umgruppierung. Bei Fristablauf gilt die Zustimmung ' +
      'nach § 99 Abs. 3 S. 2 BetrVG als erteilt.',
  },
  {
    schluessel: 'SOZIAL',
    bezeichnung: 'Soziale und personelle Angelegenheiten',
    norm: '§§ 87, 90–98 BetrVG',
    erlaeuterung:
      'Erzwingbare Mitbestimmung in sozialen Angelegenheiten sowie Arbeitsplatzgestaltung, ' +
      'Personalplanung, Ausschreibung, Auswahlrichtlinien und Berufsbildung.',
  },
  {
    schluessel: 'WIRTSCHAFTLICH',
    bezeichnung: 'Wirtschaftliche Angelegenheiten',
    norm: '§§ 106, 111 BetrVG',
    erlaeuterung: 'Unterrichtung des Wirtschaftsausschusses und Betriebsänderungen.',
  },
  {
    schluessel: 'SONSTIGES',
    bezeichnung: 'Sonstige Vorgänge',
    norm: '§§ 80, 85 BetrVG',
    erlaeuterung: 'Auskunftsverlangen, Beschwerden und Einzelfälle ohne eigene Gruppe.',
  },
];

/** Ordnet einen Vorgangstyp seiner Gruppe zu. */
export function gruppeVon(typ: string): Vorgangsgruppe {
  switch (typ) {
    case 'KUENDIGUNG_ORDENTLICH_102':
    case 'KUENDIGUNG_AUSSERORDENTLICH_102':
    case 'KUENDIGUNG_BR_MITGLIED_103':
      return 'ANHOERUNG';
    case 'EINSTELLUNG_99':
    case 'VERSETZUNG_99':
    case 'EINGRUPPIERUNG_99':
    case 'VORLAEUFIGE_MASSNAHME_100':
      return 'ZUSTIMMUNG';
    case 'MITBESTIMMUNG_87':
    case 'PERSONALPLANUNG_92':
    case 'AUSSCHREIBUNG_93':
    case 'AUSWAHLRICHTLINIE_95':
    case 'ARBEITSPLATZGESTALTUNG_90_91':
    case 'BERUFSBILDUNG_96_98':
      return 'SOZIAL';
    case 'WIRTSCHAFTSAUSSCHUSS_106':
    case 'BETRIEBSAENDERUNG_111':
      return 'WIRTSCHAFTLICH';
    default:
      return 'SONSTIGES';
  }
}

/** Alle Vorgangstypen einer Gruppe – fuer Datenbankfilter. */
export function typenDerGruppe(gruppe: Vorgangsgruppe, alleTypen: readonly string[]): string[] {
  return alleTypen.filter((t) => gruppeVon(t) === gruppe);
}

// ---------------------------------------------------------------------------
// Wirkung der Ruege einer unvollstaendigen Unterrichtung
// ---------------------------------------------------------------------------

export type Ruegewirkung = {
  /** Haelt die Ruege den Fristlauf an? */
  haeltFristAn: boolean;
  norm: string;
  wirkung: string;
  warnung?: string;
};

export function ruegewirkung(typ: string): Ruegewirkung | null {
  const gruppe = gruppeVon(typ);

  if (gruppe === 'ZUSTIMMUNG' && typ !== 'VORLAEUFIGE_MASSNAHME_100') {
    return {
      haeltFristAn: true,
      norm: '§ 99 Abs. 1 S. 1, 2 BetrVG',
      wirkung:
        'Die Wochenfrist des § 99 Abs. 3 S. 1 BetrVG läuft erst ab vollständiger Unterrichtung. ' +
        'Mit der Rüge ist sie nicht in Lauf gesetzt; die Zustimmungsfiktion tritt nicht ein. ' +
        'Sie beginnt neu, sobald der Arbeitgeber die fehlenden Angaben nachreicht.',
    };
  }

  if (gruppe === 'ANHOERUNG') {
    return {
      haeltFristAn: false,
      norm: '§ 102 Abs. 1 BetrVG',
      wirkung:
        'Die Rüge wird dokumentiert. Eine unvollständige Anhörung führt nach § 102 Abs. 1 S. 3 ' +
        'BetrVG zur Unwirksamkeit der Kündigung – das ist im Kündigungsschutzprozess der ' +
        'entscheidende Punkt, und die Dokumentation dient dort als Nachweis.',
      warnung:
        'Anders als bei § 99 BetrVG hält die Rüge die Frist NICHT an. Die Wochenfrist des ' +
        '§ 102 Abs. 2 S. 1 BetrVG läuft weiter. Der Betriebsrat muss trotz der Rüge fristgerecht ' +
        'Stellung nehmen – sonst gilt sein Schweigen nach § 102 Abs. 2 S. 2 BetrVG als Zustimmung ' +
        'und der Widerspruch nach § 102 Abs. 3 BetrVG ist verloren.',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Verfahrensstand
// ---------------------------------------------------------------------------

export type Schrittstatus = 'ERLEDIGT' | 'OFFEN' | 'ENTFAELLT' | 'WARNUNG';

export type Verfahrensschritt = {
  bezeichnung: string;
  norm?: string;
  status: Schrittstatus;
  vermerk: string;
};

export type Verfahrensdaten = {
  typ: string;
  eingegangenAm: Date;
  unterrichtungGeruegtAm: Date | null;
  unterrichtungVervollstaendigtAm: Date | null;
  aufTagesordnung: boolean;
  beschlussGefasst: boolean;
  antwortAm: Date | null;
  antwortZugangAm: Date | null;
  fristBis: Date | null;
};

function alsDatum(d: Date | null): string {
  return d ? new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short' }).format(d) : '';
}

/**
 * Bildet den Ablauf eines Beteiligungsverfahrens als Schrittfolge ab.
 *
 * Der Nutzen liegt weniger in der Anzeige als in der Reihenfolge: Wer die
 * Vollstaendigkeit erst nach der Beschlussfassung prueft, hat die Gelegenheit
 * zur Ruege in der Regel verpasst.
 */
export function verfahrensstand(d: Verfahrensdaten): Verfahrensschritt[] {
  const gruppe = gruppeVon(d.typ);
  const wirkung = ruegewirkung(d.typ);
  const schritte: Verfahrensschritt[] = [];

  schritte.push({
    bezeichnung: 'Unterrichtung eingegangen',
    norm: gruppe === 'ANHOERUNG' ? '§ 102 Abs. 1 BetrVG' : gruppe === 'ZUSTIMMUNG' ? '§ 99 Abs. 1 BetrVG' : undefined,
    status: 'ERLEDIGT',
    vermerk: `Eingang am ${alsDatum(d.eingegangenAm)}.`,
  });

  // Schritt 2 nur dort, wo die Vollstaendigkeit rechtlich eine Rolle spielt.
  if (wirkung) {
    if (d.unterrichtungVervollstaendigtAm) {
      schritte.push({
        bezeichnung: 'Vollständigkeit der Unterrichtung',
        norm: wirkung.norm,
        status: 'ERLEDIGT',
        vermerk:
          `Als unvollständig gerügt am ${alsDatum(d.unterrichtungGeruegtAm)}, ` +
          `nachgereicht am ${alsDatum(d.unterrichtungVervollstaendigtAm)}.` +
          (wirkung.haeltFristAn ? ' Die Frist läuft ab der Nachreichung neu.' : ''),
      });
    } else if (d.unterrichtungGeruegtAm) {
      schritte.push({
        bezeichnung: 'Vollständigkeit der Unterrichtung',
        norm: wirkung.norm,
        status: wirkung.haeltFristAn ? 'ERLEDIGT' : 'WARNUNG',
        vermerk:
          `Als unvollständig gerügt am ${alsDatum(d.unterrichtungGeruegtAm)}. ` +
          (wirkung.haeltFristAn
            ? 'Die Frist ist bis zur Nachreichung angehalten.'
            : 'Die Frist läuft gleichwohl weiter – fristgerecht Stellung nehmen.'),
      });
    } else {
      schritte.push({
        bezeichnung: 'Vollständigkeit der Unterrichtung prüfen',
        norm: wirkung.norm,
        status: 'OFFEN',
        vermerk:
          gruppe === 'ANHOERUNG'
            ? 'Sind die Kündigungsgründe und die Sozialdaten vollständig mitgeteilt? Fehlt etwas, ' +
              'ist die Anhörung fehlerhaft und die Kündigung unwirksam.'
            : 'Fehlen Angaben oder Unterlagen, ist das unverzüglich zu rügen – die Frist läuft dann nicht an.',
      });
    }
  }

  schritte.push({
    bezeichnung: 'Beratung und Beschlussfassung',
    norm: '§ 33 BetrVG',
    status: d.beschlussGefasst ? 'ERLEDIGT' : d.aufTagesordnung ? 'OFFEN' : 'OFFEN',
    vermerk: d.beschlussGefasst
      ? 'Der Betriebsrat hat einen Beschluss gefasst.'
      : d.aufTagesordnung
        ? 'Der Vorgang steht auf der Tagesordnung, ein Beschluss liegt noch nicht vor.'
        : 'Der Vorgang ist noch keiner Sitzung zugeordnet. Eine Stellungnahme ohne Beschluss ' +
          'des Gremiums bindet den Betriebsrat nicht.',
  });

  schritte.push({
    bezeichnung: 'Stellungnahme erfasst',
    status: d.antwortAm ? 'ERLEDIGT' : 'OFFEN',
    vermerk: d.antwortAm
      ? `Am ${alsDatum(d.antwortAm)} erfasst.`
      : 'Die Stellungnahme ist noch nicht erfasst.',
  });

  schritte.push({
    bezeichnung: 'Zugang beim Arbeitgeber',
    norm: gruppe === 'ANHOERUNG' ? '§ 102 Abs. 2 BetrVG' : undefined,
    status: d.antwortZugangAm ? 'ERLEDIGT' : d.antwortAm ? 'WARNUNG' : 'OFFEN',
    vermerk: d.antwortZugangAm
      ? `Zugegangen am ${alsDatum(d.antwortZugangAm)}.`
      : 'Für die Fristwahrung kommt es auf den Zugang an, nicht auf die Absendung. ' +
        'Der Zugang ist zu dokumentieren.',
  });

  return schritte;
}
