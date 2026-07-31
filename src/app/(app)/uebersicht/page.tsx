import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { fristampel, verbleibendeTage } from '@/lib/fristen';
import { TURNUSPFLICHTEN, erforderlicheTeilnehmer, freistellungen, pruefeGroesse } from '@/lib/betrvg';
import { datum, datumZeit, relativeTage } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';

export const dynamic = 'force-dynamic';

const AMPELTON = { ABGELAUFEN: 'rot', KRITISCH: 'rot', WARNUNG: 'gelb', OFFEN: 'gruen', KEINE_FRIST: 'neutral' } as const;
const AMPELTEXT = {
  ABGELAUFEN: 'abgelaufen',
  KRITISCH: 'läuft heute ab',
  WARNUNG: 'dringend',
  OFFEN: 'offen',
  KEINE_FRIST: 'ohne Frist',
} as const;

export default async function Uebersicht() {
  // Die Uebersicht buendelt Gremiumsdaten; Rollen ohne fachlichen Zugriff
  // (IT-Betrieb, Datenschutzbeauftragte) werden von "/" anders geleitet.
  const benutzer = await verlangeRecht('gremium.lesen');
  const jetzt = new Date();

  const darfVorgaenge = darf(benutzer, 'vorgang.lesen');
  const darfSitzungen = darf(benutzer, 'sitzung.lesen');
  const darfAufgaben = darf(benutzer, 'aufgabe.lesen');

  const [betrieb, gremium, offeneVorgaenge, naechsteSitzung, offeneAufgaben, letzteTermine] =
    await Promise.all([
      prisma.betrieb.findFirst(),
      prisma.gremium.findFirst({
        where: { typ: 'BETRIEBSRAT' },
        include: {
          mitgliedschaften: { where: { status: 'ORDENTLICH', ende: null } },
          ausschuesse: { where: { aktiv: true }, select: { id: true } },
        },
      }),
      darfVorgaenge
        ? prisma.vorgang.findMany({
            where: { status: { notIn: ['ABGESCHLOSSEN', 'ZURUECKGEZOGEN', 'BEANTWORTET'] } },
            orderBy: [{ fristBis: { sort: 'asc', nulls: 'last' } }, { eingegangenAm: 'asc' }],
            take: 8,
          })
        : Promise.resolve([]),
      darfSitzungen
        ? prisma.sitzung.findFirst({
            where: { beginn: { gte: jetzt }, gremiumId: { not: null }, status: { not: 'ABGESAGT' } },
            orderBy: { beginn: 'asc' },
            include: { tops: { orderBy: { nummer: 'asc' } }, verhinderungen: true },
          })
        : Promise.resolve(null),
      darfAufgaben
        ? prisma.aufgabe.findMany({
            where: { status: { in: ['OFFEN', 'IN_ARBEIT', 'WARTET'] } },
            orderBy: { faelligAm: { sort: 'asc', nulls: 'last' } },
            take: 6,
            include: { zustaendig: true },
          })
        : Promise.resolve([]),
      prisma.sitzung.findMany({
        where: { beginn: { lte: jetzt } },
        orderBy: { beginn: 'desc' },
        select: { art: true, beginn: true },
        take: 60,
      }),
    ]);

  const gremiumsgroesse = gremium?.sollGroesse ?? 0;
  const besetzt = gremium?.mitgliedschaften.length ?? 0;
  const groessePruefung = betrieb ? pruefeGroesse(betrieb.anzahlWahlberechtigte, gremiumsgroesse) : null;

  const kritisch = offeneVorgaenge.filter((v) => ['ABGELAUFEN', 'KRITISCH', 'WARNUNG'].includes(fristampel(v.fristBis, jetzt)));

  // Turnusverpflichtungen: liegt der letzte Termin laenger zurueck als vorgesehen?
  const turnus = TURNUSPFLICHTEN.map((t) => {
    const artZuTurnus: Record<string, string> = {
      BETRIEBSVERSAMMLUNG: 'BETRIEBSVERSAMMLUNG',
      MONATSGESPRAECH: 'MONATSGESPRAECH',
      ASA: 'ASA',
      BR_SITZUNG: 'ORDENTLICH',
    };
    const art = artZuTurnus[t.schluessel];
    if (!art) return null;
    const letzter = letzteTermine.find((s) => s.art === art);
    const frist = new Date(jetzt);
    frist.setMonth(frist.getMonth() - t.turnusMonate);
    return {
      ...t,
      letzter: letzter?.beginn ?? null,
      ueberfaellig: !letzter || letzter.beginn < frist,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const verhindert = naechsteSitzung?.verhinderungen.length ?? 0;
  const erwartet = gremiumsgroesse - verhindert;
  const noetig = erforderlicheTeilnehmer(gremiumsgroesse);

  return (
    <>
      <Seitenkopf
        titel="Übersicht"
        beschreibung={`Guten Tag, ${benutzer.anzeigename.split(' ')[0]}. Hier stehen die Vorgänge, bei denen ein Fristablauf unmittelbare Rechtsfolgen auslöst.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {darfVorgaenge && (
        <Kennzahl
          wert={kritisch.length}
          bezeichnung="Fristen unter Beobachtung"
          hinweis="Vorgänge mit Ablauf in den nächsten drei Tagen oder bereits verstrichener Frist"
          ton={kritisch.length > 0 ? 'rot' : 'gruen'}
          href="/vorgaenge"
        />
        )}
        <Kennzahl
          wert={`${besetzt} / ${gremiumsgroesse}`}
          bezeichnung="Ordentliche Mitglieder"
          hinweis={groessePruefung?.stimmig ? 'Größe entspricht § 9 BetrVG' : 'Abweichung von § 9 BetrVG – siehe Rechtsprüfung'}
          ton={groessePruefung?.stimmig ? 'gruen' : 'gelb'}
          href="/gremium"
        />
        <Kennzahl
          wert={gremium?.ausschuesse.length ?? 0}
          bezeichnung="Aktive Ausschüsse"
          hinweis="einschließlich Betriebsausschuss nach § 27 BetrVG"
          ton="blau"
          href="/ausschuesse"
        />
        {darfAufgaben && (
        <Kennzahl
          wert={offeneAufgaben.length}
          bezeichnung="Offene Aufgaben"
          hinweis="aus Beschlüssen und laufenden Vorgängen"
          ton="neutral"
          href="/aufgaben"
        />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {darfVorgaenge && (
          <Karte
            titel="Fristen"
            hinweis="Bei § 99 BetrVG tritt mit Fristablauf die Zustimmungsfiktion ein – der Vorgang ist dann nicht mehr aufzuhalten."
            aktion={
              <Link href="/vorgaenge" className="text-xs font-medium text-marke-700 hover:underline">
                alle Vorgänge
              </Link>
            }
          >
            {offeneVorgaenge.length === 0 ? (
              <Leer text="Zurzeit sind keine Vorgänge offen." />
            ) : (
              <Tabelle kopf={['Aktenzeichen', 'Gegenstand', 'Frist', 'Status']}>
                {offeneVorgaenge.map((v) => {
                  const ampel = fristampel(v.fristBis, jetzt);
                  return (
                    <tr key={v.id} className="align-top">
                      <td className="px-2 py-2 font-mono text-xs text-slate-500">{v.aktenzeichen}</td>
                      <td className="px-2 py-2">
                        <Link href={`/vorgaenge/${v.id}`} className="font-medium text-slate-900 hover:text-marke-700">
                          {v.titel}
                        </Link>
                        {v.zustimmungsfiktion && (
                          <span className="mt-0.5 block text-xs text-rose-700">
                            Zustimmungsfiktion bei Fristablauf (§ 99 Abs. 3 S. 2 BetrVG)
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs">
                        {v.fristBis ? (
                          <>
                            <span className="block text-slate-900">{datum(v.fristBis)}</span>
                            <span className="text-slate-500">{relativeTage(verbleibendeTage(v.fristBis, jetzt))}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">ohne Frist</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Marke ton={AMPELTON[ampel]}>{AMPELTEXT[ampel]}</Marke>
                      </td>
                    </tr>
                  );
                })}
              </Tabelle>
            )}
          </Karte>
          )}

          {darfSitzungen && (
          <Karte titel="Nächste Sitzung">
            {!naechsteSitzung ? (
              <Leer text="Es ist keine Sitzung angesetzt." />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Link
                      href={`/sitzungen/${naechsteSitzung.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-marke-700"
                    >
                      {naechsteSitzung.titel ?? 'Sitzung'} {naechsteSitzung.nummer}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {datumZeit(naechsteSitzung.beginn)} · {naechsteSitzung.ort ?? 'Ort offen'}
                    </p>
                  </div>
                  <Marke ton={erwartet >= noetig ? 'gruen' : 'rot'}>
                    {erwartet >= noetig ? 'voraussichtlich beschlussfähig' : 'Beschlussfähigkeit gefährdet'}
                  </Marke>
                </div>

                <p className="text-xs text-slate-600">
                  {verhindert} Verhinderungsmeldung(en) liegen vor. Damit werden {erwartet} von{' '}
                  {gremiumsgroesse} Mitgliedern erwartet; § 33 Abs. 2 BetrVG verlangt mindestens {noetig}.
                  {verhindert > 0 && ' Für jede Verhinderung ist ein Ersatzmitglied zu laden.'}
                </p>

                <ol className="space-y-1 text-sm">
                  {naechsteSitzung.tops.slice(0, 6).map((t) => (
                    <li key={t.id} className="flex gap-2 text-slate-700">
                      <span className="w-6 shrink-0 tabular-nums text-slate-400">{t.nummer}.</span>
                      <span>{t.titel}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Karte>
          )}
        </div>

        <div className="space-y-6">
          <Karte titel="Turnusverpflichtungen" hinweis="Gesetzlich vorgeschriebene Regeltermine">
            <ul className="space-y-3">
              {turnus.map((t) => (
                <li key={t.schluessel} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">{t.bezeichnung}</span>
                    <Marke ton={t.ueberfaellig ? 'rot' : 'gruen'}>{t.ueberfaellig ? 'überfällig' : 'erfüllt'}</Marke>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.grundlage} · zuletzt {t.letzter ? datum(t.letzter) : 'nicht erfasst'}
                  </p>
                </li>
              ))}
            </ul>
          </Karte>

          {darfAufgaben && (
          <Karte titel="Offene Aufgaben">
            {offeneAufgaben.length === 0 ? (
              <Leer text="Keine offenen Aufgaben." />
            ) : (
              <ul className="space-y-3">
                {offeneAufgaben.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="font-medium text-slate-800">{a.titel}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.zustaendig ? `${a.zustaendig.vorname} ${a.zustaendig.nachname}` : 'ohne Zuständigkeit'}
                      {a.faelligAm && ` · fällig ${datum(a.faelligAm)}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Karte>
          )}

          {betrieb && (
            <Karte titel="Betrieb">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Beschäftigte</dt>
                  <dd className="font-medium tabular-nums">{betrieb.anzahlBeschaeftigte}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Wahlberechtigte</dt>
                  <dd className="font-medium tabular-nums">{betrieb.anzahlWahlberechtigte}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Freistellungen § 38</dt>
                  <dd className="font-medium tabular-nums">{freistellungen(betrieb.anzahlBeschaeftigte).anzahl}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Bundesland</dt>
                  <dd className="font-medium">Nordrhein-Westfalen</dd>
                </div>
              </dl>
            </Karte>
          )}
        </div>
      </div>

      {darf(benutzer, 'gremium.lesen') && (
        <div className="mt-6">
          <Rechtshinweis norm="§ 30 Abs. 1 S. 2 BetrVG">
            Sitzungen finden in der Regel während der Arbeitszeit statt; dabei ist auf die betrieblichen
            Notwendigkeiten Rücksicht zu nehmen. Im vollkontinuierlichen Betrieb bedeutet das, die
            Sitzungslage über die Schichtgruppen zu rotieren, damit nicht immer dieselben Mitglieder aus
            der Freischicht kommen müssen.
          </Rechtshinweis>
        </div>
      )}
    </>
  );
}
