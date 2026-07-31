import { describe, expect, it } from 'vitest';
import {
  feiertageLand,
  istFeiertag,
  istWerktag,
  naechsterWerktag,
  ostersonntag,
  tagAlsIso,
} from './feiertage';
import { alsKalendertag, berechneFrist, berechneNachVorlage, fristampel, verbleibendeTage } from './fristen';

describe('Ostersonntag', () => {
  it('trifft bekannte Termine', () => {
    expect(tagAlsIso(ostersonntag(2024))).toBe('2024-03-31');
    expect(tagAlsIso(ostersonntag(2025))).toBe('2025-04-20');
    expect(tagAlsIso(ostersonntag(2026))).toBe('2026-04-05');
    expect(tagAlsIso(ostersonntag(2027))).toBe('2027-03-28');
    expect(tagAlsIso(ostersonntag(2030))).toBe('2030-04-21');
  });
});

describe('Feiertage in Nordrhein-Westfalen', () => {
  it('enthaelt Fronleichnam und Allerheiligen', () => {
    const namen = feiertageLand(2026, 'NW').map((f) => f.bezeichnung);
    expect(namen).toContain('Fronleichnam');
    expect(namen).toContain('Allerheiligen');
  });

  it('kennt Fronleichnam 2026 am 4. Juni', () => {
    const fronleichnam = feiertageLand(2026, 'NW').find((f) => f.bezeichnung === 'Fronleichnam');
    expect(tagAlsIso(fronleichnam!.datum)).toBe('2026-06-04');
  });

  it('grenzt NRW gegen andere Bundeslaender ab', () => {
    // Fronleichnam ist in Berlin kein gesetzlicher Feiertag ...
    expect(istFeiertag({ jahr: 2026, monat: 6, tag: 4 }, 'NW')).toBe(true);
    expect(istFeiertag({ jahr: 2026, monat: 6, tag: 4 }, 'BE')).toBe(false);
    // ... der Reformationstag umgekehrt in NRW nicht.
    expect(istFeiertag({ jahr: 2026, monat: 10, tag: 31 }, 'NW')).toBe(false);
    expect(istFeiertag({ jahr: 2026, monat: 10, tag: 31 }, 'NI')).toBe(true);
  });

  it('zaehlt 11 gesetzliche Feiertage in NRW', () => {
    expect(feiertageLand(2026, 'NW')).toHaveLength(11);
  });

  it('bewertet Werktage nach § 193 BGB', () => {
    expect(istWerktag({ jahr: 2026, monat: 6, tag: 4 }, 'NW')).toBe(false); // Fronleichnam
    expect(istWerktag({ jahr: 2026, monat: 6, tag: 6 }, 'NW')).toBe(false); // Sonnabend
    expect(istWerktag({ jahr: 2026, monat: 6, tag: 5 }, 'NW')).toBe(true); // Freitag
  });

  it('ueberspringt zusammenhaengende Feiertage', () => {
    // 25./26.12.2027 fallen auf Sonnabend/Sonntag, der 27.12. ist Montag.
    expect(tagAlsIso(naechsterWerktag({ jahr: 2027, monat: 12, tag: 25 }, 'NW'))).toBe('2027-12-27');
  });
});

