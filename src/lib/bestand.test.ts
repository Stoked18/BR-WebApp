import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BEWEGUNGSDATEN,
  GESCHUETZT,
  GESONDERT,
  STAMMDATEN,
  fuehreLoeschplanAus,
  loeschplan,
  summe,
} from './bestand';

/** Modellnamen aus dem Prisma-Schema, in der Schreibweise der Klientfelder. */
function modelleAusSchema(): string[] {
  const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(
    (t) => t[1].charAt(0).toLowerCase() + t[1].slice(1),
  );
}

describe('Loeschplan deckt das Datenmodell ab', () => {
  const alle = [...BEWEGUNGSDATEN, ...STAMMDATEN, ...GESCHUETZT, ...GESONDERT] as string[];

  it('kennt jede Tabelle des Schemas genau einmal', () => {
    // Der eigentliche Zweck dieses Tests: wird spaeter eine Tabelle ergaenzt
    // und hier vergessen, bliebe sie beim Zuruecksetzen stehen oder risse
    // einen Fremdschluesselfehler auf. Das faellt hier auf, nicht beim Kunden.
    const schema = modelleAusSchema().sort();
    expect([...alle].sort()).toEqual(schema);
  });

  it('fuehrt keine Tabelle doppelt', () => {
    expect(new Set(alle).size).toBe(alle.length);
  });

  it('schuetzt Betrieb, Gremium, Amtsperiode und Einstellungen', () => {
    for (const tabelle of ['betrieb', 'gremium', 'amtsperiode', 'einstellung']) {
      expect(loeschplan('VOLLSTAENDIG')).not.toContain(tabelle);
    }
  });

  it('loescht das Zugriffsprotokoll nicht im Rahmen des Plans', () => {
    // Die Hash-Kette wird gesondert behandelt, damit ihr Bruch bewusst und
    // dokumentiert erfolgt (siehe setzeBestandZurueck).
    expect(loeschplan('VOLLSTAENDIG')).not.toContain('auditEintrag');
  });
});

describe('Reihenfolge des Loeschplans', () => {
  const plan = loeschplan('VOLLSTAENDIG');
  const vor = (a: string, b: string) => plan.indexOf(a) < plan.indexOf(b);

  it('entfernt Kindsaetze vor ihren Elternsaetzen', () => {
    // Jedes Paar entspricht einem Fremdschluessel im Schema.
    expect(vor('einspruch', 'niederschrift')).toBe(true);
    expect(vor('niederschrift', 'sitzung')).toBe(true);
    expect(vor('beschluss', 'tagesordnungspunkt')).toBe(true);
    expect(vor('tagesordnungspunkt', 'sitzung')).toBe(true);
    expect(vor('teilnahme', 'sitzung')).toBe(true);
    expect(vor('verhinderung', 'sitzung')).toBe(true);
    expect(vor('fristereignis', 'vorgang')).toBe(true);
    expect(vor('dokument', 'vorgang')).toBe(true);
    expect(vor('dokument', 'betriebsvereinbarung')).toBe(true);
    expect(vor('dokument', 'tagesordnungspunkt')).toBe(true);
    expect(vor('aufgabe', 'ausschuss')).toBe(true);
    expect(vor('aufgabe', 'vorgang')).toBe(true);
    expect(vor('aufsichtsratMeilenstein', 'aufsichtsratProjekt')).toBe(true);
    expect(vor('ausschussMitgliedschaft', 'ausschuss')).toBe(true);
    expect(vor('schichtgruppe', 'schichtmodell')).toBe(true);
  });

  it('entfernt alles mit Personenbezug vor den Personen', () => {
    for (const tabelle of [
      'teilnahme', 'verhinderung', 'schulung', 'sprechstunde', 'aufgabe',
      'funktion', 'freistellung', 'mitgliedschaft', 'wahlergebnis',
      'ausschussMitgliedschaft', 'benutzer',
    ]) {
      expect(vor(tabelle, 'person'), `${tabelle} vor person`).toBe(true);
    }
    // Person verweist auf eine Schichtgruppe.
    expect(vor('person', 'schichtgruppe')).toBe(true);
  });

  it('entfernt alles mit Kontobezug vor den Konten', () => {
    for (const tabelle of ['sitzung', 'vorgang', 'aufgabe', 'dokument', 'sitzungstoken']) {
      expect(vor(tabelle, 'benutzer'), `${tabelle} vor benutzer`).toBe(true);
    }
  });
});

describe('Loeschtiefen', () => {
  it('laesst Personen und Konten bei der ersten Stufe unberuehrt', () => {
    const bewegung = loeschplan('BEWEGUNG');
    for (const tabelle of ['person', 'benutzer', 'mitgliedschaft', 'ausschuss', 'sitzungstoken']) {
      expect(bewegung).not.toContain(tabelle);
    }
  });

  it('beginnt die vollstaendige Stufe mit denselben Schritten', () => {
    expect(loeschplan('VOLLSTAENDIG').slice(0, BEWEGUNGSDATEN.length)).toEqual(loeschplan('BEWEGUNG'));
  });
});

describe('Ausfuehrung', () => {
  function attrappe() {
    const rufe: Array<{ tabelle: string; where: unknown }> = [];
    const klient: Record<string, unknown> = {};
    for (const tabelle of [...BEWEGUNGSDATEN, ...STAMMDATEN]) {
      klient[tabelle] = {
        deleteMany: async (argumente?: { where?: unknown }) => {
          rufe.push({ tabelle, where: argumente?.where });
          return { count: 2 };
        },
      };
    }
    return { klient, rufe };
  }

  it('nimmt das eigene Konto und dessen Anmeldung aus', async () => {
    const { klient, rufe } = attrappe();
    await fuehreLoeschplanAus(klient, 'VOLLSTAENDIG', 'konto-1');

    expect(rufe.find((r) => r.tabelle === 'benutzer')?.where).toEqual({ id: { not: 'konto-1' } });
    expect(rufe.find((r) => r.tabelle === 'sitzungstoken')?.where).toEqual({
      benutzerId: { not: 'konto-1' },
    });
    // Alle uebrigen Tabellen werden ohne Einschraenkung geleert.
    expect(rufe.find((r) => r.tabelle === 'sitzung')?.where).toBeUndefined();
  });

  it('haelt die Reihenfolge des Plans ein und bilanziert', async () => {
    const { klient, rufe } = attrappe();
    const bilanz = await fuehreLoeschplanAus(klient, 'BEWEGUNG', 'konto-1');

    expect(rufe.map((r) => r.tabelle)).toEqual(loeschplan('BEWEGUNG'));
    expect(summe(bilanz)).toBe(2 * BEWEGUNGSDATEN.length);
  });

  it('bricht ab, wenn eine Tabelle im Klienten fehlt', async () => {
    const { klient } = attrappe();
    delete klient.sitzung;
    await expect(fuehreLoeschplanAus(klient, 'BEWEGUNG', 'konto-1')).rejects.toThrow(/sitzung/);
  });
});
