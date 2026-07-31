import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { betriebsausschuss, wirtschaftsausschuss } from '@/lib/betrvg';
import { datumZeit } from '@/lib/format';
import { Karte, Leer, Marke, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';

export const dynamic = 'force-dynamic';

const TYPTEXT: Record<string, { text: string; norm: string; ton: 'blau' | 'violett' | 'neutral' | 'gruen' }> = {
  BETRIEBSAUSSCHUSS: { text: 'Betriebsausschuss', norm: '§ 27 BetrVG', ton: 'violett' },
  WEITERER_AUSSCHUSS: { text: 'Weiterer Ausschuss', norm: '§ 28 Abs. 1 BetrVG', ton: 'blau' },
  ARBEITSGRUPPE: { text: 'Arbeitsgruppe', norm: '§ 28a BetrVG', ton: 'neutral' },
  WIRTSCHAFTSAUSSCHUSS: { text: 'Wirtschaftsausschuss', norm: '§ 106 BetrVG', ton: 'gruen' },
  ARBEITSSCHUTZAUSSCHUSS: { text: 'Arbeitsschutzausschuss', norm: '§ 11 ASiG', ton: 'gruen' },
  AD_HOC: { text: 'Ad-hoc-Gruppe', norm: 'ohne Aufgabenübertragung', ton: 'neutral' },
};

export default async function Ausschuesse() {
  await verlangeRecht('gremium.lesen');

  const [betrieb, gremium, ausschuesse] = await Promise.all([
    prisma.betrieb.findFirst(),
    prisma.gremium.findFirst({ where: { typ: 'BETRIEBSRAT' } }),
    prisma.ausschuss.findMany({
      where: { aktiv: true },
      include: {
        mitglieder: { where: { ende: null }, include: { person: true } },
        sitzungen: { where: { beginn: { gte: new Date() } }, orderBy: { beginn: 'asc' }, take: 1 },
      },
      orderBy: [{ typ: 'asc' }, { bezeichnung: 'asc' }],
    }),
  ]);

  const ba = gremium ? betriebsausschuss(gremium.sollGroesse) : null;
  const wa = betrieb ? wirtschaftsausschuss(betrieb.anzahlBeschaeftigte) : null;
  const hatBetriebsausschuss = ausschuesse.some((a) => a.typ === 'BETRIEBSAUSSCHUSS');
  const hatWirtschaftsausschuss = ausschuesse.some((a) => a.typ === 'WIRTSCHAFTSAUSSCHUSS');

  return (
    <>
      <Seitenkopf
        titel="Ausschüsse"
        beschreibung="Aufgabenübertragung, Besetzung und Beschlussbefugnis. Nur ein Ausschuss mit wirksam übertragenen Aufgaben kann selbst binden – sonst bereitet er lediglich vor."
      />

      <div className="mb-6 space-y-3">
        {ba?.erforderlich && !hatBetriebsausschuss && (
          <Warnung titel="Betriebsausschuss fehlt">{ba.grundlage}</Warnung>
        )}
        {wa?.erforderlich && !hatWirtschaftsausschuss && (
          <Warnung titel="Wirtschaftsausschuss fehlt">{wa.grundlage}</Warnung>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ausschuesse.length === 0 && <Leer text="Es sind keine Ausschüsse angelegt." />}
        {ausschuesse.map((a) => {
          const typ = TYPTEXT[a.typ] ?? { text: a.typ, norm: '', ton: 'neutral' as const };
          const vorsitz = a.mitglieder.find((m) => m.vorsitz);
          return (
            <Karte
              key={a.id}
              titel={a.bezeichnung}
              hinweis={typ.norm}
              aktion={<Marke ton={typ.ton}>{typ.text}</Marke>}
            >
              <div className="space-y-3">
                {a.beschreibung && <p className="text-sm leading-relaxed text-slate-700">{a.beschreibung}</p>}

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Besetzung ({a.mitglieder.length})
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700">
                    {a.mitglieder.map((m) => (
                      <li key={m.id}>
                        {m.person.vorname} {m.person.nachname}
                        {m.vorsitz && <span className="ml-1 text-xs text-marke-700">(Vorsitz)</span>}
                      </li>
                    ))}
                  </ul>
                  {!vorsitz && (
                    <p className="mt-1 text-xs text-amber-700">Für diesen Ausschuss ist kein Vorsitz erfasst.</p>
                  )}
                </div>

                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-xs font-medium text-slate-700">
                    {a.aufgabenUebertragen ? 'Aufgaben zur selbständigen Erledigung übertragen' : 'Nur vorbereitend tätig'}
                  </p>
                  {a.aufgabenUebertragen ? (
                    <>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.uebertrageneAufgaben}</p>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Die Übertragung setzt einen Beschluss mit der Mehrheit der Stimmen der Mitglieder des
                        Betriebsrats und Schriftform voraus (§ 27 Abs. 2 S. 2, § 28 Abs. 1 S. 3 BetrVG).
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Beschlüsse in der Sache fasst weiterhin das Gremium. Der Ausschuss bereitet vor und
                      gibt eine Empfehlung ab.
                    </p>
                  )}
                </div>

                {a.sitzungen.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Nächste Sitzung: {datumZeit(a.sitzungen[0].beginn)}
                  </p>
                )}
              </div>
            </Karte>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <Rechtshinweis norm="§ 28 Abs. 1 BetrVG">
          Weitere Ausschüsse darf nur bilden, wer einen Betriebsausschuss hat – also Gremien ab neun
          Mitgliedern. Die Übertragung von Aufgaben zur selbständigen Erledigung ist jederzeit
          widerruflich und muss den Gegenstand hinreichend bestimmt bezeichnen. Eine pauschale
          Übertragung „aller personellen Angelegenheiten" wäre unwirksam.
        </Rechtshinweis>
        <Rechtshinweis norm="§ 28 Abs. 1 S. 4 BetrVG">
          Nicht übertragbar sind der Abschluss von Betriebsvereinbarungen sowie die Aufgaben nach
          § 111 BetrVG. Interessenausgleich und Sozialplan bleiben dem Gremium vorbehalten.
        </Rechtshinweis>
      </div>
    </>
  );
}