describe('Fristberechnung nach §§ 187, 188 BGB', () => {
  it('rechnet den Ereignistag nicht mit (§ 187 Abs. 1 BGB)', () => {
    const f = berechneFrist({ jahr: 2026, monat: 6, tag: 1 }, 1, 'WOCHEN');
    expect(tagAlsIso(f.beginn)).toBe('2026-06-02');
  });

  it('laesst die Wochenfrist am gleichnamigen Wochentag enden (§ 188 Abs. 2 BGB)', () => {
    // Zugang Montag, 01.06.2026 -> Ablauf Montag, 08.06.2026
    const f = berechneFrist({ jahr: 2026, monat: 6, tag: 1 }, 1, 'WOCHEN');
    expect(tagAlsIso(f.ende)).toBe('2026-06-08');
    expect(f.verschobenNach193).toBe(false);
  });

  it('verschiebt das Fristende von Fronleichnam auf den Folgetag (§ 193 BGB)', () => {
    // Zugang Donnerstag, 28.05.2026 -> rechnerisches Ende Donnerstag, 04.06.2026 (Fronleichnam)
    const f = berechneFrist({ jahr: 2026, monat: 5, tag: 28 }, 1, 'WOCHEN', 'NW');
    expect(tagAlsIso(f.endeRechnerisch)).toBe('2026-06-04');
    expect(tagAlsIso(f.ende)).toBe('2026-06-05');
    expect(f.verschobenNach193).toBe(true);
    expect(f.herleitung).toContain('Fronleichnam');
  });

  it('verschiebt in Berlin nicht, weil Fronleichnam dort kein Feiertag ist', () => {
    const f = berechneFrist({ jahr: 2026, monat: 5, tag: 28 }, 1, 'WOCHEN', 'BE');
    expect(tagAlsIso(f.ende)).toBe('2026-06-04');
    expect(f.verschobenNach193).toBe(false);
  });

  it('verschiebt das Fristende von Allerheiligen auf den Folgetag', () => {
    // 01.11.2027 ist ein Montag und in NRW Allerheiligen.
    const f = berechneFrist({ jahr: 2027, monat: 10, tag: 25 }, 1, 'WOCHEN', 'NW');
    expect(tagAlsIso(f.endeRechnerisch)).toBe('2027-11-01');
    expect(tagAlsIso(f.ende)).toBe('2027-11-02');
  });

  it('rechnet Tagesfristen nach § 188 Abs. 1 BGB', () => {
    // Zugang Montag 01.06.2026, drei Tage -> Donnerstag 04.06.2026 (Fronleichnam)
    // -> § 193 BGB verschiebt auf Freitag 05.06.2026
    const f = berechneFrist({ jahr: 2026, monat: 6, tag: 1 }, 3, 'TAGE', 'NW');
    expect(tagAlsIso(f.endeRechnerisch)).toBe('2026-06-04');
    expect(tagAlsIso(f.ende)).toBe('2026-06-05');
  });

  it('verschiebt eine Dreitagesfrist ueber das Wochenende', () => {
    // Zugang Donnerstag 11.06.2026 -> Ende Sonntag 14.06.2026 -> Montag 15.06.2026
    const f = berechneFrist({ jahr: 2026, monat: 6, tag: 11 }, 3, 'TAGE', 'NW');
    expect(tagAlsIso(f.ende)).toBe('2026-06-15');
  });

  it('kuerzt Monatsfristen auf den Monatsletzten (§ 188 Abs. 3 BGB)', () => {
    const f = berechneFrist({ jahr: 2026, monat: 1, tag: 31 }, 1, 'MONATE', 'NW');
    // 31.02. gibt es nicht -> 28.02.2026 ist ein Sonnabend -> § 193 -> Montag 02.03.2026
    expect(tagAlsIso(f.endeRechnerisch)).toBe('2026-02-28');
    expect(tagAlsIso(f.ende)).toBe('2026-03-02');
    expect(f.herleitung).toContain('§ 188 Abs. 3 BGB');
  });

  it('zaehlt Werktagsfristen ohne Feiertage', () => {
    // Start Dienstag 02.06.2026; Werktage: 02., 03., 05. (04. ist Fronleichnam)
    const f = berechneFrist({ jahr: 2026, monat: 6, tag: 1 }, 3, 'WERKTAGE', 'NW');
    expect(tagAlsIso(f.ende)).toBe('2026-06-05');
  });

  it('weist negative oder leere Fristen zurueck', () => {
    expect(() => berechneFrist({ jahr: 2026, monat: 6, tag: 1 }, 0, 'TAGE')).toThrow();
  });
});

