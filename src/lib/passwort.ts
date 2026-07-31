/**
 * Passworthashing – eigenes Modul, damit es sowohl im Serverkontext als auch
 * in Wartungsskripten (Seed, Benutzeranlage) ohne Next.js-Laufzeit nutzbar ist.
 */

import argon2 from 'argon2';

const ARGON_OPTIONEN = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB – Empfehlung von BSI und OWASP fuer Argon2id
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashePasswort(passwort: string): Promise<string> {
  return argon2.hash(passwort, ARGON_OPTIONEN);
}

export async function pruefePasswort(hash: string, passwort: string): Promise<boolean> {
  return argon2.verify(hash, passwort).catch(() => false);
}

export type Passwortpruefung = { tauglich: boolean; maengel: string[] };

/**
 * Mindestanforderungen in Anlehnung an BSI TR-02102 und die Orientierungshilfe
 * der Aufsichtsbehoerden: Laenge vor Komplexitaet.
 */
export function pruefePasswortstaerke(passwort: string): Passwortpruefung {
  const maengel: string[] = [];
  if (passwort.length < 12) maengel.push('Das Passwort muss mindestens 12 Zeichen lang sein.');
  if (!/[a-zaeoeuess]/i.test(passwort)) maengel.push('Es muss mindestens einen Buchstaben enthalten.');
  if (!/[0-9]/.test(passwort) && !/[^a-zA-Z0-9]/.test(passwort)) {
    maengel.push('Es muss mindestens eine Ziffer oder ein Sonderzeichen enthalten.');
  }
  const schwach = ['passwort', 'betriebsrat', '12345678', 'qwertz', 'sommer', 'winter'];
  if (schwach.some((s) => passwort.toLowerCase().includes(s))) {
    maengel.push('Das Passwort enthaelt eine leicht zu erratende Zeichenfolge.');
  }
  return { tauglich: maengel.length === 0, maengel };
}
