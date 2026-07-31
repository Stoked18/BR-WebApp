/**
 * Anmeldung und Sitzungsverwaltung.
 *
 * Bewusst ohne externe Abhaengigkeit zu einem Identitaetsanbieter, damit die
 * Anwendung auch in einem abgeschotteten Netz ohne Internetzugang laeuft.
 * Fuer den Regelbetrieb ist die Anbindung an Keycloak ueber OIDC vorgesehen
 * (Feld Benutzer.oidcSubject); die lokale Anmeldung bleibt als Rueckfallweg.
 */

import 'server-only';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import { ipPseudonym, sha256 } from './krypto';
import { protokolliere } from './audit';
import { pruefePasswort } from './passwort';
import { darf, type Recht, type Sitzungsbenutzer } from './authz';

const COOKIE = 'br_sitzung';
const GUELTIGKEIT_STUNDEN = 10; // etwa eine Schicht plus Puffer
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MINUTEN = 15;

export type Anmeldeergebnis =
  | { erfolg: true; benutzer: Sitzungsbenutzer; passwortWechsel: boolean }
  | { erfolg: false; fehler: string };

export async function melde_an(email: string, passwort: string): Promise<Anmeldeergebnis> {
  const kopfzeilen = await headers();
  const ip = ipPseudonym(kopfzeilen.get('x-forwarded-for')?.split(',')[0]?.trim());

  const benutzer = await prisma.benutzer.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Einheitliche Fehlermeldung, damit sich ueber die Anmeldemaske nicht
  // herausfinden laesst, wer im Betriebsratssystem hinterlegt ist.
  const abgelehnt = { erfolg: false as const, fehler: 'Anmeldedaten sind nicht korrekt.' };

  if (!benutzer || !benutzer.aktiv || !benutzer.passwortHash) {
    await protokolliere({
      aktion: 'ANMELDUNG_FEHLGESCHLAGEN',
      entitaet: 'Benutzer',
      details: `Unbekannte oder gesperrte Kennung: ${email}`,
      ipHash: ip,
    });
    return abgelehnt;
  }

  if (benutzer.gesperrtBis && benutzer.gesperrtBis > new Date()) {
    return {
      erfolg: false,
      fehler: `Das Konto ist bis ${benutzer.gesperrtBis.toLocaleTimeString('de-DE')} gesperrt.`,
    };
  }

  const stimmt = await pruefePasswort(benutzer.passwortHash, passwort);

  if (!stimmt) {
    const fehlversuche = benutzer.fehlversuche + 1;
    await prisma.benutzer.update({
      where: { id: benutzer.id },
      data: {
        fehlversuche,
        gesperrtBis:
          fehlversuche >= MAX_FEHLVERSUCHE ? new Date(Date.now() + SPERRE_MINUTEN * 60_000) : null,
      },
    });
    await protokolliere({
      benutzerId: benutzer.id,
      benutzerName: benutzer.anzeigename,
      aktion: 'ANMELDUNG_FEHLGESCHLAGEN',
      entitaet: 'Benutzer',
      entitaetId: benutzer.id,
      details: `Fehlversuch ${fehlversuche} von ${MAX_FEHLVERSUCHE}`,
      ipHash: ip,
    });
    return abgelehnt;
  }

  const roh = randomBytes(32).toString('hex');
  const laeuftAbAm = new Date(Date.now() + GUELTIGKEIT_STUNDEN * 3_600_000);

  await prisma.$transaction([
    prisma.sitzungstoken.create({
      data: {
        benutzerId: benutzer.id,
        tokenHash: sha256(roh),
        laeuftAbAm,
        ipHash: ip,
        userAgent: kopfzeilen.get('user-agent')?.slice(0, 200) ?? null,
      },
    }),
    prisma.benutzer.update({
      where: { id: benutzer.id },
      data: { letzterLogin: new Date(), fehlversuche: 0, gesperrtBis: null },
    }),
  ]);

  const kekse = await cookies();
  kekse.set(COOKIE, roh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: laeuftAbAm,
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANMELDUNG',
    entitaet: 'Benutzer',
    entitaetId: benutzer.id,
    ipHash: ip,
  });

  return {
    erfolg: true,
    passwortWechsel: benutzer.passwortWechsel,
    benutzer: {
      id: benutzer.id,
      anzeigename: benutzer.anzeigename,
      email: benutzer.email,
      rollen: benutzer.rollen,
      personId: benutzer.personId,
    },
  };
}

