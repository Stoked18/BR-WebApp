/**
 * Eigenschaften der eingehenden Verbindung.
 *
 * Gebraucht wird davon genau eines: laeuft die Anfrage tatsaechlich ueber TLS?
 * Davon haengt ab, ob das Sitzungs-Cookie das Merkmal "Secure" traegt.
 *
 * Warum das nicht an NODE_ENV haengen darf: Das Container-Abbild setzt
 * NODE_ENV=production, weil die Anwendung dort im Produktivmodus laeuft. Das
 * sagt aber nichts darueber, wie der Browser sie erreicht. Wird sie zum
 * Ausprobieren ohne Reverse Proxy ueber eine LAN-Adresse aufgerufen
 * (docs/BETRIEB.md, "Erreichbarkeit fuer einen ersten Test"), setzt der Server
 * ein Secure-Cookie, das der Browser ueber Klartext-HTTP nicht zuruecksendet.
 * Die Anmeldung gelingt, die naechste Anfrage gilt als nicht angemeldet, und
 * man landet wieder auf der Anmeldemaske.
 *
 * Massgeblich ist allein `X-Forwarded-Proto`. Das ist keine Auswahl unter
 * mehreren Moeglichkeiten, sondern Folge einer nachgemessenen Eigenschaft des
 * Next.js-Servers: er ergaenzt `x-forwarded-proto`, `-host`, `-for` und `-port`
 * selbst, sobald sie fehlen, und traegt dort die Werte der tatsaechlichen
 * Verbindung ein. Nachgemessen im Container:
 *
 *   ohne Proxy      -> x-forwarded-proto: http   (vom Server ergaenzt)
 *   TLS-Proxy davor -> x-forwarded-proto: https  (vom Proxy gesetzt)
 *
 * Die Kopfzeile ist damit immer vorhanden. Eine Auswertung von `Forwarded`
 * nach RFC 7239 waere wirkungslos, weil der ergaenzte `x-forwarded-proto` sie
 * ueberdecken wuerde; ein "im Zweifel sicher"-Zweig fuer den Fall einer
 * fehlenden Angabe liefe ins Leere, weil dieser Fall nie eintritt.
 *
 * Daraus folgt eine Betriebsbedingung, die in docs/BETRIEB.md steht: Der
 * Reverse Proxy MUSS `X-Forwarded-Proto` setzen. Tut er es nicht, sieht die
 * Anwendung die unverschluesselte Teilstrecke zwischen Proxy und Container und
 * laesst "Secure" weg. Fuer diesen Fall – und fuer jeden anderen Zweifel – gibt
 * es die Umgebungsvariable SITZUNG_COOKIE_SECURE=ja, die das Merkmal
 * bedingungslos erzwingt.
 */

/**
 * Nur die Kopfzeilen, die hier interessieren – so laesst sich die Funktion
 * ohne Next.js-Laufzeit pruefen.
 */
export type Kopfzeilenleser = { get(name: string): string | null };

let unverschluesseltGemeldet = false;

/**
 * Laeuft die Verbindung zum Browser ueber TLS?
 *
 *  1. Ausdrueckliche Vorgabe aus der Umgebung hat Vorrang.
 *  2. Sonst `X-Forwarded-Proto` (siehe oben: stets vorhanden).
 *  3. Fehlt die Kopfzeile wider Erwarten doch, gilt die Verbindung als
 *     unverschluesselt – der Server von Next.js beendet selbst keine
 *     TLS-Verbindung, ohne vorgelagerten Server ist sie es auch.
 *
 * Zur Frage der Manipulierbarkeit: `X-Forwarded-Proto` kann mitschicken, wer
 * den Dienst unmittelbar erreicht. Damit laesst sich das Cookie aber nur
 * *strenger* stellen – "Secure", obwohl unverschluesselt –, was allein den
 * eigenen Browser aussperrt. Die andere Richtung ist nicht erreichbar: eine
 * echte TLS-Verbindung laeuft stets ueber einen vorgelagerten Server, und
 * dessen Kopfzeile ersetzt die des Aufrufers.
 */
export function verbindungIstVerschluesselt(
  k: Kopfzeilenleser,
  vorgabe: string | undefined = process.env.SITZUNG_COOKIE_SECURE,
): boolean {
  const gewaehlt = (vorgabe ?? 'auto').trim().toLowerCase();
  if (gewaehlt === 'ja' || gewaehlt === 'true' || gewaehlt === '1') return true;
  if (gewaehlt === 'nein' || gewaehlt === 'false' || gewaehlt === '0') return false;

  const weitergeleitet = k.get('x-forwarded-proto');
  if (!weitergeleitet || weitergeleitet.trim() === '') return false;

  // Bei mehreren vorgelagerten Servern steht eine Liste in der Kopfzeile:
  // "https, http". Der erste Eintrag ist der, mit dem der Browser gesprochen
  // hat – nur der zaehlt.
  return weitergeleitet.split(',')[0]!.trim().toLowerCase() === 'https';
}

/**
 * Meldet einmal je Prozess, wenn eine Anmeldesitzung ohne "Secure" vergeben
 * wird. Im erlaubten Erprobungsfall ist das erwartet; im Firmenbetrieb hinter
 * einem TLS-Proxy ist es der Hinweis auf einen Proxy, der
 * `X-Forwarded-Proto` nicht setzt. Ohne diese Zeile bliebe der Unterschied
 * unsichtbar – und genau das soll er nicht.
 */
export function meldeUnverschluesselteSitzung(verschluesselt: boolean): void {
  if (verschluesselt || unverschluesseltGemeldet) return;
  unverschluesseltGemeldet = true;
  console.warn(
    '[Sitzung] Anmeldung ueber eine unverschluesselte Verbindung: das Sitzungs-Cookie ' +
      'wird ohne "Secure" vergeben. Fuer die Erprobung ohne Reverse Proxy ist das so ' +
      'vorgesehen. Im Regelbetrieb hinter TLS deutet es darauf hin, dass der Reverse ' +
      'Proxy "X-Forwarded-Proto" nicht setzt – siehe docs/BETRIEB.md. Mit ' +
      'SITZUNG_COOKIE_SECURE=ja laesst sich das Merkmal erzwingen.',
  );
}

/** Nur fuer Tests: setzt die einmalige Meldung zurueck. */
export function setzeMeldungZurueck(): void {
  unverschluesseltGemeldet = false;
}
