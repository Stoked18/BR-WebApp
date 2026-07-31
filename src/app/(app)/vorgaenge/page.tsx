import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { fristampel, verbleibendeTage } from '@/lib/fristen';
import { datum, relativeTage } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';
import { STATUSTEXT, VORGANGSTYP } from '@/lib/vorgangstexte';

export const dynamic = 'force-dynamic';

const AMPELTON = { ABGELAUFEN: 'rot', KRITISCH: 'rot', WARNUNG: 'gelb', OFFEN: 'gruen', KEINE_FRIST: 'neutral' } as const;

export default async function Vorgaenge() {
  await verlangeRecht('vorgang.lesen');
  const jetzt = new Date();

  const vorgaenge = await prisma.vorgang.findMany({
    orderBy: [{ fristBis: { sort: 'asc', nulls: 'last' } }, { eingegangenAm: 'desc' }],
    include: { ausschuss: true },
  });

  const offen = vorgaenge.filter((v) => !['ABGESCHLOSSEN', 'ZURUECKGEZOGEN', 'BEANTWORTET'].includes(v.status));
  const mitFrist = offen.filter((v) => v.fristBis);
  const abgelaufen = mitFrist.filter((v) => fristampel(v.fristBis, jetzt) === 'ABGELAUFEN');
  const dringend = mitFrist.filter((v) => ['KRITISCH', 'WARNUNG'].includes(fristampel(v.fristBis, jetzt)));
  const fiktion = offen.filter((v) => v.zustimmungsfiktion);

  return (
    <>
      <Seitenkopf
        titel="Vorgänge und Fristen"
        beschreibung="Alle Beteiligungsangelegenheiten mit ihren gesetzlichen Fristen. Die Fristen sind nach §§ 187, 188, 193 BGB berechnet und berücksichtigen die Feiertage in Nordrhein-Westfalen."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl wert={offen.length} bezeichnung="Offene Vorgänge" ton="neutral" />
        <Kennzahl wert={dringend.length} bezeichnung="Frist läuft binnen drei Tagen" ton={dringend.length ? 'gelb' : 'gruen'} />
        <Kennzahl wert={abgelaufen.length} bezeichnung="Frist verstrichen" ton={abgelaufen.length ? 'rot' : 'gruen'} />
        <Kennzahl
          wert={fiktion.length}
          bezeichnung="mit Zustimmungsfiktion"
          hinweis="§ 99 Abs. 3 S. 2 BetrVG"
          ton={fiktion.length ? 'violett' : 'neutral'}
        />
      </div>

      <Karte titel={`Alle Vorgänge (${vorgaenge.length})`}>
        {vorgaenge.length === 0 ? (
          <Leer text="Es sind keine Vorgänge erfasst." />
        ) : (
          <Tabelle kopf={['Aktenzeichen', 'Gegenstand', 'Grundlage', 'Eingang', 'Frist', 'Status']}>
            {vorgaenge.map((v) => {
              const typ = VORGANGSTYP[v.typ] ?? { text: v.typ, norm: '' };
              const ampel = fristampel(v.fristBis, jetzt);
              const erledigt = ['ABGESCHLOSSEN', 'BEANTWORTET', 'ZURUECKGEZOGEN'].includes(v.status);
              return (
                <tr key={v.id} className={erledigt ? 'opacity-60' : ''}>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-slate-500">{v.aktenzeichen}</td>
                  <td className="px-2 py-2">
                    <Link href={`/vorgaenge/${v.id}`} className="font-medium text-slate-900 hover:text-marke-700">
                      {v.titel}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {v.fachbereich}
                      {v.betroffeneInitialen && ` · betrifft ${v.betroffeneInitialen}`}
                      {v.ausschuss && ` · ${v.ausschuss.bezeichnung}`}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    <span className="text-slate-700">{typ.text}</span>
                    <span className="block text-slate-400">{typ.norm}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-600">{datum(v.eingegangenAm)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-xs">
                    {v.fristBis ? (
                      <>
                        <span className="block text-slate-900">{datum(v.fristBis)}</span>
                        {!erledigt && (
                          <span className="text-slate-500">{relativeTage(verbleibendeTage(v.fristBis, jetzt))}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">–</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Marke ton={erledigt ? 'neutral' : AMPELTON[ampel]}>{STATUSTEXT[v.status] ?? v.status}</Marke>
                  </td>
                </tr>
              );
            })}
          </Tabelle>
        )}
      </Karte>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Rechtshinweis norm="§ 99 Abs. 1 BetrVG">
          Die Wochenfrist beginnt erst mit der vollständigen Unterrichtung. Fehlen erforderliche
          Angaben oder Unterlagen, ist das dem Arbeitgeber unverzüglich mitzuteilen – die Frist läuft
          dann nicht an. Diese Rüge sollte in jedem Zweifelsfall erfolgen, weil sie den Fristablauf
          und damit die Zustimmungsfiktion verhindert.
        </Rechtshinweis>
        <Rechtshinweis norm="§ 102 Abs. 1 S. 3 BetrVG">
          Eine ohne Anhörung des Betriebsrats ausgesprochene Kündigung ist unwirksam. Bei der
          außerordentlichen Kündigung bleiben nur drei Tage für die Stellungnahme; die Beratung ist
          entsprechend kurzfristig anzusetzen, gegebenenfalls als außerordentliche Sitzung nach
          § 29 Abs. 3 BetrVG.
        </Rechtshinweis>
      </div>
    </>
  );
}
