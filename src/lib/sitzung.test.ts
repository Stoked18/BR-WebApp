import { describe, expect, it } from 'vitest';
import { anwesenheitslage, istVorDerSitzung, zaehleAnwesend, zaehleGeladen, type Teilnahmezeile } from './sitzung';

function zeilen(spec: Array<[Teilnahmezeile['status'], boolean]>): Teilnahmezeile[] {
  return spec.map(([status, stimmberechtigt], i) => ({ personId: `p${i}`, status, stimmberechtigt }));
}

describe('Sitzungsstatus', () => {
  it('trennt Planung von Durchfuehrung', () => {
    expect(istVorDerSitzung('GEPLANT')).toBe(true);
    expect(istVorDerSitzung('EINGELADEN')).toBe(true);
    expect(istVorDerSitzung('LAUFEND')).toBe(false);
    expect(istVorDerSitzung('PROTOKOLL_FREIGEGEBEN')).toBe(false);
  });
});

describe('Zaehlung der Teilnahme', () => {
  it('zaehlt nur tatsaechlich Teilnehmende fuer § 33 Abs. 2 BetrVG', () => {
    const t = zeilen([
      ['ANWESEND', true],
      ['TEILWEISE', true],
      ['GELADEN', true], // geladen ist nicht anwesend
      ['VERTRETEN', false],
      ['ENTSCHULDIGT', true],
      ['ANWESEND', false], // Gast ohne Stimmrecht
    ]);
    expect(zaehleAnwesend(t)).toBe(2);
    expect(zaehleGeladen(t)).toBe(3);
  });
});

describe('Anwesenheitslage vor der Sitzung', () => {
  it('rechnet Verhinderungen und geladene Ersatzmitglieder gegen', () => {
    // 13 Mitglieder, 3 verhindert, 3 Ersatzmitglieder geladen -> wieder 13
    const t = zeilen([
      ['VERTRETEN', false],
      ['VERTRETEN', false],
      ['VERTRETEN', false],
      ['GELADEN', true],
      ['GELADEN', true],
      ['GELADEN', true],
    ]);
    const l = anwesenheitslage(13, t, 3, 'EINGELADEN');
    expect(l.prognose).toBe(true);
    expect(l.zahl).toBe(13);
    expect(l.erforderlich).toBe(7);
    expect(l.ausreichend).toBe(true);
  });

  it('meldet die Luecke, wenn kein Ersatzmitglied mehr nachrueckt', () => {
    // 13 Mitglieder, 8 verhindert, kein Ersatz mehr verfuegbar
    const t = zeilen(Array(8).fill(['VERTRETEN', false]) as Array<[Teilnahmezeile['status'], boolean]>);
    const l = anwesenheitslage(13, t, 8, 'EINGELADEN');
    expect(l.zahl).toBe(5);
    expect(l.ausreichend).toBe(false);
    expect(l.text).toContain('§ 33 Abs. 2 BetrVG');
  });

  /**
   * Der Kern der Korrektur: aus einer blossen Ladung darf sich keine
   * Beschlussfassung ableiten lassen.
   */
  it('erlaubt vor der Sitzung keine Beschlussfassung', () => {
    const l = anwesenheitslage(13, zeilen([['GELADEN', true]]), 0, 'EINGELADEN');
    expect(l.beschlussfassungMoeglich).toBe(false);
    expect(anwesenheitslage(13, [], 0, 'GEPLANT').beschlussfassungMoeglich).toBe(false);
  });

  it('zaehlt ohne Verhinderungen das volle Gremium', () => {
    const l = anwesenheitslage(13, [], 0, 'GEPLANT');
    expect(l.zahl).toBe(13);
    expect(l.ausreichend).toBe(true);
    expect(l.beschlussfassungMoeglich).toBe(false);
  });
});

describe('Anwesenheitslage in der Sitzung', () => {
  it('stellt auf die tatsaechliche Teilnahme ab', () => {
    const t = zeilen([
      ...(Array(7).fill(['ANWESEND', true]) as Array<[Teilnahmezeile['status'], boolean]>),
      ['GELADEN', true], // erschienen ist diese Person nicht
    ]);
    const l = anwesenheitslage(13, t, 0, 'LAUFEND');
    expect(l.prognose).toBe(false);
    expect(l.zahl).toBe(7);
    expect(l.ausreichend).toBe(true);
    expect(l.beschlussfassungMoeglich).toBe(true);
  });

  it('sperrt die Beschlussfassung bei fehlender Beschlussfaehigkeit', () => {
    const t = zeilen(Array(6).fill(['ANWESEND', true]) as Array<[Teilnahmezeile['status'], boolean]>);
    const l = anwesenheitslage(13, t, 0, 'LAUFEND');
    expect(l.zahl).toBe(6);
    expect(l.ausreichend).toBe(false);
    expect(l.beschlussfassungMoeglich).toBe(false);
    expect(l.text).toContain('unwirksam');
  });

  it('zaehlt Video- und Telefonteilnahme mit', () => {
    // § 33 Abs. 1 S. 2 BetrVG: Teilnahme per Konferenz steht der Anwesenheit gleich.
    // Die Teilnahmeform ist deshalb fuer die Zaehlung ohne Bedeutung.
    const t = zeilen(Array(7).fill(['ANWESEND', true]) as Array<[Teilnahmezeile['status'], boolean]>);
    expect(anwesenheitslage(13, t, 0, 'LAUFEND').ausreichend).toBe(true);
  });
});
