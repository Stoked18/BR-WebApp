import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { pruefeVideositzung, viertelQuorum } from '@/lib/betrvg';
import { anwesenheitslage } from '@/lib/sitzung';
import { datum, datumZeit, uhrzeit } from '@/lib/format';
import { Fehler, Karte, Knopf, Leer, Marke, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';
import {
  erfasseBeschluss,
  ergaenzeTop,
  loescheVerhinderung,
  meldeVerhinderung,
  stelleBeschlussfaehigkeitFest,
} from './aktionen';
import { vermerkeLadung } from '../aktionen';

export const dynamic = 'force-dynamic';

const GRUNDTEXT: Record<string, string> = {
  URLAUB: 'Urlaub',
  KRANKHEIT: 'Arbeitsunfähigkeit',
  DIENSTREISE: 'Dienstreise',
  SCHICHT: 'Schichtlage',
  BEFANGENHEIT: 'rechtliche Verhinderung',
  SONSTIGES: 'sonstiger Grund',
};

const TOPSTATUS: Record<string, { text: string; ton: 'neutral' | 'gruen' | 'gelb' | 'blau' }> = {
  OFFEN: { text: 'offen', ton: 'neutral' },
  IN_BERATUNG: { text: 'in Beratung', ton: 'blau' },
  BESCHLOSSEN: { text: 'beschlossen', ton: 'gruen' },
  VERTAGT: { text: 'vertagt', ton: 'gelb' },
  ZURUECKGEZOGEN: { text: 'zurückgezogen', ton: 'neutral' },
  ZUR_KENNTNIS: { text: 'zur Kenntnis', ton: 'neutral' },
};

export default async function Sitzungsdetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const benutzer = await verlangeRecht('sitzung.lesen');

  const sitzung = await prisma.sitzung.findUnique({
    where: { id },
    include: {
      gremium: true,
      ausschuss: { include: { mitglieder: { where: { ende: null }, include: { person: true } } } },
      tops: { orderBy: { nummer: 'asc' }, include: { beschluesse: true, vorgang: true } },
      teilnahmen: { include: { person: true } },
      verhinderungen: { include: { person: true } },
      niederschrift: true,
    },
  });

  if (!sitzung) notFound();

  const amtsperiode = await prisma.amtsperiode.findFirst({ where: { aktiv: true } });
  const ordentliche = sitzung.gremiumId
    ? await prisma.mitgliedschaft.findMany({
        where: { gremiumId: sitzung.gremiumId, status: 'ORDENTLICH', ende: null, amtsperiodeId: amtsperiode?.id },
        include: { person: true },
        orderBy: { person: { nachname: 'asc' } },
      })
    : [];

  const ersatzPersonen = await prisma.person.findMany({
    where: { id: { in: sitzung.verhinderungen.map((v) => v.ersatzPersonId).filter((x): x is string => Boolean(x)) } },
  });

  const groesse = sitzung.gremium?.sollGroesse ?? sitzung.ausschuss?.mitglieder.length ?? 0;
  const lage = anwesenheitslage(groesse, sitzung.teilnahmen, sitzung.verhinderungen.length, sitzung.status);
  const anwesendStimm = lage.zahl;

  const video =
    sitzung.form !== 'PRAESENZ'
      ? pruefeVideositzung({
          gremiumsgroesse: groesse,
          geschaeftsordnungRegeltVideo: sitzung.gremium?.videoteilnahmeErlaubt ?? false,
          widersprueche: sitzung.widerspruchVideoAnzahl,
          nichtoeffentlichkeitSichergestellt: sitzung.nichtoeffentlichkeitBestaetigt,
          aufzeichnungAusgeschlossen: true,
        })
      : null;

  const nichtGemeldet = ordentliche.filter(
    (m) => !sitzung.verhinderungen.some((v) => v.personId === m.personId),
  );

  // Verbleibende Kalendertage bis zum Termin – Grundlage fuer den Hinweis auf
  // die Ladungsfrist der Geschaeftsordnung (§ 29 Abs. 2 S. 3 BetrVG nennt keine Zahl).
  const tageBisSitzung = Math.ceil((sitzung.beginn.getTime() - Date.now()) / 86_400_000);

  const kannPlanen = darf(benutzer, 'sitzung.planen');
  const kannLeiten = darf(benutzer, 'sitzung.leiten');
  const kannBeschliessen = darf(benutzer, 'beschluss.erfassen');
  const abgeschlossen = ['PROTOKOLL_FREIGEGEBEN', 'ABGESCHLOSSEN', 'ABGESAGT'].includes(sitzung.status);

  return (
    <>
      <Seitenkopf
        titel={`${sitzung.titel ?? 'Sitzung'} ${sitzung.nummer}`}
        beschreibung={`${datumZeit(sitzung.beginn)}${sitzung.ende ? ` bis ${uhrzeit(sitzung.ende)}` : ''} · ${sitzung.ort ?? 'Ort offen'}`}
        aktion={
          <Link href="/sitzungen" className="text-sm text-marke-700 hover:underline">
            zurück zur Liste
          </Link>
        }
      />

      <div className="mb-6 space-y-3">
        {!lage.prognose && !lage.ausreichend && !abgeschlossen && (
          <Fehler titel="Beschlussfähigkeit nicht erreicht">{lage.text}</Fehler>
        )}
        {lage.prognose && !lage.ausreichend && (
          <Warnung titel="Beschlussfähigkeit voraussichtlich nicht erreicht">
            {lage.text} Es sind weitere Ersatzmitglieder zu laden oder der Termin ist zu verlegen.
          </Warnung>
        )}
        {video && !video.zulaessig && (
          <Warnung titel="Voraussetzungen der Video- oder Telefonsitzung liegen nicht vor">
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {video.maengel.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Warnung>
        )}
        {!sitzung.einladungVersendetAm && sitzung.status === 'GEPLANT' && (
          <Warnung titel="Ladung noch nicht versandt">
            Nach § 29 Abs. 2 S. 3 BetrVG sind die Mitglieder rechtzeitig unter Mitteilung der
            Tagesordnung zu laden. Im vollkontinuierlichen Schichtbetrieb ist die Ladung so zu
            bemessen, dass sie auch Beschäftigte in der Nacht- und Wochenendschicht erreicht.
            {tageBisSitzung !== null && (
              <span className="mt-1 block">
                {tageBisSitzung < 0
                  ? 'Der Termin liegt bereits in der Vergangenheit.'
                  : `Bis zum Termin sind es noch ${tageBisSitzung} Tag(e); die Geschäftsordnung sieht ` +
                    `${sitzung.ladungsfristTage} Tage vor.` +
                    (tageBisSitzung < sitzung.ladungsfristTage
                      ? ' Die Ladungsfrist ist damit bereits unterschritten. Wird gleichwohl geladen, ' +
                        'sollten alle Mitglieder der Verkürzung zustimmen – andernfalls sind die in ' +
                        'der Sitzung gefassten Beschlüsse angreifbar.'
                      : '')}
              </span>
            )}
          </Warnung>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Karte titel="Tagesordnung" hinweis={`${sitzung.tops.length} Punkte`}>
            {sitzung.tops.length === 0 ? (
              <Leer text="Es sind keine Tagesordnungspunkte erfasst." />
            ) : (
              <ol className="space-y-4">
                {sitzung.tops.map((t) => {
                  const st = TOPSTATUS[t.status] ?? { text: t.status, ton: 'neutral' as const };
                  return (
                    <li key={t.id} className="border-l-2 border-slate-200 pl-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900">
                          <span className="mr-2 tabular-nums text-slate-400">{t.nummer}.</span>
                          {t.titel}
                        </h3>
                        <Marke ton={st.ton}>{st.text}</Marke>
                      </div>
                      {t.beschreibung && <p className="mt-1 text-sm text-slate-600">{t.beschreibung}</p>}
                      {t.vorgang && (
                        <p className="mt-1 text-xs">
                          <Link href={`/vorgaenge/${t.vorgang.id}`} className="text-marke-700 hover:underline">
                            Vorgang {t.vorgang.aktenzeichen}
                          </Link>
                        </p>
                      )}

                      {t.beschluesse.map((b) => (
                        <div key={b.id} className="mt-2 rounded-md bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs text-slate-500">{b.aktenzeichen}</span>
                            <Marke
                              ton={
                                b.ergebnis === 'ANGENOMMEN' ? 'gruen' : b.ergebnis === 'ABGELEHNT' ? 'rot' : 'gelb'
                              }
                            >
                              {b.ergebnis === 'ANGENOMMEN'
                                ? 'angenommen'
                                : b.ergebnis === 'ABGELEHNT'
                                  ? 'abgelehnt'
                                  : b.ergebnis === 'NICHT_BESCHLUSSFAEHIG'
                                    ? 'nicht beschlussfähig'
                                    : 'vertagt'}
                            </Marke>
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{b.wortlaut}</p>
                          <p className="mt-1.5 text-xs text-slate-500">
                            {b.jaStimmen} Ja · {b.neinStimmen} Nein · {b.enthaltungen} Enthaltung
                            {b.art === 'GEHEIM' && ' · geheime Abstimmung'}
                            {b.rechtsgrundlage && ` · ${b.rechtsgrundlage}`}
                          </p>
                          {b.bemerkung && <p className="mt-1 text-xs leading-relaxed text-slate-500">{b.bemerkung}</p>}
                        </div>
                      ))}

                      {kannBeschliessen && !abgeschlossen && lage.beschlussfassungMoeglich && t.beschluesse.length === 0 && t.status !== 'ZUR_KENNTNIS' && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-marke-700">
                            Beschluss erfassen
                          </summary>
                          <form action={erfasseBeschluss} className="mt-2 space-y-2 rounded-md border border-slate-200 p-3">
                            <input type="hidden" name="topId" value={t.id} />
                            <div>
                              <label className="block text-xs font-medium text-slate-600">
                                Wortlaut des Beschlusses (§ 34 Abs. 1 S. 2 BetrVG)
                              </label>
                              <textarea
                                name="wortlaut"
                                rows={3}
                                required
                                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                placeholder="Der Betriebsrat beschließt …"
                              />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-medium text-slate-600">Rechtsgrundlage</label>
                                <input
                                  name="rechtsgrundlage"
                                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                  placeholder="§ 99 Abs. 2 Nr. 1 BetrVG"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600">Erforderliche Mehrheit</label>
                                <select
                                  name="mehrheit"
                                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                >
                                  <option value="EINFACHE_MEHRHEIT_ANWESENDE">
                                    Mehrheit der Anwesenden (§ 33 Abs. 1 BetrVG)
                                  </option>
                                  <option value="MEHRHEIT_DER_MITGLIEDER">
                                    Mehrheit der Mitglieder (§§ 27, 28 BetrVG)
                                  </option>
                                  <option value="ZWEI_DRITTEL">Zwei Drittel</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-slate-600">Ja</label>
                                <input name="ja" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600">Nein</label>
                                <input name="nein" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600">Enthaltung</label>
                                <input name="enthaltung" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600">Art</label>
                                <select name="art" className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                                  <option value="OFFEN">offen</option>
                                  <option value="GEHEIM">geheim</option>
                                </select>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500">
                              Grundlage der Auswertung sind {anwesendStimm} anwesende stimmberechtigte
                              Mitglieder. Enthaltungen zählen nicht als Ja-Stimmen; bei Stimmengleichheit
                              gilt der Antrag als abgelehnt.
                            </p>
                            <Knopf>Beschluss speichern</Knopf>
                          </form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {kannBeschliessen && !abgeschlossen && lage.prognose && sitzung.tops.length > 0 && (
              <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                Beschlüsse können erst erfasst werden, wenn die Sitzung eröffnet und die Anwesenheit
                festgestellt ist. § 33 Abs. 2 BetrVG stellt auf die tatsächliche Teilnahme an der
                Beschlussfassung ab – eine Erfassung auf Grundlage der bloßen Ladung wäre angreifbar.
              </p>
            )}

            {kannPlanen && !abgeschlossen && (
              <details className="mt-4 border-t border-slate-200 pt-4">
                <summary className="cursor-pointer text-xs font-medium text-marke-700">
                  Tagesordnungspunkt ergänzen
                </summary>
                <form action={ergaenzeTop} className="mt-2 space-y-2">
                  <input type="hidden" name="sitzungId" value={sitzung.id} />
                  <input
                    name="titel"
                    required
                    placeholder="Bezeichnung des Punktes"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <textarea
                    name="beschreibung"
                    rows={2}
                    placeholder="Erläuterung (optional)"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <Knopf variante="sekundaer">Hinzufügen</Knopf>
                </form>
                <p className="mt-2 text-xs text-slate-500">
                  Eine nachträgliche Erweiterung der Tagesordnung ist nur zulässig, wenn alle Mitglieder
                  – einschließlich der geladenen Ersatzmitglieder – anwesend sind und der Ergänzung
                  zustimmen. Andernfalls ist der Beschluss anfechtbar.
                </p>
              </details>
            )}
          </Karte>

          {sitzung.niederschrift && (
            <Karte
              titel="Niederschrift"
              hinweis={
                sitzung.niederschrift.freigegebenAm
                  ? `freigegeben am ${datum(sitzung.niederschrift.freigegebenAm)}`
                  : 'Entwurf'
              }
            >
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {sitzung.niederschrift.inhalt}
              </p>
              <div className="mt-4 grid gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 sm:grid-cols-2">
                <p>
                  Unterzeichnet durch den Vorsitz am {datum(sitzung.niederschrift.unterschriftVorsitzAm)}
                </p>
                <p>
                  Unterzeichnet durch ein weiteres Mitglied am{' '}
                  {datum(sitzung.niederschrift.unterschriftWeiteresAm)}
                </p>
                {sitzung.niederschrift.einspruchsfristBis && (
                  <p className="sm:col-span-2">
                    Frist für Einwendungen bis {datum(sitzung.niederschrift.einspruchsfristBis)}
                  </p>
                )}
              </div>
            </Karte>
          )}
        </div>

        <div className="space-y-6">
          <Karte titel={lage.prognose ? 'Beschlussfähigkeit (Prognose)' : 'Beschlussfähigkeit'}>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-slate-900">{lage.zahl}</span>
              <span className="text-sm text-slate-500">
                von {groesse} · benötigt {lage.erforderlich}
              </span>
            </div>
            <div className="mt-2">
              <Marke ton={lage.ausreichend ? (lage.prognose ? 'gelb' : 'gruen') : 'rot'}>
                {lage.prognose
                  ? lage.ausreichend
                    ? 'voraussichtlich beschlussfähig'
                    : 'voraussichtlich nicht beschlussfähig'
                  : lage.ausreichend
                    ? 'beschlussfähig'
                    : 'nicht beschlussfähig'}
              </Marke>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{lage.text}</p>

            {kannPlanen && !sitzung.einladungVersendetAm && !abgeschlossen && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                {sitzung.tops.length === 0 ? (
                  // Kein Knopf ohne Tagesordnung: § 29 Abs. 2 S. 3 BetrVG verlangt die Ladung
                  // *unter Mitteilung der Tagesordnung*. Die Server-Aktion weist den Vorgang
                  // ohnehin ab; hier wird der Grund vorab erklaert, statt einen Fehler zu zeigen.
                  <p className="text-xs leading-relaxed text-slate-500">
                    Die Ladung lässt sich vermerken, sobald die Tagesordnung erfasst ist.
                    § 29 Abs. 2 S. 3 BetrVG verlangt die Ladung unter Mitteilung der Tagesordnung.
                  </p>
                ) : (
                  <form action={vermerkeLadung}>
                    <input type="hidden" name="sitzungId" value={sitzung.id} />
                    <Knopf variante="sekundaer">Ladung versandt – vermerken</Knopf>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Der Versand selbst erfolgt außerhalb der Anwendung. Hier wird nur festgehalten,
                      wann geladen wurde – im Streitfall der entscheidende Nachweis.
                    </p>
                  </form>
                )}
              </div>
            )}

            {sitzung.einladungVersendetAm && (
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                Ladung vermerkt am {datum(sitzung.einladungVersendetAm)}.
              </p>
            )}

            {kannLeiten && lage.prognose && (
              <form action={stelleBeschlussfaehigkeitFest} className="mt-3">
                <input type="hidden" name="sitzungId" value={sitzung.id} />
                <Knopf variante="sekundaer">Sitzung eröffnen und Anwesenheit feststellen</Knopf>
                <p className="mt-1.5 text-xs text-slate-500">
                  Erzeugt die Anwesenheitsliste aus der Ladung. Wer tatsächlich fehlt, ist danach zu
                  korrigieren; die Liste ist nach § 34 Abs. 1 S. 3 BetrVG zu unterzeichnen.
                </p>
              </form>
            )}
          </Karte>

          <Karte titel={`Anwesenheit (${sitzung.teilnahmen.length})`}>
            {sitzung.teilnahmen.length === 0 ? (
              <Leer text="Es ist noch keine Teilnahme erfasst." />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {sitzung.teilnahmen.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className={t.status === 'VERTRETEN' ? 'text-slate-400 line-through' : 'text-slate-700'}>
                      {t.person.vorname} {t.person.nachname}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {t.status === 'VERTRETEN'
                        ? 'vertreten'
                        : t.status === 'GELADEN'
                          ? t.rolle === 'ERSATZMITGLIED'
                            ? 'Ersatzmitglied, geladen'
                            : 'geladen'
                          : t.rolle === 'ERSATZMITGLIED'
                            ? 'Ersatzmitglied, anwesend'
                            : 'anwesend'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Karte>

          <Karte
            titel="Verhinderungen und Nachrücken"
            hinweis="§ 25 Abs. 1 BetrVG"
          >
            {sitzung.verhinderungen.length === 0 ? (
              <p className="text-sm text-slate-500">Es liegen keine Verhinderungsmeldungen vor.</p>
            ) : (
              <ul className="space-y-3">
                {sitzung.verhinderungen.map((v) => {
                  const ersatz = ersatzPersonen.find((e) => e.id === v.ersatzPersonId);
                  return (
                    <li key={v.id} className="rounded-md bg-slate-50 p-3 text-sm">
                      <p className="font-medium text-slate-800">
                        {v.person.vorname} {v.person.nachname}
                      </p>
                      <p className="text-xs text-slate-500">{GRUNDTEXT[v.grund] ?? v.grund}</p>
                      <p className="mt-1 text-xs">
                        {ersatz ? (
                          <span className="text-emerald-800">
                            Ersatzmitglied geladen: {ersatz.vorname} {ersatz.nachname}
                          </span>
                        ) : (
                          <span className="text-rose-700">Kein Ersatzmitglied verfügbar</span>
                        )}
                      </p>
                      {kannPlanen && !abgeschlossen && (
                        <form action={loescheVerhinderung} className="mt-2">
                          <input type="hidden" name="sitzungId" value={sitzung.id} />
                          <input type="hidden" name="personId" value={v.personId} />
                          <button type="submit" className="text-xs text-slate-500 underline hover:text-rose-700">
                            Meldung zurücknehmen
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {kannPlanen && !abgeschlossen && nichtGemeldet.length > 0 && (
              <form action={meldeVerhinderung} className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                <input type="hidden" name="sitzungId" value={sitzung.id} />
                <label className="block text-xs font-medium text-slate-600">Verhinderung melden</label>
                <select name="personId" required className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                  {nichtGemeldet.map((m) => (
                    <option key={m.id} value={m.personId}>
                      {m.person.vorname} {m.person.nachname}
                    </option>
                  ))}
                </select>
                <select name="grund" className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                  <option value="SCHICHT">Schichtlage</option>
                  <option value="URLAUB">Urlaub</option>
                  <option value="KRANKHEIT">Arbeitsunfähigkeit</option>
                  <option value="DIENSTREISE">Dienstreise</option>
                  <option value="BEFANGENHEIT">rechtliche Verhinderung (eigene Angelegenheit)</option>
                  <option value="SONSTIGES">sonstiger Grund</option>
                </select>
                <Knopf variante="sekundaer">Melden und Ersatzmitglied ermitteln</Knopf>
                <p className="text-xs text-slate-500">
                  Zum Grund wird nur die Kategorie gespeichert. Angaben zur Erkrankung gehören nicht in
                  die Sitzungsunterlagen.
                </p>
              </form>
            )}
          </Karte>

          <Rechtshinweis norm="§ 30 Abs. 2 Nr. 3 BetrVG">
            Bei {groesse} Mitgliedern genügen {viertelQuorum(groesse)} Widersprüche, um eine Video- oder
            Telefonsitzung auszuschließen. Aktuell sind {sitzung.widerspruchVideoAnzahl} Widersprüche erfasst.
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
