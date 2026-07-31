import { describe, expect, it } from 'vitest';
import type { Systemrolle } from '@prisma/client';
import {
  darf,
  darfVertraulichkeit,
  istArbeitgeberseite,
  istGremiumsseite,
  rechteVon,
  sichtbareStufen,
  type Recht,
  type Sitzungsbenutzer,
} from './authz';

function benutzer(...rollen: Systemrolle[]): Sitzungsbenutzer {
  return { id: 'u1', anzeigename: 'Testperson', email: 't@example.invalid', rollen, personId: null };
}

/**
 * Der Kern des Berechtigungsmodells: die Arbeitgeberseite darf die
 * Binnenarbeit des Gremiums nicht einsehen (§§ 78, 79 BetrVG). Diese Tests
 * sollen verhindern, dass eine spaetere Erweiterung der Rollen das aufweicht.
 */
describe('Trennung von Gremium und Arbeitgeberseite', () => {
  const agRollen: Systemrolle[] = ['AG_PERSONAL', 'AG_FACHBEREICH', 'AG_ARBEITSSICHERHEIT'];

  const verboten: Recht[] = [
    'sitzung.lesen',
    'sitzung.planen',
    'sitzung.leiten',
    'sitzung.protokollieren',
    'beschluss.lesen',
    'beschluss.erfassen',
    'vorgang.lesen',
    'vorgang.bearbeiten',
    'vorgang.beantworten',
    'gremium.lesen',
    'gremium.verwalten',
    'aufgabe.lesen',
    'dokument.lesen',
    'bv.lesen',
    'audit.lesen',
    'datenschutz.lesen',
  ];

  for (const rolle of agRollen) {
    it(`${rolle} kommt an keine Gremiumsdaten`, () => {
      const b = benutzer(rolle);
      for (const recht of verboten) {
        expect(darf(b, recht), `${rolle} darf nicht ${recht}`).toBe(false);
      }
    });

    it(`${rolle} darf ausschliesslich Antraege einreichen`, () => {
      expect([...rechteVon([rolle])]).toEqual(['vorgang.einreichen']);
    });

    it(`${rolle} sieht keine vertraulichen Unterlagen`, () => {
      const b = benutzer(rolle);
      expect(darfVertraulichkeit(b, 'INTERN_BR')).toBe(false);
      expect(darfVertraulichkeit(b, 'VERTRAULICH')).toBe(false);
      expect(darfVertraulichkeit(b, 'PERSONENBEZOGEN')).toBe(false);
      expect(sichtbareStufen(b)).toEqual(['OEFFENTLICH']);
    });

    it(`${rolle} wird als Arbeitgeberseite eingeordnet`, () => {
      expect(istArbeitgeberseite(benutzer(rolle))).toBe(true);
      expect(istGremiumsseite(benutzer(rolle))).toBe(false);
    });
  }
});

describe('IT-Betrieb', () => {
  /**
   * Der technische Betrieb liegt beim Arbeitgeber. Damit § 79a BetrVG nicht
   * zum Einfallstor wird, hat diese Rolle keinerlei fachliche Leserechte.
   */
  it('hat keinen fachlichen Zugriff', () => {
    const b = benutzer('IT_BETRIEB');
    expect([...rechteVon(['IT_BETRIEB'])]).toEqual(['system.verwalten']);
    expect(darf(b, 'sitzung.lesen')).toBe(false);
    expect(darf(b, 'dokument.lesen')).toBe(false);
    expect(darf(b, 'audit.lesen')).toBe(false);
    expect(sichtbareStufen(b)).toEqual(['OEFFENTLICH']);
  });
});

describe('Datenschutzbeauftragte Person', () => {
  /**
   * § 79a S. 3 BetrVG: Verschwiegenheit gegenueber dem Arbeitgeber. Einsicht
   * besteht nur ins Datenschutzmodul und ins Protokoll, nicht in die Sachakten.
   */
  it('sieht das Datenschutzmodul, aber keine Sitzungsinhalte', () => {
    const b = benutzer('DSB');
    expect(darf(b, 'datenschutz.lesen')).toBe(true);
    expect(darf(b, 'audit.lesen')).toBe(true);
    expect(darf(b, 'sitzung.lesen')).toBe(false);
    expect(darf(b, 'vorgang.lesen')).toBe(false);
    expect(darf(b, 'dokument.lesen')).toBe(false);
  });
});

