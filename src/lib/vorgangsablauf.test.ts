import { describe, expect, it } from 'vitest';
import {
  VORGANGSGRUPPEN,
  gruppeVon,
  ruegewirkung,
  typenDerGruppe,
  verfahrensstand,
  type Verfahrensdaten,
} from './vorgangsablauf';

describe('Gruppierung der Vorgangsarten', () => {
  it('ordnet Kuendigungsanhoerungen der Anhoerungsgruppe zu', () => {
    expect(gruppeVon('KUENDIGUNG_ORDENTLICH_102')).toBe('ANHOERUNG');
    expect(gruppeVon('KUENDIGUNG_AUSSERORDENTLICH_102')).toBe('ANHOERUNG');
    expect(gruppeVon('KUENDIGUNG_BR_MITGLIED_103')).toBe('ANHOERUNG');
  });

  it('trennt personelle Einzelmassnahmen von Anhoerungen', () => {
    // Der haeufigste Irrtum im Alltag: § 99 und § 102 sind verschiedene
    // Verfahren mit verschiedenen Rechtsfolgen.
    expect(gruppeVon('EINSTELLUNG_99')).toBe('ZUSTIMMUNG');
    expect(gruppeVon('VERSETZUNG_99')).toBe('ZUSTIMMUNG');
    expect(gruppeVon('EINGRUPPIERUNG_99')).toBe('ZUSTIMMUNG');
    expect(gruppeVon('VORLAEUFIGE_MASSNAHME_100')).toBe('ZUSTIMMUNG');
  });

  it('ordnet soziale und wirtschaftliche Angelegenheiten zu', () => {
    expect(gruppeVon('MITBESTIMMUNG_87')).toBe('SOZIAL');
    expect(gruppeVon('AUSWAHLRICHTLINIE_95')).toBe('SOZIAL');
    expect(gruppeVon('BETRIEBSAENDERUNG_111')).toBe('WIRTSCHAFTLICH');
    expect(gruppeVon('WIRTSCHAFTSAUSSCHUSS_106')).toBe('WIRTSCHAFTLICH');
  });

  it('faengt unbekannte Arten als Sonstiges auf', () => {
    expect(gruppeVon('UNTERRICHTUNG_80')).toBe('SONSTIGES');
    expect(gruppeVon('BESCHWERDE_85')).toBe('SONSTIGES');
    expect(gruppeVon('IRGENDWAS_NEUES')).toBe('SONSTIGES');
  });

  it('filtert Typen einer Gruppe fuer Datenbankabfragen', () => {
    const alle = ['EINSTELLUNG_99', 'KUENDIGUNG_ORDENTLICH_102', 'MITBESTIMMUNG_87'];
    expect(typenDerGruppe('ANHOERUNG', alle)).toEqual(['KUENDIGUNG_ORDENTLICH_102']);
    expect(typenDerGruppe('ZUSTIMMUNG', alle)).toEqual(['EINSTELLUNG_99']);
  });

  it('haelt fuer jede Gruppe eine Beschreibung bereit', () => {
    const schluessel = VORGANGSGRUPPEN.map((g) => g.schluessel);
    expect(schluessel).toContain('ANHOERUNG');
    expect(schluessel).toContain('ZUSTIMMUNG');
    expect(new Set(schluessel).size).toBe(VORGANGSGRUPPEN.length);
  });
});

/**
 * Der rechtlich heikelste Punkt der ganzen Datei: Die Ruege wirkt bei § 99 und
 * § 102 BetrVG unterschiedlich. Wer das verwechselt, verliert bei § 102 den
 * Widerspruch nach § 102 Abs. 3 BetrVG.
 */
describe('Wirkung der Ruege einer unvollstaendigen Unterrichtung', () => {
  it('haelt bei § 99 BetrVG die Frist an', () => {
    const w = ruegewirkung('EINSTELLUNG_99');
    expect(w?.haeltFristAn).toBe(true);
    expect(w?.norm).toContain('§ 99 Abs. 1');
    expect(w?.wirkung).toContain('Zustimmungsfiktion tritt nicht ein');
  });

  it('haelt bei § 102 BetrVG die Frist NICHT an', () => {
    for (const typ of ['KUENDIGUNG_ORDENTLICH_102', 'KUENDIGUNG_AUSSERORDENTLICH_102']) {
      const w = ruegewirkung(typ);
      expect(w?.haeltFristAn, `${typ} darf die Frist nicht anhalten`).toBe(false);
      expect(w?.warnung).toContain('NICHT an');
      expect(w?.warnung).toContain('§ 102 Abs. 3 BetrVG');
    }
  });

  it('verweist bei § 102 auf die Unwirksamkeit der Kuendigung', () => {
    expect(ruegewirkung('KUENDIGUNG_ORDENTLICH_102')?.wirkung).toContain('§ 102 Abs. 1 S. 3');
  });

  it('bietet die Ruege dort nicht an, wo sie keine Rechtsfolge hat', () => {
    expect(ruegewirkung('MITBESTIMMUNG_87')).toBeNull();
    expect(ruegewirkung('UNTERRICHTUNG_80')).toBeNull();
    expect(ruegewirkung('BETRIEBSAENDERUNG_111')).toBeNull();
  });
});

