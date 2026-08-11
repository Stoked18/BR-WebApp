/**
 * Bestandsbereinigung fuer die Erprobung.
 *
 * Wer die Anwendung im Betrieb testet, faengt mit einem Beispielbestand an und
 * braucht danach einen sauberen Stand. Loeschen ist hier heikel: die Tabellen
 * haengen ueber Fremdschluessel zusammen, und das Zugriffsprotokoll ist ueber
 * eine Hash-Kette gesichert (siehe src/lib/audit.ts). Deshalb steht die
 * Reihenfolge hier fest und wird durch einen Test gegen das Datenmodell
 * abgeglichen – wird spaeter eine Tabelle ergaenzt und hier vergessen, faellt
 * das auf, statt beim Kunden einen Fremdschluesselfehler zu erzeugen.
 */

/** Vorgangsbezogener Bestand: alles, was im laufenden Betrieb entsteht. */
export const BEWEGUNGSDATEN = [
  'einspruch',
  'niederschrift',
  'dokument',
  'aufgabe',
  'beschluss',
  'tagesordnungspunkt',
  'teilnahme',
  'verhinderung',
  'sitzung',
  'fristereignis',
  'vorgang',
  'betriebsvereinbarung',
  'schulung',
  'sprechstunde',
  'aufsichtsratMeilenstein',
  'aufsichtsratProjekt',
  'verarbeitungstaetigkeit',
  'loeschregel',
  'betroffenenanfrage',
] as const;

/**
 * Personen- und Organisationsdaten. Werden nur beim vollstaendigen
 * Zuruecksetzen entfernt und erst, nachdem die Bewegungsdaten weg sind.
 */
export const STAMMDATEN = [
  'ausschussMitgliedschaft',
  'ausschuss',
  'funktion',
  'freistellung',
  'mitgliedschaft',
  'wahlergebnis',
  'sitzungstoken',
  'benutzer',
  'person',
  'schichtgruppe',
  'schichtmodell',
] as const;

/**
 * Bleibt in jedem Fall erhalten: der Betrieb selbst, sein Gremium, die
 * laufende Amtsperiode und die Einstellungen. Ohne Amtsperiode liesse sich
 * anschliessend keine Mitgliedschaft mehr anlegen (§ 21 BetrVG), ohne Betrieb
 * und Gremium waere die Anwendung leer.
 */
export const GESCHUETZT = ['betrieb', 'gremium', 'amtsperiode', 'einstellung'] as const;

/**
 * Gesondert behandelt: das Zugriffsprotokoll. Es darf nicht einfach
 * "mitgeloescht" werden, weil sein Wert gerade in der Luecklosigkeit liegt.
 * Beim Loeschen von Benutzerkonten setzt die Datenbank den Verweis in alten
 * Protokolleintraegen auf NULL – damit passte deren gespeicherter Hash nicht
 * mehr zum Inhalt und die Pruefung meldete faelschlich eine Manipulation.
 * Deshalb wird das Protokoll beim vollstaendigen Zuruecksetzen als Ganzes
 * geleert und mit einem Eintrag neu begonnen, der die Zuruecksetzung
 * dokumentiert.
 */
export const GESONDERT = ['auditEintrag'] as const;

export type Loeschtiefe = 'BEWEGUNG' | 'VOLLSTAENDIG';

/** Tabellen, bei denen das eigene Konto ausgenommen werden muss. */
export const EIGENES_KONTO_AUSNEHMEN = ['benutzer', 'sitzungstoken'] as const;

/** Liefert die Tabellen in loeschsicherer Reihenfolge (Kind vor Elternteil). */
export function loeschplan(tiefe: Loeschtiefe): string[] {
  return tiefe === 'BEWEGUNG' ? [...BEWEGUNGSDATEN] : [...BEWEGUNGSDATEN, ...STAMMDATEN];
}

export type Loeschbilanz = { tabelle: string; entfernt: number }[];

type Loeschbar = { deleteMany: (argumente?: { where?: unknown }) => Promise<{ count: number }> };

/**
 * Fuehrt den Plan aus. Der Klient wird bewusst nur strukturell getypt, damit
 * die Funktion in Tests gegen eine Attrappe laufen kann.
 */
export async function fuehreLoeschplanAus(
  klient: Record<string, unknown>,
  tiefe: Loeschtiefe,
  eigenesKonto: string,
): Promise<Loeschbilanz> {
  const bilanz: Loeschbilanz = [];
  for (const tabelle of loeschplan(tiefe)) {
    const delegat = klient[tabelle] as Loeschbar | undefined;
    if (!delegat?.deleteMany) {
      throw new Error(`Tabelle "${tabelle}" ist im Datenmodell nicht vorhanden.`);
    }
    const ausnehmen = (EIGENES_KONTO_AUSNEHMEN as readonly string[]).includes(tabelle);
    const ergebnis = await delegat.deleteMany(
      ausnehmen
        ? { where: tabelle === 'benutzer' ? { id: { not: eigenesKonto } } : { benutzerId: { not: eigenesKonto } } }
        : undefined,
    );
    if (ergebnis.count > 0) bilanz.push({ tabelle, entfernt: ergebnis.count });
  }
  return bilanz;
}

export function summe(bilanz: Loeschbilanz): number {
  return bilanz.reduce((s, z) => s + z.entfernt, 0);
}
