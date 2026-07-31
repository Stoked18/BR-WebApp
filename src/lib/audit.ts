/**
 * Revisionssicheres Protokoll.
 *
 * Zweck ist doppelt: Art. 5 Abs. 2 DSGVO verlangt vom Verantwortlichen den
 * Nachweis rechtmaessiger Verarbeitung, und der Betriebsrat muss belegen
 * koennen, dass niemand – auch nicht die IT des Arbeitgebers – unbemerkt in
 * seine Unterlagen gesehen hat (§§ 78, 79 BetrVG).
 *
 * Die Eintraege werden ueber eine Hash-Kette verbunden: jeder Eintrag enthaelt
 * den Hash seines Vorgaengers. Wird ein Eintrag nachtraeglich geaendert oder
 * geloescht, bricht die Kette und faellt bei der Pruefung auf.
 */

import { createHash } from 'node:crypto';
import type { Auditaktion } from '@prisma/client';
import { prisma } from './prisma';

export type Auditdaten = {
  benutzerId?: string | null;
  benutzerName?: string | null;
  aktion: Auditaktion;
  entitaet: string;
  entitaetId?: string | null;
  details?: string | null;
  ipHash?: string | null;
};

function bildeHash(vorheriger: string | null, zeitpunkt: Date, daten: Auditdaten): string {
  const nutzdaten = JSON.stringify({
    v: vorheriger ?? '',
    z: zeitpunkt.toISOString(),
    b: daten.benutzerId ?? '',
    n: daten.benutzerName ?? '',
    a: daten.aktion,
    e: daten.entitaet,
    i: daten.entitaetId ?? '',
    d: daten.details ?? '',
  });
  return createHash('sha256').update(nutzdaten).digest('hex');
}

/**
 * Schreibt einen Protokolleintrag. Die Kettenbildung laeuft in einer
 * Transaktion mit serialisierbarer Isolation, damit zwei gleichzeitige
 * Schreibvorgaenge nicht denselben Vorgaenger beanspruchen.
 */
export async function protokolliere(daten: Auditdaten): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        const letzter = await tx.auditEintrag.findFirst({
          orderBy: { zeitpunkt: 'desc' },
          select: { hash: true },
        });
        const zeitpunkt = new Date();
        const hash = bildeHash(letzter?.hash ?? null, zeitpunkt, daten);
        await tx.auditEintrag.create({
          data: {
            zeitpunkt,
            benutzerId: daten.benutzerId ?? null,
            benutzerName: daten.benutzerName ?? null,
            aktion: daten.aktion,
            entitaet: daten.entitaet,
            entitaetId: daten.entitaetId ?? null,
            details: daten.details ?? null,
            ipHash: daten.ipHash ?? null,
            vorherigerHash: letzter?.hash ?? null,
            hash,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (fehler) {
    // Ein fehlgeschlagenes Protokoll darf den Fachvorgang nicht abbrechen,
    // muss aber sichtbar bleiben.
    console.error('[Audit] Eintrag konnte nicht geschrieben werden:', fehler);
  }
}

export type Kettenpruefung = {
  unversehrt: boolean;
  geprueft: number;
  ersterFehler: { id: string; zeitpunkt: Date; grund: string } | null;
};

/**
 * Prueft die Hash-Kette vom aeltesten Eintrag an. Sollte regelmaessig
 * laufen (z. B. woechentlich) und das Ergebnis dem Gremium berichtet werden.
 */
export async function pruefeKette(grenze = 50_000): Promise<Kettenpruefung> {
  const eintraege = await prisma.auditEintrag.findMany({
    orderBy: { zeitpunkt: 'asc' },
    take: grenze,
  });

  let vorheriger: string | null = null;
  for (const e of eintraege) {
    if ((e.vorherigerHash ?? null) !== vorheriger) {
      return {
        unversehrt: false,
        geprueft: eintraege.length,
        ersterFehler: {
          id: e.id,
          zeitpunkt: e.zeitpunkt,
          grund: 'Der gespeicherte Vorgaengerhash passt nicht zum tatsaechlichen Vorgaenger. ' +
            'Das deutet auf einen geloeschten oder nachtraeglich eingefuegten Eintrag hin.',
        },
      };
    }
    const erwartet = bildeHash(vorheriger, e.zeitpunkt, {
      benutzerId: e.benutzerId,
      benutzerName: e.benutzerName,
      aktion: e.aktion,
      entitaet: e.entitaet,
      entitaetId: e.entitaetId,
      details: e.details,
    });
    if (erwartet !== e.hash) {
      return {
        unversehrt: false,
        geprueft: eintraege.length,
        ersterFehler: {
          id: e.id,
          zeitpunkt: e.zeitpunkt,
          grund: 'Der Hash des Eintrags passt nicht zu seinem Inhalt. Der Eintrag wurde veraendert.',
        },
      };
    }
    vorheriger = e.hash;
  }

  return { unversehrt: true, geprueft: eintraege.length, ersterFehler: null };
}
