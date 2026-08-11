import { describe, expect, it } from 'vitest';
import { EINSTELLUNGEN, definition, istAn, mitVorgaben, pruefeWert } from './einstellungen';

describe('Katalog', () => {
  it('hat eindeutige Schluessel und gueltige Vorgaben', () => {
    const schluessel = EINSTELLUNGEN.map((e) => e.schluessel);
    expect(new Set(schluessel).size).toBe(schluessel.length);
    for (const def of EINSTELLUNGEN) {
      const geprueft = pruefeWert(def.schluessel, def.vorgabe);
      expect(geprueft.gueltig, `${def.schluessel}: Vorgabe "${def.vorgabe}"`).toBe(true);
    }
  });

  it('kennt die Ladungsfrist als Zahl mit Grenzen', () => {
    const def = definition('ladungsfrist.tage');
    expect(def?.art).toBe('zahl');
    expect(def?.min).toBe(1);
    expect(def?.norm).toContain('§ 29');
  });
});

describe('Wertpruefung', () => {
  it('weist unbekannte Schluessel ab', () => {
    expect(pruefeWert('unbekannt', '1')).toEqual({
      gueltig: false,
      fehler: 'Unbekannte Einstellung "unbekannt".',
    });
  });

  it('normalisiert Schalter auf ja/nein', () => {
    for (const roh of ['on', 'ja', 'true', '1']) {
      expect(pruefeWert('betrieb.testbetrieb', roh)).toEqual({ gueltig: true, wert: 'ja' });
    }
    for (const roh of ['', 'nein', 'off', 'irgendwas']) {
      expect(pruefeWert('betrieb.testbetrieb', roh)).toEqual({ gueltig: true, wert: 'nein' });
    }
  });

  it('laesst nur ganze Zahlen innerhalb der Grenzen zu', () => {
    expect(pruefeWert('ladungsfrist.tage', '3')).toEqual({ gueltig: true, wert: '3' });
    expect(pruefeWert('ladungsfrist.tage', ' 7 ')).toEqual({ gueltig: true, wert: '7' });
    expect(pruefeWert('ladungsfrist.tage', '3,5').gueltig).toBe(false);
    expect(pruefeWert('ladungsfrist.tage', '0').gueltig).toBe(false);
    expect(pruefeWert('ladungsfrist.tage', '22').gueltig).toBe(false);
    expect(pruefeWert('ladungsfrist.tage', 'sieben').gueltig).toBe(false);
  });

  it('begrenzt die Einwendungsfrist gegen die Niederschrift', () => {
    expect(pruefeWert('einspruchsfrist.niederschrift.wochen', '2').gueltig).toBe(true);
    expect(pruefeWert('einspruchsfrist.niederschrift.wochen', '9').gueltig).toBe(false);
  });
});

describe('Vorgaben und gespeicherte Werte', () => {
  it('faellt auf die Vorgabe zurueck, wenn nichts gespeichert ist', () => {
    const werte = mitVorgaben([]);
    expect(werte['ladungsfrist.tage']).toBe('7');
    expect(istAn(werte, 'betrieb.testbetrieb')).toBe(false);
  });

  it('uebernimmt gespeicherte Werte und ignoriert unbekannte Schluessel', () => {
    const werte = mitVorgaben([
      { schluessel: 'ladungsfrist.tage', wert: '3' },
      { schluessel: 'betrieb.testbetrieb', wert: 'ja' },
      { schluessel: 'veraltet.irgendwas', wert: 'x' },
    ]);
    expect(werte['ladungsfrist.tage']).toBe('3');
    expect(istAn(werte, 'betrieb.testbetrieb')).toBe(true);
    expect(werte['veraltet.irgendwas']).toBeUndefined();
  });
});
