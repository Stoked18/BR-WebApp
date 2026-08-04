import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { erforderlicheTeilnehmer } from '@/lib/betrvg';
import { datum, datumZeit, uhrzeit } from '@/lib/format';
import { Karte, Knopf, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';
import { legeSitzungAn } from './aktionen';

export const dynamic = 'force-dynamic';

const STATUSTON = {
  GEPLANT: 'neutral',
  EINGELADEN: 'blau',
  LAUFEND: 'gelb',
  ABGESCHLOSSEN: 'gelb',
  PROTOKOLL_ENTWURF: 'gelb',
  PROTOKOLL_FREIGEGEBEN: 'gruen',
  ABGESAGT: 'rot',
} as const;

const STATUSTEXT = {
  GEPLANT: 'geplant',
  EINGELADEN: 'eingeladen',
  LAUFEND: 'läuft',
  ABGESCHLOSSEN: 'abgeschlossen',
  PROTOKOLL_ENTWURF: 'Protokollentwurf',
  PROTOKOLL_FREIGEGEBEN: 'Protokoll freigegeben',
  ABGESAGT: 'abgesagt',
} as const;

const ARTTEXT: Record<string, string> = {
  ORDENTLICH: 'Betriebsratssitzung',
  AUSSERORDENTLICH: 'außerordentliche Sitzung',
  AUSSCHUSS: 'Ausschusssitzung',
  BETRIEBSVERSAMMLUNG: 'Betriebsversammlung',
  ABTEILUNGSVERSAMMLUNG: 'Abteilungsversammlung',
  MONATSGESPRAECH: 'Monatsgespräch',
  ASA: 'Arbeitsschutzausschuss',
};

export default async function Sitzungen({
  searchParams,
}: {
  searchParams: Promise<{ neu?: string; art?: string }>;
}) {
  const benutzer = await verlangeRecht('sitzung.lesen');
  const { neu, art: vorgabeArt } = await searchParams;
  const jetzt = new Date();

  const [gremium, kommende, vergangene, ausschuesse] = await Promise.all([
    prisma.gremium.findFirst({ where: { typ: 'BETRIEBSRAT' } }),
    prisma.sitzung.findMany({
      where: { beginn: { gte: jetzt } },
      orderBy: { beginn: 'asc' },
      include: {
        ausschuss: true,
        _count: { select: { tops: true, verhinderungen: true } },
      },
    }),
    prisma.sitzung.findMany({
      where: { beginn: { lt: jetzt } },
      orderBy: { beginn: 'desc' },
      take: 15,
      include: {
        ausschuss: true,
        niederschrift: { select: { freigegebenAm: true } },
        _count: { select: { tops: true, teilnahmen: true } },
      },
    }),
    prisma.ausschuss.findMany({ where: { aktiv: true }, orderBy: { bezeichnung: 'asc' } }),
  ]);

  const noetig = erforderlicheTeilnehmer(gremium?.sollGroesse ?? 0);
  const kannPlanen = darf(benutzer, 'sitzung.planen');

  // Vorbelegung fuer den Beginn: naechster Werktag, 13:00 Uhr – im
  // vollkontinuierlichen Betrieb liegt der Nachmittag zwischen Frueh- und
  // Spaetschicht und erreicht damit die meisten Mitglieder.
  const vorschlag = new Date(jetzt);
  vorschlag.setDate(vorschlag.getDate() + 14);
  vorschlag.setHours(13, 0, 0, 0);
  const vorschlagWert = new Date(vorschlag.getTime() - vorschlag.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  return (
    <>
      <Seitenkopf
        titel="Sitzungen"
        beschreibung="Ladung, Tagesordnung, Anwesenheit und Niederschrift. Beschlüsse des Betriebsrats sind nur in Sitzungen wirksam zu fassen; ein Umlaufbeschluss per E-Mail ist im BetrVG nicht vorgesehen."
        aktion={
          kannPlanen ? (
            <Link
              href="/sitzungen?neu=1"
              className="rounded-md bg-marke-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-marke-800"
            >
              Sitzung ansetzen
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {kannPlanen && (
          <details open={Boolean(neu)} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-900">
              Neue Sitzung ansetzen
            </summary>
            <div className="border-t border-slate-200 px-5 py-4">
              <form action={legeSitzungAn} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="traeger" className="block text-xs font-medium text-slate-600">
                      Gremium oder Ausschuss
                    </label>
                    <select
                      id="traeger"
                      name="traeger"
                      required
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {gremium && <option value={`gremium:${gremium.id}`}>{gremium.bezeichnung}</option>}
                      {ausschuesse.map((a) => (
                        <option key={a.id} value={`ausschuss:${a.id}`}>
                          {a.bezeichnung}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="art" className="block text-xs font-medium text-slate-600">
                      Art der Sitzung
                    </label>
                    <select
                      id="art"
                      name="art"
                      defaultValue={vorgabeArt ?? 'ORDENTLICH'}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="ORDENTLICH">Ordentliche Betriebsratssitzung (§ 29 Abs. 2 BetrVG)</option>
                      <option value="AUSSERORDENTLICH">Außerordentliche Sitzung (§ 29 Abs. 3 BetrVG)</option>
                      <option value="AUSSCHUSS">Ausschusssitzung</option>
                      <option value="BETRIEBSVERSAMMLUNG">Betriebsversammlung (§ 43 BetrVG)</option>
                      <option value="ABTEILUNGSVERSAMMLUNG">Abteilungsversammlung (§ 42 Abs. 2 BetrVG)</option>
                      <option value="MONATSGESPRAECH">Monatsgespräch (§ 74 Abs. 1 BetrVG)</option>
                      <option value="ASA">Arbeitsschutzausschuss (§ 11 ASiG)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="beginn" className="block text-xs font-medium text-slate-600">
                      Beginn
                    </label>
                    <input
                      id="beginn"
                      name="beginn"
                      type="datetime-local"
                      required
                      defaultValue={vorschlagWert}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="dauerMinuten" className="block text-xs font-medium text-slate-600">
                      Dauer (Minuten)
                    </label>
                    <input
                      id="dauerMinuten"
                      name="dauerMinuten"
                      type="number"
                      min={0}
                      step={15}
                      defaultValue={180}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="form" className="block text-xs font-medium text-slate-600">
                      Form
                    </label>
                    <select
                      id="form"
                      name="form"
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="PRAESENZ">Präsenz</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="VIDEO">Video-/Telefonkonferenz</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ort" className="block text-xs font-medium text-slate-600">
                      Ort
                    </label>
                    <input
                      id="ort"
                      name="ort"
                      placeholder="Betriebsratsbüro, Gebäude C, Raum 1.14"
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="titel" className="block text-xs font-medium text-slate-600">
                      Bezeichnung (optional)
                    </label>
                    <input
                      id="titel"
                      name="titel"
                      placeholder="Ordentliche Betriebsratssitzung"
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-500">
                  Die Sitzungsnummer wird fortlaufend vergeben. Nach dem Anlegen ist die Tagesordnung
                  zu erfassen; erst danach lässt sich die Ladung vermerken, denn § 29 Abs. 2 S. 3
                  BetrVG verlangt die Ladung <em>unter Mitteilung der Tagesordnung</em>. Bei
                  Video- oder Telefonkonferenz sind zusätzlich die Voraussetzungen des § 30 Abs. 2
                  BetrVG zu beachten; die Sitzungsseite prüft sie und weist auf Mängel hin.
                </p>

                <Knopf>Sitzung anlegen</Knopf>
              </form>
            </div>
          </details>
        )}
        <Karte titel={`Anstehende Termine (${kommende.length})`}>
          {kommende.length === 0 ? (
            <Leer text="Es sind keine Termine angesetzt." />
          ) : (
            <Tabelle kopf={['Termin', 'Art', 'Gegenstand', 'TOPs', 'Status']}>
              {kommende.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-2 py-2">
                    <span className="block text-slate-900">{datum(s.beginn)}</span>
                    <span className="text-xs text-slate-500">{uhrzeit(s.beginn)}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">
                    {ARTTEXT[s.art] ?? s.art}
                    {s.ausschuss && <span className="block text-slate-400">{s.ausschuss.bezeichnung}</span>}
                  </td>
                  <td className="px-2 py-2">
                    <Link href={`/sitzungen/${s.id}`} className="font-medium text-slate-900 hover:text-marke-700">
                      {s.titel ?? 'Sitzung'} {s.nummer}
                    </Link>
                    <span className="block text-xs text-slate-500">{s.ort ?? 'Ort offen'}</span>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-slate-600">{s._count.tops}</td>
                  <td className="px-2 py-2">
                    <Marke ton={STATUSTON[s.status]}>{STATUSTEXT[s.status]}</Marke>
                    {s._count.verhinderungen > 0 && (
                      <span className="mt-1 block text-xs text-amber-700">
                        {s._count.verhinderungen} Verhinderung(en)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Karte>

        <Karte titel="Zurückliegende Sitzungen" hinweis="Die Niederschrift ist nach § 34 Abs. 1 BetrVG zu führen und vom Vorsitz sowie einem weiteren Mitglied zu unterzeichnen.">
          {vergangene.length === 0 ? (
            <Leer text="Es sind keine zurückliegenden Sitzungen erfasst." />
          ) : (
            <Tabelle kopf={['Termin', 'Gegenstand', 'Teilnahme', 'Niederschrift']}>
              {vergangene.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-900">{datum(s.beginn)}</td>
                  <td className="px-2 py-2">
                    <Link href={`/sitzungen/${s.id}`} className="font-medium text-slate-900 hover:text-marke-700">
                      {s.titel ?? 'Sitzung'} {s.nummer}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {ARTTEXT[s.art] ?? s.art} · {s._count.tops} Tagesordnungspunkte
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {s.anwesendZahl !== null ? (
                      <>
                        <span className="text-slate-900">{s.anwesendZahl} anwesend</span>
                        <span className={`block ${s.beschlussfaehig ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {s.beschlussfaehig ? 'beschlussfähig' : 'nicht beschlussfähig'}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">nicht erfasst</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {s.niederschrift?.freigegebenAm ? (
                      <Marke ton="gruen">freigegeben {datum(s.niederschrift.freigegebenAm)}</Marke>
                    ) : s.niederschrift ? (
                      <Marke ton="gelb">Entwurf</Marke>
                    ) : (
                      <Marke ton="rot">fehlt</Marke>
                    )}
                  </td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Karte>

        <div className="grid gap-3 lg:grid-cols-2">
          <Rechtshinweis norm="§ 33 Abs. 2 BetrVG">
            Der Betriebsrat ist nur beschlussfähig, wenn mindestens die Hälfte der Mitglieder an der
            Beschlussfassung teilnimmt. Bei {gremium?.sollGroesse ?? 0} Mitgliedern sind das {noetig}.
            Ersatzmitglieder, die für verhinderte Mitglieder nachgerückt sind, zählen mit.
          </Rechtshinweis>
          <Rechtshinweis norm="§ 30 Abs. 2 BetrVG">
            Video- und Telefonkonferenz sind nachrangig zulässig, wenn die Geschäftsordnung dies regelt,
            die Nichtöffentlichkeit gesichert ist und nicht mindestens ein Viertel der Mitglieder
            widerspricht. Eine Aufzeichnung ist ausnahmslos unzulässig.
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
