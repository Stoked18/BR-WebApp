import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  meldeUnverschluesselteSitzung,
  setzeMeldungZurueck,
  verbindungIstVerschluesselt,
} from './verbindung';

/** Kopfzeilen-Attrappe; Namen werden wie im Web unabhaengig von Gross-/Kleinschreibung gelesen. */
function kopf(eintraege: Record<string, string> = {}) {
  const karte = new Map(Object.entries(eintraege).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => karte.get(name.toLowerCase()) ?? null };
}

/**
 * Die beiden Kopfzeilensaetze stammen nicht aus der Vorstellung, sondern aus
 * einer Messung am laufenden Container (siehe Kommentar in verbindung.ts):
 * Next.js ergaenzt fehlende x-forwarded-*-Kopfzeilen selbst mit den Werten der
 * tatsaechlichen Verbindung.
 */
const OHNE_PROXY = kopf({
  host: '192.168.178.40:3002',
  'x-forwarded-for': '192.168.178.20',
  'x-forwarded-host': '192.168.178.40:3002',
  'x-forwarded-port': '3000',
  'x-forwarded-proto': 'http',
});

const HINTER_TLS_PROXY = kopf({
  host: 'app:3000',
  'x-forwarded-for': '10.12.4.88',
  'x-forwarded-host': 'betriebsrat.betrieb.intern',
  'x-forwarded-port': '3000',
  'x-forwarded-proto': 'https',
});

describe('Die beiden Faelle aus der Betriebsanleitung', () => {
  it('Erprobung ueber LAN-Adresse ohne Proxy: kein Secure, Anmeldung funktioniert', () => {
    expect(verbindungIstVerschluesselt(OHNE_PROXY, 'auto')).toBe(false);
  });

  it('Firmenbetrieb hinter TLS-Proxy: Cookie bleibt geschuetzt', () => {
    expect(verbindungIstVerschluesselt(HINTER_TLS_PROXY, 'auto')).toBe(true);
  });
});

describe('Auswertung von X-Forwarded-Proto', () => {
  it('erkennt https', () => {
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': 'https' }), 'auto')).toBe(true);
  });

  it('erkennt http', () => {
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': 'http' }), 'auto')).toBe(false);
  });

  it('ist unempfindlich gegen Gross-/Kleinschreibung und Leerzeichen', () => {
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': '  HTTPS ' }), 'auto')).toBe(true);
  });

  it('nimmt bei einer Kette den ersten Eintrag – den zum Browser', () => {
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': 'https, http' }), 'auto')).toBe(true);
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': 'http, https' }), 'auto')).toBe(false);
  });

  it('gilt ohne die Kopfzeile als unverschluesselt', () => {
    // Tritt hinter dem Next.js-Server nicht auf, ist aber die richtige
    // Vorgabe: ohne vorgelagerten Server gibt es kein TLS.
    expect(verbindungIstVerschluesselt(kopf(), 'auto')).toBe(false);
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': '' }), 'auto')).toBe(false);
  });

  it('wertet andere Weiterleitungskopfzeilen bewusst nicht aus', () => {
    // Der von Next.js ergaenzte x-forwarded-proto wuerde sie ohnehin
    // ueberdecken; eine Auswertung taeuschte eine Wirkung nur vor.
    const nurRfc7239 = kopf({ forwarded: 'for=10.0.0.7;proto=https', 'x-forwarded-proto': 'http' });
    expect(verbindungIstVerschluesselt(nurRfc7239, 'auto')).toBe(false);
  });
});

describe('Ausdrueckliche Vorgabe aus der Umgebung', () => {
  it('erzwingt Secure – der Rueckhalt fuer einen Proxy ohne X-Forwarded-Proto', () => {
    expect(verbindungIstVerschluesselt(OHNE_PROXY, 'ja')).toBe(true);
    expect(verbindungIstVerschluesselt(kopf({ 'x-forwarded-proto': 'http' }), 'ja')).toBe(true);
  });

  it('schaltet Secure ab, wenn ausdruecklich verlangt', () => {
    expect(verbindungIstVerschluesselt(HINTER_TLS_PROXY, 'nein')).toBe(false);
  });

  it('akzeptiert die gebraeuchlichen Schreibweisen', () => {
    for (const wert of ['ja', 'JA', ' true ', '1']) {
      expect(verbindungIstVerschluesselt(OHNE_PROXY, wert), wert).toBe(true);
    }
    for (const wert of ['nein', 'FALSE', '0']) {
      expect(verbindungIstVerschluesselt(HINTER_TLS_PROXY, wert), wert).toBe(false);
    }
  });

  it('faellt bei unbekanntem Wert auf die Erkennung zurueck', () => {
    expect(verbindungIstVerschluesselt(HINTER_TLS_PROXY, 'vielleicht')).toBe(true);
    expect(verbindungIstVerschluesselt(OHNE_PROXY, 'vielleicht')).toBe(false);
  });

  it('behandelt eine nicht gesetzte Umgebungsvariable wie "auto"', () => {
    expect(verbindungIstVerschluesselt(HINTER_TLS_PROXY, undefined)).toBe(true);
    expect(verbindungIstVerschluesselt(OHNE_PROXY, undefined)).toBe(false);
  });
});

describe('Sichtbarkeit einer unverschluesselten Sitzung', () => {
  beforeEach(() => setzeMeldungZurueck());

  it('meldet einmal, wenn ohne Secure vergeben wird', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    meldeUnverschluesselteSitzung(false);
    meldeUnverschluesselteSitzung(false);
    meldeUnverschluesselteSitzung(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/X-Forwarded-Proto/);
    warn.mockRestore();
  });

  it('schweigt bei verschluesselter Verbindung', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    meldeUnverschluesselteSitzung(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
