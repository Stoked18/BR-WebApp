/**
 * Verschluesselte Dokumentenablage.
 *
 * Hintergrund: Nach § 79a S. 2 BetrVG ist der Arbeitgeber auch fuer die
 * Verarbeitung personenbezogener Daten durch den Betriebsrat datenschutz-
 * rechtlich Verantwortlicher. Daraus folgt gerade *nicht*, dass der
 * Arbeitgeber Zugriff auf Betriebsratsdaten nehmen darf – die
 * Unabhaengigkeit des Gremiums (§ 78 BetrVG) und die Geheimhaltungspflicht
 * (§ 79 BetrVG) verbieten das.
 *
 * Beim Eigenbetrieb im Unternehmensrechenzentrum administriert jedoch die
 * IT-Abteilung des Arbeitgebers die Maschinen. Damit ein Datenbank- oder
 * Dateisystem-Backup allein keine Betriebsratsunterlagen offenlegt, werden
 * Dokumentinhalte mit einem Schluessel verschluesselt, der ausserhalb von
 * Datenbank und Backup verwahrt wird (Art. 32 Abs. 1 lit. a DSGVO).
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGORITHMUS = 'aes-256-gcm';
const IV_LAENGE = 12;
const TAG_LAENGE = 16;

function schluessel(): Buffer {
  const roh = process.env.DOKUMENT_SCHLUESSEL;
  if (!roh) {
    throw new Error(
      'DOKUMENT_SCHLUESSEL ist nicht gesetzt. Ohne Schluessel werden keine Dokumente ' +
        'verarbeitet, damit nichts versehentlich im Klartext abgelegt wird.',
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(roh)) {
    throw new Error('DOKUMENT_SCHLUESSEL muss aus genau 64 Hexadezimalzeichen bestehen (256 Bit).');
  }
  return Buffer.from(roh, 'hex');
}

/**
 * Verschluesselt Dateiinhalte. Aufbau des Ergebnisses:
 * [12 Byte IV][16 Byte GCM-Tag][Chiffrat]
 */
export function verschluessle(klartext: Buffer): Buffer {
  const iv = randomBytes(IV_LAENGE);
  const cipher = createCipheriv(ALGORITHMUS, schluessel(), iv);
  const chiffrat = Buffer.concat([cipher.update(klartext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), chiffrat]);
}

export function entschluessle(daten: Buffer): Buffer {
  if (daten.length < IV_LAENGE + TAG_LAENGE) {
    throw new Error('Der Datensatz ist zu kurz und kann kein gueltiges Chiffrat sein.');
  }
  const iv = daten.subarray(0, IV_LAENGE);
  const tag = daten.subarray(IV_LAENGE, IV_LAENGE + TAG_LAENGE);
  const chiffrat = daten.subarray(IV_LAENGE + TAG_LAENGE);
  const decipher = createDecipheriv(ALGORITHMUS, schluessel(), iv);
  decipher.setAuthTag(tag);
  // Schlaegt der Integritaetsschutz fehl, wirft final() – das ist gewollt:
  // manipulierte Dokumente duerfen nicht ausgeliefert werden.
  return Buffer.concat([decipher.update(chiffrat), decipher.final()]);
}

export function sha256(daten: Buffer | string): string {
  return createHash('sha256').update(daten).digest('hex');
}

/** Pseudonymisiert eine IP-Adresse fuer das Protokoll (Art. 5 Abs. 1 lit. c DSGVO). */
export function ipPseudonym(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const pfeffer = process.env.AUTH_SECRET ?? '';
  return createHash('sha256').update(`${pfeffer}:${ip}`).digest('hex').slice(0, 32);
}

/** Zeitkonstanter Vergleich zweier Hexadezimal-Zeichenketten. */
export function gleichSicher(a: string, b: string): boolean {
  const pa = Buffer.from(a);
  const pb = Buffer.from(b);
  if (pa.length !== pb.length) return false;
  return timingSafeEqual(pa, pb);
}

/** Prueft beim Start, ob die Umgebung fuer den Produktivbetrieb taugt. */
export function pruefeKonfiguration(): string[] {
  const maengel: string[] = [];
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      maengel.push('AUTH_SECRET fehlt oder ist kuerzer als 32 Zeichen.');
    }
    if (process.env.AUTH_SECRET?.startsWith('dev-only')) {
      maengel.push('AUTH_SECRET ist noch der Entwicklungswert.');
    }
    try {
      schluessel();
    } catch (fehler) {
      maengel.push((fehler as Error).message);
    }
  }
  return maengel;
}
