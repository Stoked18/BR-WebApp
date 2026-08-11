import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { EINSTELLUNGEN, mitVorgaben } from '@/lib/einstellungen';
import { groesseBetriebsrat, pruefeGroesse } from '@/lib/betrvg';
import { BUNDESLAENDER } from '@/lib/feiertage';
import { Karte, Knopf, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';
import { Rueckmeldung } from '@/components/rueckmeldung';
import {
  speichereBetrieb,
  speichereEinstellungen,
  speichereGremium,
  uebernimmVorschlagGroesse,
} from './aktionen';

export const dynamic = 'force-dynamic';

const feld = 'mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm';
const beschriftung = 'block text-xs font-medium text-slate-600';

/**
 * Verwaltung.
 *
 * Zusammengefasst ist hier, was der Vorsitz selbst einstellen koennen muss,
 * ohne die IT zu bemuehen: die Angaben zum Betrieb, die Grunddaten des
 * Gremiums und die Fristen aus der Geschaeftsordnung. Fachliche Stammdaten
 * (Mitglieder, Ausschuesse) bleiben in ihren eigenen Modulen; hier steht nur,
 * was fuer die Anwendung als Ganzes gilt.
 */
export default async function Verwaltung({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  const benutzer = await verlangeRecht('gremium.verwalten');
  const { ok, fehler } = await searchParams;

  const [betrieb, gremium, gespeicherte] = await Promise.all([
    prisma.betrieb.findFirst(),
    prisma.gremium.findFirst({ where: { typ: 'BETRIEBSRAT' }, orderBy: { bezeichnung: 'asc' } }),
    prisma.einstellung.findMany(),
  ]);

  const werte = mitVorgaben(gespeicherte);
  const darfBenutzer = darf(benutzer, 'benutzer.verwalten');

  if (!betrieb) {
    return (
      <>
        <Seitenkopf titel="Verwaltung" />
        <Warnung titel="Es ist noch kein Betrieb hinterlegt.">
          Legen Sie den Betrieb über die Ersteinrichtung an. Ohne Betrieb fehlt der Anwendung die
          Grundlage für Fristen (Bundesland und Feiertage) und für die Größe des Gremiums nach § 9 BetrVG.
        </Warnung>
      </>
    );
  }

  const groessenlage = gremium ? pruefeGroesse(betrieb.anzahlWahlberechtigte, gremium.sollGroesse) : null;
  const vorschlag = groesseBetriebsrat(betrieb.anzahlWahlberechtigte);

  return (
    <>
      <Seitenkopf
        titel="Verwaltung"
        beschreibung="Angaben zum Betrieb, Grunddaten des Gremiums und die Fristen aus der Geschäftsordnung. Änderungen werden im Zugriffsprotokoll festgehalten."
        aktion={
          darfBenutzer ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/verwaltung/benutzer"
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Benutzerkonten
              </Link>
              <Link
                href="/verwaltung/daten"
                className="inline-flex items-center rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
              >
                Bestand zurücksetzen
              </Link>
            </div>
          ) : undefined
        }
      />

      <Rueckmeldung ok={ok} fehler={fehler} />

      <div className="space-y-6">
        <Karte titel="Betrieb" hinweis="Grundlage für Fristberechnung, Gremiumsgröße und Wirtschaftsausschuss.">
          <form action={speichereBetrieb} className="space-y-4">
            <input type="hidden" name="id" value={betrieb.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={beschriftung}>Name des Betriebs</label>
                <input id="name" name="name" defaultValue={betrieb.name} required className={feld} />
              </div>
              <div>
                <label htmlFor="ort" className={beschriftung}>Ort</label>
                <input id="ort" name="ort" defaultValue={betrieb.ort} required className={feld} />
              </div>
            </div>

            <div>
              <label htmlFor="bundesland" className={beschriftung}>Bundesland</label>
              <select id="bundesland" name="bundesland" defaultValue={betrieb.bundesland} className={feld}>
                {BUNDESLAENDER.map((l) => (
                  <option key={l.kuerzel} value={l.kuerzel}>
                    {l.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Steuert die Feiertage in jeder Fristberechnung. Fällt das Fristende auf einen
                Sonnabend, Sonntag oder gesetzlichen Feiertag, endet die Frist nach § 193 BGB erst am
                nächsten Werktag. In Nordrhein-Westfalen zählen dazu Fronleichnam und Allerheiligen.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="anzahlWahlberechtigte" className={beschriftung}>
                  Wahlberechtigte Arbeitnehmer
                </label>
                <input
                  id="anzahlWahlberechtigte"
                  name="anzahlWahlberechtigte"
                  type="number"
                  min={5}
                  defaultValue={betrieb.anzahlWahlberechtigte}
                  required
                  className={feld}
                />
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Einschließlich der Leiharbeitnehmer, die nach § 7 S. 2 BetrVG bei einem Einsatz von
                  mehr als drei Monaten wahlberechtigt sind. Diese Zahl kann deshalb über der Zahl
                  der Beschäftigten liegen.
                </p>
              </div>
              <div>
                <label htmlFor="anzahlBeschaeftigte" className={beschriftung}>Beschäftigte gesamt</label>
                <input
                  id="anzahlBeschaeftigte"
                  name="anzahlBeschaeftigte"
                  type="number"
                  min={1}
                  defaultValue={betrieb.anzahlBeschaeftigte}
                  required
                  className={feld}
                />
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Stammbelegschaft. Maßgeblich für Freistellungen (§ 38), den Wirtschaftsausschuss
                  (§ 106) und die Aufsichtsratsbildung.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="konzernName" className={beschriftung}>Konzern</label>
                <input id="konzernName" name="konzernName" defaultValue={betrieb.konzernName ?? ''} className={feld} />
              </div>
              <div>
                <label htmlFor="tarifvertrag" className={beschriftung}>Tarifvertrag</label>
                <input id="tarifvertrag" name="tarifvertrag" defaultValue={betrieb.tarifvertrag ?? ''} className={feld} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" name="tarifgebunden" defaultChecked={betrieb.tarifgebunden} className="mt-0.5" />
                <span>
                  Tarifgebunden
                  <span className="block text-xs text-slate-500">
                    Ein Tarifvertrag kann die Mitbestimmung nach § 87 Abs. 1 Einleitungssatz BetrVG
                    verdrängen, soweit er die Angelegenheit abschließend regelt.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" name="boersennotiert" defaultChecked={betrieb.boersennotiert} className="mt-0.5" />
                <span>
                  Konzern börsennotiert
                  <span className="block text-xs text-slate-500">
                    Nur ein Hinweis für die Beratung: Kapitalmarktpflichten des Konzerns entbinden
                    nicht von der Unterrichtung des Betriebsrats; die Verschwiegenheit nach
                    § 79 BetrVG gilt für vertrauliche Angaben ohnehin.
                  </span>
                </span>
              </label>
            </div>

            <Knopf>Betriebsdaten speichern</Knopf>
          </form>
        </Karte>

        {gremium && (
          <Karte titel="Gremium" hinweis={gremium.bezeichnung}>
            <form action={speichereGremium} className="space-y-4">
              <input type="hidden" name="id" value={gremium.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="bezeichnung" className={beschriftung}>Bezeichnung</label>
                  <input id="bezeichnung" name="bezeichnung" defaultValue={gremium.bezeichnung} required className={feld} />
                </div>
                <div>
                  <label htmlFor="sollGroesse" className={beschriftung}>Zahl der Mitglieder</label>
                  <input
                    id="sollGroesse"
                    name="sollGroesse"
                    type="number"
                    min={1}
                    defaultValue={gremium.sollGroesse}
                    required
                    className={feld}
                  />
                </div>
              </div>

              {groessenlage && !groessenlage.stimmig && (
                <Warnung titel={`§ 9 BetrVG sieht bei ${betrieb.anzahlWahlberechtigte} Wahlberechtigten ${vorschlag} Mitglieder vor.`}>
                  {groessenlage.hinweis} Ändern Sie die Zahl nur, wenn sie im Wahlausschreiben
                  tatsächlich anders zugrunde gelegt wurde – für den amtierenden Betriebsrat bleibt
                  die bei der Wahl maßgebliche Größe bestehen.
                </Warnung>
              )}

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="videoteilnahmeErlaubt"
                    defaultChecked={gremium.videoteilnahmeErlaubt}
                    className="mt-0.5"
                  />
                  <span>
                    Video- und Telefonteilnahme nach der Geschäftsordnung zugelassen
                    <span className="block text-xs leading-relaxed text-slate-500">
                      § 30 Abs. 2 BetrVG lässt die Teilnahme mittels Video- und Telefonkonferenz nur
                      zu, wenn die Geschäftsordnung die Voraussetzungen dafür festlegt, nicht
                      mindestens ein Viertel der Mitglieder binnen einer von der oder dem
                      Vorsitzenden gesetzten Frist widerspricht und die Nichtöffentlichkeit
                      sichergestellt ist. Die Präsenzsitzung bleibt der Regelfall (§ 30 Abs. 1 BetrVG).
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="aktiv" defaultChecked={gremium.aktiv} className="mt-0.5" />
                  <span>Gremium ist aktiv</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Knopf>Gremium speichern</Knopf>
              </div>
            </form>

            {groessenlage && !groessenlage.stimmig && (
              <form action={uebernimmVorschlagGroesse} className="mt-3 border-t border-slate-200 pt-3">
                <input type="hidden" name="gremiumId" value={gremium.id} />
                <Knopf variante="sekundaer">Vorschlag nach § 9 BetrVG übernehmen ({vorschlag})</Knopf>
              </form>
            )}
          </Karte>
        )}

        <Karte
          titel="Einstellungen"
          hinweis="Was die Geschäftsordnung nach § 36 BetrVG regelt, wird hier abgebildet – ersetzt wird sie dadurch nicht."
        >
          <form action={speichereEinstellungen} className="space-y-5">
            {EINSTELLUNGEN.map((def) => (
              <div key={def.schluessel}>
                <input type="hidden" name="schluessel" value={def.schluessel} />
                {def.art === 'schalter' ? (
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name={def.schluessel}
                      defaultChecked={werte[def.schluessel] === 'ja'}
                      className="mt-0.5"
                    />
                    <span>
                      {def.bezeichnung}
                      <span className="block text-xs leading-relaxed text-slate-500">{def.beschreibung}</span>
                    </span>
                  </label>
                ) : (
                  <>
                    <label htmlFor={def.schluessel} className={beschriftung}>
                      {def.bezeichnung}
                      {def.norm && <span className="ml-1 font-normal text-slate-400">{def.norm}</span>}
                    </label>
                    <input
                      id={def.schluessel}
                      name={def.schluessel}
                      type="number"
                      min={def.min}
                      max={def.max}
                      defaultValue={werte[def.schluessel]}
                      className={`${feld} max-w-[8rem]`}
                    />
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">{def.beschreibung}</p>
                  </>
                )}
              </div>
            ))}
            <Knopf>Einstellungen speichern</Knopf>
          </form>
        </Karte>

        <Rechtshinweis norm="§ 40 Abs. 2 BetrVG">
          Die Anwendung ist Sachmittel des Betriebsrats; ihre Bereitstellung und den Betrieb trägt
          der Arbeitgeber. Über die Nutzung entscheidet der Betriebsrat selbst. Änderungen an dieser
          Seite wirken sich auf Fristen und Beschlussvorgänge aus und sollten dem Gremium bekannt
          gemacht werden.
        </Rechtshinweis>
      </div>
    </>
  );
}
