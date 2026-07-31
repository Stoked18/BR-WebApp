import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { erforderlicheTeilnehmer } from '@/lib/betrvg';
import { datum, datumZeit, uhrzeit } from '@/lib/format';
import { Karte, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';

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

export default async function Sitzungen() {
  await verlangeRecht('sitzung.lesen');
  const jetzt = new Date();

  const [gremium, kommende, vergangene] = await Promise.all([
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
  ]);

  const noetig = erforderlicheTeilnehmer(gremium?.sollGroesse ?? 0);

  return (
    <>
      <Seitenkopf
        titel="Sitzungen"
        beschreibung="Ladung, Tagesordnung, Anwesenheit und Niederschrift. Beschlüsse des Betriebsrats sind nur in Sitzungen wirksam zu fassen; ein Umlaufbeschluss per E-Mail ist im BetrVG nicht vorgesehen."
      />

      <div className="space-y-6">
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
