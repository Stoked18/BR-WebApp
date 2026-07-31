import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { berechneFrist } from '@/lib/fristen';
import { alsKalendertag } from '@/lib/fristen';
import { datum } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle, Warnung } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { text: string; ton: 'neutral' | 'gruen' | 'gelb' | 'rot' | 'blau' | 'violett' }> = {
  ENTWURF: { text: 'Entwurf', ton: 'neutral' },
  IN_VERHANDLUNG: { text: 'in Verhandlung', ton: 'blau' },
  BESCHLOSSEN: { text: 'beschlossen', ton: 'blau' },
  IN_KRAFT: { text: 'in Kraft', ton: 'gruen' },
  GEKUENDIGT: { text: 'gekündigt', ton: 'gelb' },
  NACHWIRKEND: { text: 'nachwirkend', ton: 'violett' },
  AUSSER_KRAFT: { text: 'außer Kraft', ton: 'rot' },
};

export default async function Vereinbarungen() {
  await verlangeRecht('bv.lesen');

  const bvs = await prisma.betriebsvereinbarung.findMany({
    orderBy: [{ status: 'asc' }, { nummer: 'desc' }],
  });

  const inKraft = bvs.filter((b) => b.status === 'IN_KRAFT').length;
  const gekuendigt = bvs.filter((b) => b.status === 'GEKUENDIGT');
  const ohnePruefung = bvs.filter((b) => !b.tarifvorbehaltGeprueft && b.status !== 'ENTWURF');

  return (
    <>
      <Seitenkopf
        titel="Betriebsvereinbarungen"
        beschreibung="Bestand, Laufzeiten und Nachwirkung. Eine gekündigte Vereinbarung in einer erzwingbaren Angelegenheit gilt nach § 77 Abs. 6 BetrVG weiter, bis sie durch eine andere Abmachung ersetzt wird."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl wert={bvs.length} bezeichnung="Vereinbarungen insgesamt" />
        <Kennzahl wert={inKraft} bezeichnung="In Kraft" ton="gruen" />
        <Kennzahl wert={gekuendigt.length} bezeichnung="Gekündigt" ton={gekuendigt.length ? 'gelb' : 'neutral'} />
        <Kennzahl
          wert={ohnePruefung.length}
          bezeichnung="Tarifvorbehalt ungeprüft"
          hinweis="§ 77 Abs. 3 BetrVG"
          ton={ohnePruefung.length ? 'rot' : 'gruen'}
        />
      </div>

      {ohnePruefung.length > 0 && (
        <div className="mb-6">
          <Warnung titel="Tarifvorbehalt nach § 77 Abs. 3 BetrVG nicht dokumentiert">
            Arbeitsentgelte und sonstige Arbeitsbedingungen, die tarifvertraglich geregelt sind oder
            üblicherweise geregelt werden, können nicht Gegenstand einer Betriebsvereinbarung sein –
            es sei denn, der Tarifvertrag lässt dies ausdrücklich zu. Bei Tarifbindung an die Metall-
            und Elektroindustrie NRW ist das für jede Vereinbarung zu prüfen und zu vermerken.
            Betroffen: {ohnePruefung.map((b) => b.nummer).join(', ')}.
          </Warnung>
        </div>
      )}

      <Karte titel="Bestand">
        {bvs.length === 0 ? (
          <Leer text="Es sind keine Betriebsvereinbarungen erfasst." />
        ) : (
          <Tabelle kopf={['Nummer', 'Gegenstand', 'Grundlage', 'In Kraft seit', 'Status', 'Nachwirkung']}>
            {bvs.map((b) => {
              const st = STATUS[b.status] ?? { text: b.status, ton: 'neutral' as const };
              // Bei Kuendigung: Ende der Kuendigungsfrist nach § 77 Abs. 5 BetrVG
              const ablauf =
                b.gekuendigtAm && b.kuendigungsfristMonate
                  ? berechneFrist(alsKalendertag(b.gekuendigtAm), b.kuendigungsfristMonate, 'MONATE', 'NW')
                  : null;
              return (
                <tr key={b.id} className="align-top">
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-slate-500">{b.nummer}</td>
                  <td className="px-2 py-2">
                    <span className="font-medium text-slate-900">{b.titel}</span>
                    {b.gegenstand && (
                      <span className="mt-0.5 block max-w-xl text-xs leading-relaxed text-slate-500">
                        {b.gegenstand}
                      </span>
                    )}
                    {ablauf && (
                      <span className="mt-1 block text-xs text-amber-700">
                        Kündigung am {datum(b.gekuendigtAm)} durch {b.gekuendigtVon ?? 'unbekannt'} · Ende der
                        Kündigungsfrist {datum(ablauf.ablauf)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">{b.rechtsgrundlage ?? '–'}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-600">{datum(b.inkrafttretenAm)}</td>
                  <td className="px-2 py-2">
                    <Marke ton={st.ton}>{st.text}</Marke>
                    {!b.tarifvorbehaltGeprueft && b.status !== 'ENTWURF' && (
                      <span className="mt-1 block text-xs text-rose-700">§ 77 Abs. 3 offen</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {b.nachwirkung ? (
                      <span className="text-violet-800">ja (§ 77 Abs. 6)</span>
                    ) : (
                      <span className="text-slate-500">nein</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tabelle>
        )}
      </Karte>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Rechtshinweis norm="§ 77 Abs. 5, 6 BetrVG">
          Betriebsvereinbarungen können mit einer Frist von drei Monaten gekündigt werden, sofern
          nichts anderes vereinbart ist. Nach Ablauf gelten Regelungen in erzwingbaren Angelegenheiten
          weiter, bis sie durch eine andere Abmachung ersetzt werden. In freiwilligen Angelegenheiten
          endet die Wirkung dagegen mit dem Fristablauf – deshalb ist die Einordnung wichtig.
        </Rechtshinweis>
        <Rechtshinweis norm="§ 87 Abs. 1 Nr. 6 BetrVG">
          Bei konzernweit eingeführten Systemen ist zu klären, ob die Zuständigkeit beim örtlichen
          Betriebsrat, beim Gesamt- oder beim Konzernbetriebsrat liegt (§§ 50, 58 BetrVG). Eine
          Vereinbarung des unzuständigen Gremiums ist unwirksam. Bei Systemen, die zentral vom
          ausländischen Mutterunternehmen betrieben werden, ist zusätzlich der Drittlandtransfer nach
          Art. 44 ff. DSGVO zu regeln.
        </Rechtshinweis>
      </div>
    </>
  );
}
