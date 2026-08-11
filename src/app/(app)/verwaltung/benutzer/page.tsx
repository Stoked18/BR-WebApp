import Link from 'next/link';
import type { Systemrolle } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { ROLLENBEZEICHNUNG } from '@/lib/authz';
import { datumZeit } from '@/lib/format';
import { Karte, Knopf, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';
import { Rueckmeldung } from '@/components/rueckmeldung';
import { aendereRollen, legeBenutzerAn, schalteKonto, setzePasswortZurueck } from '../aktionen';

export const dynamic = 'force-dynamic';

const feld = 'mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm';
const beschriftung = 'block text-xs font-medium text-slate-600';

/** Reihenfolge der Rollen in der Auswahl: erst Gremium, dann übrige. */
const ROLLENGRUPPEN: Array<{ titel: string; rollen: Systemrolle[] }> = [
  {
    titel: 'Betriebsrat und Vertretungen',
    rollen: ['BR_VORSITZ', 'BR_STELLV', 'BR_MITGLIED', 'ERSATZMITGLIED', 'JAV', 'SBV', 'WIRTSCHAFTSAUSSCHUSS', 'AUFSICHTSRAT_AN'],
  },
  { titel: 'Arbeitgeberseite (nur Antragsportal)', rollen: ['AG_PERSONAL', 'AG_FACHBEREICH', 'AG_ARBEITSSICHERHEIT'] },
  { titel: 'Sonderrollen', rollen: ['DSB', 'IT_BETRIEB', 'AUDIT'] },
];

function Rollenauswahl({ vorbelegt, id }: { vorbelegt: Systemrolle[]; id: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ROLLENGRUPPEN.map((gruppe) => (
        <fieldset key={gruppe.titel} className="rounded border border-slate-200 p-2">
          <legend className="px-1 text-xs font-medium text-slate-600">{gruppe.titel}</legend>
          <div className="space-y-1">
            {gruppe.rollen.map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" name="rollen" value={r} defaultChecked={vorbelegt.includes(r)} id={`${id}-${r}`} />
                {ROLLENBEZEICHNUNG[r]}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export default async function Benutzerverwaltung({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fehler?: string; bearbeiten?: string }>;
}) {
  const handelnder = await verlangeRecht('benutzer.verwalten');
  const { ok, fehler, bearbeiten } = await searchParams;

  const [konten, personenOhneKonto] = await Promise.all([
    prisma.benutzer.findMany({
      orderBy: [{ aktiv: 'desc' }, { anzeigename: 'asc' }],
      include: { person: { select: { vorname: true, nachname: true, abteilung: true } } },
    }),
    prisma.person.findMany({
      where: { aktiv: true, benutzer: null },
      orderBy: [{ nachname: 'asc' }, { vorname: 'asc' }],
      select: { id: true, vorname: true, nachname: true, abteilung: true },
    }),
  ]);

  const jetzt = new Date();

  return (
    <>
      <Seitenkopf
        titel="Benutzerkonten"
        beschreibung="Zugänge anlegen, Rollen zuweisen, Kennwörter zurücksetzen. Jede Änderung steht im Zugriffsprotokoll."
        aktion={
          <Link
            href="/verwaltung"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Zurück zur Verwaltung
          </Link>
        }
      />

      <Rueckmeldung ok={ok} fehler={fehler} />

      <div className="space-y-6">
        <Karte titel={`Konten (${konten.length})`}>
          <Tabelle kopf={['Name', 'Kennung', 'Rollen', 'Zustand', 'Zuletzt angemeldet', '']}>
            {konten.map((k) => {
              const gesperrt = k.gesperrtBis && k.gesperrtBis > jetzt;
              const offen = bearbeiten === k.id;
              return (
                <tr key={k.id} className="align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium text-slate-900">{k.anzeigename}</div>
                    {k.person && (
                      <div className="text-xs text-slate-500">
                        {k.person.vorname} {k.person.nachname}
                        {k.person.abteilung ? ` · ${k.person.abteilung}` : ''}
                      </div>
                    )}
                    {k.id === handelnder.id && <div className="text-xs text-slate-400">Ihr eigenes Konto</div>}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">{k.email}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {k.rollen.length === 0 && <span className="text-xs text-slate-400">—</span>}
                      {k.rollen.map((r) => (
                        <Marke key={r}>{ROLLENBEZEICHNUNG[r]}</Marke>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Marke ton={k.aktiv ? 'gruen' : 'neutral'}>{k.aktiv ? 'aktiv' : 'deaktiviert'}</Marke>
                      {gesperrt && <Marke ton="rot">gesperrt</Marke>}
                      {k.passwortWechsel && <Marke ton="gelb">Kennwortwechsel offen</Marke>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">{datumZeit(k.letzterLogin)}</td>
                  <td className="px-2 py-2 text-right">
                    {!offen ? (
                      <Link
                        href={`/verwaltung/benutzer?bearbeiten=${k.id}`}
                        className="text-xs font-medium text-marke-700 hover:underline"
                      >
                        Bearbeiten
                      </Link>
                    ) : (
                      <Link href="/verwaltung/benutzer" className="text-xs text-slate-500 hover:underline">
                        Schließen
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tabelle>
        </Karte>

        {bearbeiten &&
          (() => {
            const konto = konten.find((k) => k.id === bearbeiten);
            if (!konto) return null;
            const eigenes = konto.id === handelnder.id;
            return (
              <Karte titel={`Konto bearbeiten: ${konto.anzeigename}`} hinweis={konto.email}>
                <div className="space-y-6">
                  <form action={aendereRollen} className="space-y-3">
                    <input type="hidden" name="id" value={konto.id} />
                    <p className="text-xs font-medium text-slate-600">Rollen</p>
                    <Rollenauswahl vorbelegt={konto.rollen} id={konto.id} />
                    {eigenes ? (
                      <p className="text-xs text-slate-500">
                        Die eigenen Rollen lassen sich hier nicht ändern. Damit ist ausgeschlossen, dass
                        sich der Vorsitz versehentlich selbst den Zugang entzieht.
                      </p>
                    ) : (
                      <Knopf>Rollen speichern</Knopf>
                    )}
                  </form>

                  <div className="border-t border-slate-200 pt-4">
                    <form action={setzePasswortZurueck} className="space-y-2">
                      <input type="hidden" name="id" value={konto.id} />
                      <label htmlFor={`pw-${konto.id}`} className={beschriftung}>
                        Neues Kennwort setzen
                      </label>
                      <input
                        id={`pw-${konto.id}`}
                        name="passwort"
                        type="password"
                        autoComplete="new-password"
                        className={`${feld} max-w-sm`}
                      />
                      <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
                        Mindestens zwölf Zeichen. Das Kennwort ist persönlich zu übergeben, nicht per
                        E-Mail. Beim nächsten Anmelden muss es gewechselt werden; laufende Anmeldungen
                        dieses Kontos werden sofort beendet.
                      </p>
                      <Knopf variante="sekundaer">Kennwort setzen</Knopf>
                    </form>
                  </div>

                  {!eigenes && (
                    <div className="border-t border-slate-200 pt-4">
                      <form action={schalteKonto}>
                        <input type="hidden" name="id" value={konto.id} />
                        <input type="hidden" name="aktiv" value={konto.aktiv ? 'nein' : 'ja'} />
                        <Knopf variante={konto.aktiv ? 'gefahr' : 'sekundaer'}>
                          {konto.aktiv ? 'Konto deaktivieren' : 'Konto aktivieren'}
                        </Knopf>
                        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                          Konten werden deaktiviert, nicht gelöscht. Ein gelöschtes Konto risse Lücken in
                          die Zuordnung der Protokolleinträge; der Nachweis, wer wann auf welche Unterlage
                          zugegriffen hat, ginge verloren. Beim Ausscheiden aus dem Amt (§ 24 BetrVG) ist
                          das Konto zu deaktivieren.
                        </p>
                      </form>
                    </div>
                  )}
                </div>
              </Karte>
            );
          })()}

        <Karte titel="Neues Konto anlegen">
          <form action={legeBenutzerAn} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="anzeigename" className={beschriftung}>Anzeigename</label>
                <input id="anzeigename" name="anzeigename" required className={feld} />
              </div>
              <div>
                <label htmlFor="email" className={beschriftung}>Dienstliche E-Mail-Adresse</label>
                <input id="email" name="email" type="email" required autoComplete="off" className={feld} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="personId" className={beschriftung}>Verknüpfte Person (optional)</label>
                <select id="personId" name="personId" className={feld} defaultValue="">
                  <option value="">— keine —</option>
                  {personenOhneKonto.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nachname}, {p.vorname}
                      {p.abteilung ? ` (${p.abteilung})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Nötig, damit Teilnahmen und Aufgaben dem Konto zugeordnet werden.
                </p>
              </div>
              <div>
                <label htmlFor="neu-passwort" className={beschriftung}>Erstes Kennwort</label>
                <input id="neu-passwort" name="passwort" type="password" required autoComplete="new-password" className={feld} />
                <p className="mt-1 text-xs text-slate-500">
                  Mindestens zwölf Zeichen; wird beim ersten Anmelden gewechselt.
                </p>
              </div>
            </div>

            <div>
              <p className={`${beschriftung} mb-2`}>Rollen</p>
              <Rollenauswahl vorbelegt={[]} id="neu" />
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">
                Konten der Arbeitgeberseite sehen ausschließlich ihre eigenen Anträge und die dazu
                ergangene Antwort – interne Beratungen und Abstimmungen bleiben ihnen nach
                §§ 78, 79 BetrVG verschlossen. Wird zusätzlich eine Gremiumsrolle vergeben, gilt das
                Konto als Gremiumsseite und sieht die internen Beratungen; das ist nur richtig, wenn
                die Person dem Betriebsrat tatsächlich angehört. Nicht möglich ist die Verbindung
                einer Arbeitgeberrolle mit der Datenschutzbeauftragung (§ 79a S. 3 BetrVG) oder mit
                der Revision.
              </p>
            </div>

            <Knopf>Konto anlegen</Knopf>
          </form>
        </Karte>

        <Rechtshinweis norm="Art. 32 DSGVO, § 79 BetrVG">
          Zugänge sind auf den Kreis zu beschränken, der sie zur Aufgabenerfüllung braucht. Beim
          Ausscheiden aus dem Betriebsrat oder aus dem Betrieb ist das Konto unverzüglich zu
          deaktivieren. Kennwörter werden mit Argon2id gespeichert und sind auch für den Vorsitz
          nicht lesbar; ein vergessenes Kennwort wird ersetzt, nicht ausgelesen.
        </Rechtshinweis>
      </div>
    </>
  );
}
