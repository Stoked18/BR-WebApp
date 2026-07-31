/**
 * Anwesenheit und Beschlussfaehigkeit einer Sitzung.
 *
 * Wichtige Unterscheidung, die im Alltag oft verwischt wird:
 *
 *  - Vor der Sitzung gibt es nur eine *Prognose*. Wer geladen ist, ist noch
 *    nicht anwesend. Aus ihr laesst sich ablesen, ob die Sitzung voraussichtlich
 *    beschlussfaehig wird – mehr nicht.
 *  - § 33 Abs. 2 BetrVG stellt auf die *tatsaechliche Teilnahme an der
 *    Beschlussfassung* ab. Erst wenn die Anwesenheit in der Sitzung festgestellt
 *    ist, steht die Beschlussfaehigkeit fest.
 *
 * Deshalb duerfen Beschluesse erst erfasst werden, wenn die Anwesenheit
 * festgestellt wurde. Andernfalls entstuende ein Beschluss auf einer
 * Zahlenbasis, die es nie gegeben hat.
 */

import type { Sitzungsstatus, Teilnahmestatus } from '@prisma/client';
import { pruefeBeschlussfaehigkeit, type Beschlussfaehigkeit } from './betrvg';

/** Status, in denen die Anwesenheit noch nicht festgestellt ist. */
const VOR_DER_SITZUNG: Sitzungsstatus[] = ['GEPLANT', 'EINGELADEN'];

export function istVorDerSitzung(status: Sitzungsstatus): boolean {
  return VOR_DER_SITZUNG.includes(status);
}

export type Teilnahmezeile = {
  personId: string;
  status: Teilnahmestatus;
  stimmberechtigt: boolean;
};

/** Zaehlt die tatsaechlich an der Beschlussfassung Teilnehmenden. */
export function zaehleAnwesend(teilnahmen: Teilnahmezeile[]): number {
  return teilnahmen.filter(
    (t) => t.stimmberechtigt && (t.status === 'ANWESEND' || t.status === 'TEILWEISE'),
  ).length;
}

/** Zaehlt, wer geladen ist – also die Prognose vor der Sitzung. */
export function zaehleGeladen(teilnahmen: Teilnahmezeile[]): number {
  return teilnahmen.filter(
    (t) => t.stimmberechtigt && (t.status === 'GELADEN' || t.status === 'ANWESEND' || t.status === 'TEILWEISE'),
  ).length;
}

export type Anwesenheitslage = {
  /** true, solange die Anwesenheit noch nicht foermlich festgestellt wurde. */
  prognose: boolean;
  /** Zahl der stimmberechtigt Teilnehmenden bzw. Erwarteten. */
  zahl: number;
  gremiumsgroesse: number;
  erforderlich: number;
  /** Nur ausserhalb der Prognose belastbar. */
  ausreichend: boolean;
  /** Duerfen jetzt Beschluesse erfasst werden? */
  beschlussfassungMoeglich: boolean;
  text: string;
  pruefung: Beschlussfaehigkeit;
};

/**
 * Ermittelt die Anwesenheitslage.
 *
 * @param gremiumsgroesse  gesetzliche Mitgliederzahl (§ 9 BetrVG) bzw. Ausschussgroesse
 * @param teilnahmen       erfasste Teilnahmezeilen
 * @param verhinderungen   Zahl der gemeldeten Verhinderungen
 * @param status           Status der Sitzung
 */
export function anwesenheitslage(
  gremiumsgroesse: number,
  teilnahmen: Teilnahmezeile[],
  verhinderungen: number,
  status: Sitzungsstatus,
): Anwesenheitslage {
  const prognose = istVorDerSitzung(status);

  if (prognose) {
    // Erwartet werden alle ordentlichen Mitglieder abzueglich der Verhinderten,
    // zuzueglich der dafuer geladenen Ersatzmitglieder. Letztere stehen bereits
    // als Teilnahmezeile mit Status GELADEN in der Liste.
    const geladeneErsatz = teilnahmen.filter((t) => t.status === 'GELADEN' && t.stimmberechtigt).length;
    const zahl = gremiumsgroesse - verhinderungen + geladeneErsatz;
    const pruefung = pruefeBeschlussfaehigkeit(gremiumsgroesse, zahl);
    return {
      prognose: true,
      zahl,
      gremiumsgroesse,
      erforderlich: pruefung.erforderlich,
      ausreichend: zahl >= pruefung.erforderlich,
      beschlussfassungMoeglich: false,
      text:
        `Voraussichtlich nehmen ${zahl} von ${gremiumsgroesse} stimmberechtigten Mitgliedern teil; ` +
        `§ 33 Abs. 2 BetrVG verlangt mindestens ${pruefung.erforderlich}. ` +
        (verhinderungen > 0
          ? `${verhinderungen} Verhinderung(en) gemeldet, dafür ${geladeneErsatz} Ersatzmitglied(er) geladen. `
          : '') +
        'Maßgeblich ist die tatsächliche Teilnahme; sie ist zu Beginn der Sitzung festzustellen.',
      pruefung,
    };
  }

  const zahl = zaehleAnwesend(teilnahmen);
  const pruefung = pruefeBeschlussfaehigkeit(gremiumsgroesse, zahl);
  return {
    prognose: false,
    zahl,
    gremiumsgroesse,
    erforderlich: pruefung.erforderlich,
    ausreichend: pruefung.beschlussfaehig,
    beschlussfassungMoeglich: pruefung.beschlussfaehig,
    text: pruefung.begruendung,
    pruefung,
  };
}