export async function melde_ab(): Promise<void> {
  const kekse = await cookies();
  const roh = kekse.get(COOKIE)?.value;
  if (roh) {
    const token = await prisma.sitzungstoken.findUnique({
      where: { tokenHash: sha256(roh) },
      include: { benutzer: { select: { id: true, anzeigename: true } } },
    });
    if (token) {
      await prisma.sitzungstoken.update({ where: { id: token.id }, data: { widerrufen: true } });
      await protokolliere({
        benutzerId: token.benutzer.id,
        benutzerName: token.benutzer.anzeigename,
        aktion: 'ABMELDUNG',
        entitaet: 'Benutzer',
        entitaetId: token.benutzer.id,
      });
    }
  }
  kekse.delete(COOKIE);
}

/** Liefert die angemeldete Person oder null. */
export async function aktuellerBenutzer(): Promise<Sitzungsbenutzer | null> {
  const kekse = await cookies();
  const roh = kekse.get(COOKIE)?.value;
  if (!roh) return null;

  const token = await prisma.sitzungstoken.findUnique({
    where: { tokenHash: sha256(roh) },
    include: { benutzer: true },
  });

  if (!token || token.widerrufen || token.laeuftAbAm < new Date() || !token.benutzer.aktiv) {
    return null;
  }

  return {
    id: token.benutzer.id,
    anzeigename: token.benutzer.anzeigename,
    email: token.benutzer.email,
    rollen: token.benutzer.rollen,
    personId: token.benutzer.personId,
  };
}

/** Wie aktuellerBenutzer, wirft aber, wenn niemand angemeldet ist. */
export async function verlangeBenutzer(): Promise<Sitzungsbenutzer> {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) redirect('/anmeldung');
  return benutzer;
}

/**
 * Verlangt Anmeldung *und* ein bestimmtes Recht.
 *
 * Jede geschuetzte Seite ruft diese Funktion auf. Das Ausblenden von
 * Menuepunkten allein genuegt nicht: wer die Adresse kennt, kaeme sonst an
 * Sitzungsverlaeufe und Beschluesse. Genau das verbieten §§ 78, 79 BetrVG
 * gegenueber der Arbeitgeberseite.
 */
export async function verlangeRecht(recht: Recht): Promise<Sitzungsbenutzer> {
  const benutzer = await verlangeBenutzer();
  if (!darf(benutzer, recht)) {
    await protokolliere({
      benutzerId: benutzer.id,
      benutzerName: benutzer.anzeigename,
      aktion: 'LESEN',
      entitaet: 'Zugriffsverweigerung',
      details: `Zugriff ohne das Recht "${recht}" versucht.`,
    });
    // Kein Hinweis auf die Existenz der Seite – die Arbeitgeberseite soll aus
    // Fehlermeldungen nichts ueber die Binnenstruktur des Gremiums lernen.
    notFound();
  }
  return benutzer;
}

/** Entfernt abgelaufene Sitzungstokens – aus dem Aufraeumlauf heraus aufzurufen. */
export async function raeumeTokensAuf(): Promise<number> {
  const ergebnis = await prisma.sitzungstoken.deleteMany({
    where: { OR: [{ laeuftAbAm: { lt: new Date() } }, { widerrufen: true }] },
  });
  return ergebnis.count;
}