describe('Verfahrensstand', () => {
  const basis: Verfahrensdaten = {
    typ: 'KUENDIGUNG_ORDENTLICH_102',
    eingegangenAm: new Date('2026-06-01T09:00:00Z'),
    unterrichtungGeruegtAm: null,
    unterrichtungVervollstaendigtAm: null,
    aufTagesordnung: false,
    beschlussGefasst: false,
    antwortAm: null,
    antwortZugangAm: null,
    fristBis: new Date('2026-06-08T21:59:59Z'),
  };

  it('bildet den Ablauf einer Anhoerung in fuenf Schritten ab', () => {
    const s = verfahrensstand(basis);
    expect(s).toHaveLength(5);
    expect(s[0].bezeichnung).toBe('Unterrichtung eingegangen');
    expect(s[0].status).toBe('ERLEDIGT');
    expect(s[1].bezeichnung).toContain('Vollständigkeit');
    expect(s[4].bezeichnung).toBe('Zugang beim Arbeitgeber');
  });

  it('laesst den Vollstaendigkeitsschritt weg, wo er keine Rolle spielt', () => {
    const s = verfahrensstand({ ...basis, typ: 'MITBESTIMMUNG_87' });
    expect(s.some((x) => x.bezeichnung.includes('Vollständigkeit'))).toBe(false);
    expect(s).toHaveLength(4);
  });

  it('warnt bei § 102, wenn geruegt wurde – die Frist laeuft weiter', () => {
    const s = verfahrensstand({ ...basis, unterrichtungGeruegtAm: new Date('2026-06-03T09:00:00Z') });
    const schritt = s.find((x) => x.bezeichnung.includes('Vollständigkeit'))!;
    expect(schritt.status).toBe('WARNUNG');
    expect(schritt.vermerk).toContain('läuft gleichwohl weiter');
  });

  it('meldet bei § 99 die angehaltene Frist ohne Warnung', () => {
    const s = verfahrensstand({
      ...basis,
      typ: 'EINSTELLUNG_99',
      unterrichtungGeruegtAm: new Date('2026-06-03T09:00:00Z'),
    });
    const schritt = s.find((x) => x.bezeichnung.includes('Vollständigkeit'))!;
    expect(schritt.status).toBe('ERLEDIGT');
    expect(schritt.vermerk).toContain('angehalten');
  });

  it('vermerkt die Nachreichung und den Neubeginn der Frist', () => {
    const s = verfahrensstand({
      ...basis,
      typ: 'EINSTELLUNG_99',
      unterrichtungGeruegtAm: new Date('2026-06-03T09:00:00Z'),
      unterrichtungVervollstaendigtAm: new Date('2026-06-05T09:00:00Z'),
    });
    const schritt = s.find((x) => x.bezeichnung.includes('Vollständigkeit'))!;
    expect(schritt.status).toBe('ERLEDIGT');
    expect(schritt.vermerk).toContain('neu');
  });

  it('weist auf die fehlende Beschlussgrundlage hin', () => {
    const s = verfahrensstand(basis);
    const beschluss = s.find((x) => x.bezeichnung.includes('Beschlussfassung'))!;
    expect(beschluss.status).toBe('OFFEN');
    expect(beschluss.vermerk).toContain('bindet den Betriebsrat nicht');
  });

  it('mahnt den Zugangsnachweis an, sobald eine Antwort erfasst ist', () => {
    const s = verfahrensstand({ ...basis, antwortAm: new Date('2026-06-05T09:00:00Z') });
    const zugang = s.find((x) => x.bezeichnung.includes('Zugang'))!;
    expect(zugang.status).toBe('WARNUNG');
    expect(zugang.vermerk).toContain('nicht auf die Absendung');
  });

  it('gilt als abgeschlossen, wenn der Zugang dokumentiert ist', () => {
    const s = verfahrensstand({
      ...basis,
      beschlussGefasst: true,
      antwortAm: new Date('2026-06-05T09:00:00Z'),
      antwortZugangAm: new Date('2026-06-06T09:00:00Z'),
    });
    expect(s.find((x) => x.bezeichnung.includes('Zugang'))!.status).toBe('ERLEDIGT');
    expect(s.find((x) => x.bezeichnung.includes('Beschlussfassung'))!.status).toBe('ERLEDIGT');
  });
});
