import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { datum } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf } from '@/components/ui';

export const dynamic = 'force-dynamic';

const MEHRHEITSTEXT: Record<string, string> = {
  EINFACHE_MEHRHEIT_ANWESENDE: 'Mehrheit der Anwesenden (§ 33 Abs. 1 BetrVG)',
  MEHRHEIT_DER_MITGLIEDER: 'Mehrheit der Mitglieder (§§ 27, 28 BetrVG)',
  ZWEI_DRITTEL: 'Zwei-Drittel-Mehrheit',
};

export default async function Beschlussregister({
  searchParams,
}: {
  searchParams: Promise<{ suche?: string }>;
}) {
  await verlangeRecht('beschluss.lesen');
  const { suche } = await searchParams;

  const beschluesse = await prisma.beschluss.findMany({
    where: suche
      ? {
          OR: [
            { wortlaut: { contains: suche, mode: 'insensitive' } },
            { aktenzeichen: { contains: suche, mode: 'insensitive' } },
            { rechtsgrundlage: { contains: suche, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { gefasstAm: 'desc' },
    include: { top: { include: { sitzung: true } }, vorgang: true },
  });

  const angenommen = beschluesse.filter((b) => b.ergebnis === 'ANGENOMMEN').length;
  const offen = beschluesse.filter((b) => b.ergebnis === 'ANGENOMMEN' && !b.umgesetztAm).length;

  return (
    <>
      <Seitenkopf
        titel="Beschlussregister"
        beschreibung="Alle Beschlüsse im Wortlaut, mit Abstimmungsergebnis und Fundstelle. § 34 Abs. 1 S. 2 BetrVG verlangt, dass die Niederschrift den Wortlaut des Beschlusses und das Stimmenverhältnis enthält."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kennzahl wert={beschluesse.length} bezeichnung="Erfasste Beschlüsse" />
        <Kennzahl wert={angenommen} bezeichnung="Angenommen" ton="gruen" />
        <Kennzahl wert={offen} bezeichnung="Umsetzung offen" ton={offen ? 'gelb' : 'gruen'} />
      </div>

      <form className="mb-4">
        <label htmlFor="suche" className="sr-only">
          Beschlüsse durchsuchen
        </label>
        <input
          id="suche"
          name="suche"
          defaultValue={suche ?? ''}
          placeholder="Im Wortlaut, Aktenzeichen oder in der Rechtsgrundlage suchen …"
          className="w-full max-w-lg rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="space-y-4">
        {beschluesse.length === 0 && <Leer text="Es wurden keine Beschlüsse gefunden." />}
        {beschluesse.map((b) => (
          <Karte key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{b.aktenzeichen}</span>
                  <Marke
                    ton={b.ergebnis === 'ANGENOMMEN' ? 'gruen' : b.ergebnis === 'ABGELEHNT' ? 'rot' : 'gelb'}
                  >
                    {b.ergebnis === 'ANGENOMMEN'
                      ? 'angenommen'
                      : b.ergebnis === 'ABGELEHNT'
                        ? 'abgelehnt'
                        : b.ergebnis === 'NICHT_BESCHLUSSFAEHIG'
                          ? 'nicht beschlussfähig'
                          : 'vertagt'}
                  </Marke>
                  {b.art === 'GEHEIM' && <Marke ton="violett">geheime Abstimmung</Marke>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">{b.wortlaut}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-500">
                <p>{datum(b.gefasstAm)}</p>
                <Link href={`/sitzungen/${b.top.sitzung.id}`} className="text-marke-700 hover:underline">
                  {b.top.sitzung.nummer}, TOP {b.top.nummer}
                </Link>
              </div>
            </div>

            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <div>
                <dt className="inline font-medium">Stimmen: </dt>
                <dd className="inline tabular-nums">
                  {b.jaStimmen} Ja / {b.neinStimmen} Nein / {b.enthaltungen} Enthaltung bei{' '}
                  {b.anwesendStimmberechtigt} Anwesenden
                </dd>
              </div>
              <div>
                <dt className="inline font-medium">Maßstab: </dt>
                <dd className="inline">{MEHRHEITSTEXT[b.mehrheitserfordernis] ?? b.mehrheitserfordernis}</dd>
              </div>
              {b.rechtsgrundlage && (
                <div>
                  <dt className="inline font-medium">Grundlage: </dt>
                  <dd className="inline">{b.rechtsgrundlage}</dd>
                </div>
              )}
              {b.vorgang && (
                <div>
                  <dt className="inline font-medium">Vorgang: </dt>
                  <dd className="inline">
                    <Link href={`/vorgaenge/${b.vorgang.id}`} className="text-marke-700 hover:underline">
                      {b.vorgang.aktenzeichen}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Karte>
        ))}
      </div>

      <div className="mt-6">
        <Rechtshinweis norm="§ 33 Abs. 1 BetrVG">
          Beschlüsse werden mit der Mehrheit der Stimmen der anwesenden Mitglieder gefasst.
          Enthaltungen zählen dabei nicht als Ja-Stimmen, wirken sich also faktisch wie Nein-Stimmen
          aus, wenn es knapp wird. Bei Stimmengleichheit ist der Antrag abgelehnt.
        </Rechtshinweis>
      </div>
    </>
  );
}