describe('Fristvorlagen des BetrVG', () => {
  it('berechnet die Wochenfrist des § 99 Abs. 3 BetrVG', () => {
    const f = berechneNachVorlage('ZUSTIMMUNG_99', { jahr: 2026, monat: 6, tag: 1 });
    expect(tagAlsIso(f.ende)).toBe('2026-06-08');
    expect(f.vorlage.grundlage).toBe('§ 99 Abs. 3 S. 1 BetrVG');
    expect(f.herleitung).toContain('gilt nach § 99 Abs. 3 S. 2 BetrVG als erteilt');
  });

  it('berechnet die Dreitagesfrist bei ausserordentlicher Kuendigung', () => {
    const f = berechneNachVorlage('ANHOERUNG_102_AUSSERORDENTLICH', { jahr: 2026, monat: 6, tag: 8 });
    expect(tagAlsIso(f.ende)).toBe('2026-06-11');
    expect(f.vorlage.dauer).toBe(3);
  });

  it('kennzeichnet nicht gesetzlich geregelte Fristen', () => {
    const f = berechneNachVorlage('ZUSTIMMUNG_103', { jahr: 2026, monat: 6, tag: 1 });
    expect(f.vorlage.gesetzlich).toBe(false);
    expect(f.herleitung).toContain('keine eigene Frist');
  });

  it('berechnet die Monatsfrist des Art. 12 Abs. 3 DSGVO', () => {
    const f = berechneNachVorlage('AUSKUNFT_DSGVO', { jahr: 2026, monat: 3, tag: 10 });
    expect(tagAlsIso(f.ende)).toBe('2026-04-10');
  });
});

describe('Fristampel', () => {
  const jetzt = new Date('2026-06-01T10:00:00Z');

  it('erkennt abgelaufene Fristen', () => {
    expect(fristampel(new Date('2026-05-31T23:59:59Z'), jetzt)).toBe('ABGELAUFEN');
  });
  it('warnt innerhalb von 24 Stunden', () => {
    expect(fristampel(new Date('2026-06-02T08:00:00Z'), jetzt)).toBe('KRITISCH');
  });
  it('warnt innerhalb von drei Tagen', () => {
    expect(fristampel(new Date('2026-06-03T08:00:00Z'), jetzt)).toBe('WARNUNG');
  });
  it('meldet offene Fristen', () => {
    expect(fristampel(new Date('2026-06-20T08:00:00Z'), jetzt)).toBe('OFFEN');
  });
  it('kommt ohne Frist zurecht', () => {
    expect(fristampel(null, jetzt)).toBe('KEINE_FRIST');
  });
});

describe('Zeitzonenbehandlung', () => {
  it('setzt den Fristablauf auf 24:00 Uhr deutscher Ortszeit', () => {
    // Sommerzeit: 23:59:59,999 Ortszeit entspricht 21:59:59,999 UTC
    const f = berechneFrist({ jahr: 2026, monat: 6, tag: 1 }, 1, 'WOCHEN');
    expect(f.ablauf.toISOString()).toBe('2026-06-08T21:59:59.999Z');
  });

  it('beruecksichtigt die Winterzeit', () => {
    const f = berechneFrist({ jahr: 2026, monat: 12, tag: 1 }, 1, 'WOCHEN');
    expect(f.ablauf.toISOString()).toBe('2026-12-08T22:59:59.999Z');
  });

  it('ordnet einen Zeitpunkt dem deutschen Kalendertag zu', () => {
    // 22:30 UTC im Sommer ist in Deutschland bereits der Folgetag.
    expect(tagAlsIso(alsKalendertag(new Date('2026-06-08T22:30:00Z')))).toBe('2026-06-09');
  });

  it('zaehlt verbleibende Tage kalendarisch', () => {
    const ende = new Date('2026-06-08T21:59:59.999Z');
    expect(verbleibendeTage(ende, new Date('2026-06-01T10:00:00Z'))).toBe(7);
    expect(verbleibendeTage(ende, new Date('2026-06-08T10:00:00Z'))).toBe(0);
    expect(verbleibendeTage(ende, new Date('2026-06-10T10:00:00Z'))).toBe(-2);
  });
});
