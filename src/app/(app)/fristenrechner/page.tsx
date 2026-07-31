import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { FRISTVORLAGEN, berechneFrist, berechneNachVorlage, type Fristeinheit } from '@/lib/fristen';
import { feiertageLand, isoAlsTag, tagAlsIso } from '@/lib/feiertage';
import { datumLang } from '@/lib/format';
import { Karte, Knopf, Marke, Rechtshinweis, Seitenkopf, Tabelle, Warnung } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Fristenrechner({
  searchParams,
}: {
  searchParams: Promise<{ ereignis?: string; vorlage?: string; dauer?: string; einheit?: string; land?: string }>;
}) {
  await verlangeRecht('gremium.lesen');
  const p = await searchParams;

  const betrieb = await prisma.betrieb.findFirst();
  const land = p.land || betrieb?.bundesland || 'NW';
  const heute = new Date();
  const ereignisIso = p.ereignis || tagAlsIso({ jahr: heute.getFullYear(), monat: heute.getMonth() + 1, tag: heute.getDate() });

  let ergebnis: ReturnType<typeof berechneFrist> | null = null;
  let vorlage: (typeof FRISTVORLAGEN)[string] | null = null;
  let fehler: string | null = null;

  try {
    const ereignistag = isoAlsTag(ereignisIso);
    if (p.vorlage && FRISTVORLAGEN[p.vorlage]) {
      const r = berechneNachVorlage(p.vorlage, ereignistag, land);
      ergebnis = r;
      vorlage = r.vorlage;
    } else if (p.dauer) {
      ergebnis = berechneFrist(ereignistag, Number(p.dauer), (p.einheit as Fristeinheit) ?? 'TAGE', land);
    }
  } catch (e) {
    fehler = (e as Error).message;
  }

  const jahr = isoAlsTag(ereignisIso).jahr;
  const feiertage = [...feiertageLand(jahr, land), ...feiertageLand(jahr + 1, land)];

  return (
    <>
      <Seitenkopf
        titel="Fristenrechner"
        beschreibung="Berechnet Fristen nach §§ 187, 188 und 193 BGB unter Berücksichtigung der gesetzlichen Feiertage. Das Ergebnis enthält eine Herleitung, die sich in die Akte übernehmen lässt."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Karte titel="Berechnung">
            <form className="space-y-4" method="get">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ereignis" className="block text-xs font-medium text-slate-600">
                    Tag des fristauslösenden Ereignisses (Zugang)
                  </label>
                  <input
                    id="ereignis"
                    name="ereignis"
                    type="date"
                    defaultValue={ereignisIso}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="land" className="block text-xs font-medium text-slate-600">
                    Bundesland (Ort der Leistung)
                  </label>
                  <select
                    id="land"
                    name="land"
                    defaultValue={land}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="NW">Nordrhein-Westfalen</option>
                    <option value="BW">Baden-Württemberg</option>
                    <option value="BY">Bayern</option>
                    <option value="BE">Berlin</option>
                    <option value="BB">Brandenburg</option>
                    <option value="HB">Bremen</option>
                    <option value="HH">Hamburg</option>
                    <option value="HE">Hessen</option>
                    <option value="MV">Mecklenburg-Vorpommern</option>
                    <option value="NI">Niedersachsen</option>
                    <option value="RP">Rheinland-Pfalz</option>
                    <option value="SL">Saarland</option>
                    <option value="SN">Sachsen</option>
                    <option value="ST">Sachsen-Anhalt</option>
                    <option value="SH">Schleswig-Holstein</option>
                    <option value="TH">Thüringen</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="vorlage" className="block text-xs font-medium text-slate-600">
                  Gesetzliche Frist auswählen
                </label>
                <select
                  id="vorlage"
                  name="vorlage"
                  defaultValue={p.vorlage ?? ''}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">– freie Eingabe –</option>
                  {Object.values(FRISTVORLAGEN).map((v) => (
                    <option key={v.schluessel} value={v.schluessel}>
                      {v.bezeichnung} ({v.grundlage})
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-1 text-xs font-medium text-slate-600">oder freie Frist</legend>
                <input
                  name="dauer"
                  type="number"
                  min={1}
                  defaultValue={p.dauer ?? ''}
                  placeholder="Anzahl"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <select
                  name="einheit"
                  defaultValue={p.einheit ?? 'TAGE'}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="TAGE">Kalendertage</option>
                  <option value="WOCHEN">Wochen</option>
                  <option value="MONATE">Monate</option>
                  <option value="WERKTAGE">Werktage</option>
                </select>
              </fieldset>

              <Knopf>Frist berechnen</Knopf>
            </form>
          </Karte>

          {fehler && <Warnung titel="Die Eingabe konnte nicht verarbeitet werden">{fehler}</Warnung>}

          {ergebnis && (
            <Karte titel="Ergebnis">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Die Frist läuft ab mit Ablauf des</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{datumLang(ergebnis.ablauf)}</p>
                <p className="mt-0.5 text-sm text-slate-600">24:00 Uhr</p>
                {ergebnis.verschobenNach193 && (
                  <div className="mt-2">
                    <Marke ton="gelb">nach § 193 BGB verschoben</Marke>
                  </div>
                )}
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Ereignistag</dt>
                  <dd className="text-sm text-slate-800">{datumLang(new Date(`${tagAlsIso(ergebnis.ereignistag)}T12:00:00`))}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Fristbeginn</dt>
                  <dd className="text-sm text-slate-800">{datumLang(new Date(`${tagAlsIso(ergebnis.beginn)}T12:00:00`))}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Rechnerisches Ende</dt>
                  <dd className="text-sm text-slate-800">
                    {datumLang(new Date(`${tagAlsIso(ergebnis.endeRechnerisch)}T12:00:00`))}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Herleitung für die Akte</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{ergebnis.herleitung}</p>
              </div>

              {vorlage && !vorlage.gesetzlich && (
                <div className="mt-3">
                  <Warnung titel="Keine gesetzliche Frist">
                    Diese Frist ergibt sich nicht unmittelbar aus dem Gesetz, sondern aus der
                    Geschäftsordnung oder der betrieblichen Praxis. Sie ist entsprechend anpassbar.
                  </Warnung>
                </div>
              )}
            </Karte>
          )}
        </div>

        <div className="space-y-6">
          <Karte titel={`Gesetzliche Feiertage ${jahr}/${jahr + 1}`} hinweis={`Bundesland ${land}`}>
            <Tabelle kopf={['Datum', 'Feiertag']}>
              {feiertage.map((f) => (
                <tr key={`${tagAlsIso(f.datum)}-${f.bezeichnung}`}>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs tabular-nums text-slate-600">
                    {String(f.datum.tag).padStart(2, '0')}.{String(f.datum.monat).padStart(2, '0')}.{f.datum.jahr}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-slate-800">{f.bezeichnung}</td>
                </tr>
              ))}
            </Tabelle>
          </Karte>

          <Rechtshinweis norm="§ 193 BGB">
            Fällt das Fristende auf einen Sonnabend, Sonntag oder gesetzlichen Feiertag, tritt der
            nächste Werktag an seine Stelle. Maßgeblich ist das Feiertagsrecht am Ort der Leistung.
            Für einen Betrieb in Nordrhein-Westfalen zählen deshalb Fronleichnam und Allerheiligen mit –
            in Niedersachsen oder Berlin wäre dieselbe Frist einen Tag früher abgelaufen.
          </Rechtshinweis>

          <Rechtshinweis norm="§ 187 Abs. 1 BGB">
            Der Tag des Zugangs zählt nicht mit. Geht die Anhörung am Montag zu, endet die Wochenfrist
            am darauffolgenden Montag um 24:00 Uhr – nicht am Sonntag.
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