describe('Gremiumsrollen', () => {
  it('gibt dem Vorsitz die Leitungsrechte', () => {
    const b = benutzer('BR_VORSITZ');
    expect(darf(b, 'sitzung.leiten')).toBe(true);
    expect(darf(b, 'sitzung.protokoll.freigeben')).toBe(true);
    expect(darf(b, 'vorgang.beantworten')).toBe(true);
    expect(darf(b, 'bv.verwalten')).toBe(true);
    expect(darf(b, 'benutzer.verwalten')).toBe(true);
  });

  it('laesst einfache Mitglieder nicht allein antworten oder freigeben', () => {
    const b = benutzer('BR_MITGLIED');
    expect(darf(b, 'beschluss.erfassen')).toBe(true);
    expect(darf(b, 'sitzung.leiten')).toBe(false);
    expect(darf(b, 'sitzung.protokoll.freigeben')).toBe(false);
    expect(darf(b, 'vorgang.beantworten')).toBe(false);
    expect(darf(b, 'benutzer.verwalten')).toBe(false);
  });

  it('beschraenkt Ersatzmitglieder auf Lesezugriff', () => {
    const b = benutzer('ERSATZMITGLIED');
    expect(darf(b, 'sitzung.lesen')).toBe(true);
    expect(darf(b, 'beschluss.erfassen')).toBe(false);
    expect(darf(b, 'sitzung.planen')).toBe(false);
  });

  it('gibt der JAV keinen Einblick in personelle Vorgaenge', () => {
    // Die JAV hat eigene Aufgaben (§§ 60 ff. BetrVG), aber kein allgemeines
    // Einsichtsrecht in Anhoerungen zu einzelnen Beschaeftigten.
    const b = benutzer('JAV');
    expect(darf(b, 'sitzung.lesen')).toBe(true);
    expect(darf(b, 'vorgang.lesen')).toBe(false);
    expect(darfVertraulichkeit(b, 'PERSONENBEZOGEN')).toBe(false);
  });

  it('gibt der SBV Zugriff auf personenbezogene Vorgaenge', () => {
    // § 178 Abs. 2 SGB IX: Unterrichtung und Anhoerung in Angelegenheiten
    // schwerbehinderter Menschen.
    const b = benutzer('SBV');
    expect(darf(b, 'vorgang.lesen')).toBe(true);
    expect(darfVertraulichkeit(b, 'PERSONENBEZOGEN')).toBe(true);
  });
});

describe('Vertraulichkeitsstufen', () => {
  it('gibt oeffentliche Unterlagen fuer alle frei', () => {
    expect(darfVertraulichkeit(benutzer('AG_PERSONAL'), 'OEFFENTLICH')).toBe(true);
    expect(darfVertraulichkeit(benutzer('IT_BETRIEB'), 'OEFFENTLICH')).toBe(true);
  });

  it('sperrt alles fuer nicht angemeldete Personen', () => {
    expect(darfVertraulichkeit(null, 'OEFFENTLICH')).toBe(false);
    expect(darf(null, 'sitzung.lesen')).toBe(false);
    expect(sichtbareStufen(null)).toEqual([]);
  });

  it('oeffnet dem Gremium alle Stufen', () => {
    expect(sichtbareStufen(benutzer('BR_VORSITZ'))).toEqual([
      'OEFFENTLICH',
      'INTERN_BR',
      'VERTRAULICH',
      'PERSONENBEZOGEN',
    ]);
  });
});

describe('Rollenkombinationen', () => {
  it('behandelt eine Person mit Doppelrolle als Gremiumsseite', () => {
    // Kommt vor, wenn ein Mitglied zugleich eine Funktion auf Arbeitgeberseite
    // im System hat – etwa als Fachkraft fuer Arbeitssicherheit im ASA.
    const b = benutzer('BR_MITGLIED', 'AG_ARBEITSSICHERHEIT');
    expect(istArbeitgeberseite(b)).toBe(false);
    expect(istGremiumsseite(b)).toBe(true);
    expect(darf(b, 'sitzung.lesen')).toBe(true);
    expect(darf(b, 'vorgang.einreichen')).toBe(true);
  });
});
