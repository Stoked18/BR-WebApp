import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { aufsichtsratLage } from '@/lib/betrvg';
import { datum } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUSTEXT: Record<string, string> = {
  VORBEREITUNG: 'Vorbereitung',
  WAHLVORSTAND_BESTELLT: 'Wahlvorstand bestellt',
  WAHLAUSSCHREIBEN: 'Wahlausschreiben erlassen',
  KANDIDATUR: 'Kandidaturphase',
  WAHL: 'Wahl',
  KONSTITUIERT: 'konstituiert',
};

export default async function Aufsichtsrat() {
  await verlangeRecht('gremium.lesen');
  const jetzt = new Date();

  const [betrieb, projekt] = await Promise.all([
    prisma.betrieb.findFirst(),
    prisma.aufsichtsratProjekt.findFirst({
      include: { meilensteine: { orderBy: { reihenfolge: 'asc' } } },
    }),
  ]);

  if (!betrieb) return <Leer text="Es sind keine Stammdaten erfasst." />;

  const lage = aufsichtsratLage(betrieb.anzahlBeschaeftigte, projekt?.sitzeGesamt);
  const erledigt = projekt?.meilensteine.filter((m) => m.erledigtAm).length ?? 0;
  const gesamt = projekt?.meilensteine.length ?? 0;
  const naechster = projekt?.meilensteine.find((m) => !m.erledigtAm);

  return (
    <>
      <Seitenkopf
        titel="Aufsichtsrat"
        beschreibung="Vorbereitung der Unternehmensmitbestimmung. Die Bildung des Aufsichtsrats ist Sache des Unternehmens; die Wahl der Arbeitnehmervertreter organisiert die Arbeitnehmerseite."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Kennzahl wert={lage.gesetz === 'KEINE' ? '–' : lage.gesetz} bezeichnung="Anwendbares Gesetz" ton="blau" />
        <Kennzahl wert={projekt?.sitzeGesamt ?? lage.sitzeGesamtVorschlag} bezeichnung="Sitze insgesamt" />
        <Kennzahl
          wert={projekt?.sitzeArbeitnehmer ?? lage.sitzeArbeitnehmer}
          bezeichnung="Arbeitnehmervertreter"
          hinweis="§ 4 Abs. 1 DrittelbG"
          ton="violett"
        />
        <Kennzahl wert={`${erledigt} / ${gesamt}`} bezeichnung="Meilensteine erledigt" ton={erledigt === gesamt && gesamt > 0 ? 'gruen' : 'gelb'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Karte titel="Rechtliche Einordnung">
            <p className="text-sm leading-relaxed text-slate-700">{lage.grundlage}</p>
            <ul className="mt-3 space-y-2">
              {lage.hinweise.map((h) => (
                <li key={h} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Karte>

          {projekt ? (
            <Karte
              titel="Zeitplan"
              hinweis={`Status: ${STATUSTEXT[projekt.status] ?? projekt.status}${projekt.zieldatum ? ` · Zieltermin ${datum(projekt.zieldatum)}` : ''}`}
            >
              <ol className="space-y-4">
                {projekt.meilensteine.map((m) => {
                  const ueberfaellig = !m.erledigtAm && m.faelligAm && m.faelligAm < jetzt;
                  return (
                    <li
                      key={m.id}
                      className={`border-l-2 pl-4 ${
                        m.erledigtAm ? 'border-emerald-400' : ueberfaellig ? 'border-rose-400' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-medium ${m.erledigtAm ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {m.reihenfolge}. {m.bezeichnung}
                          </p>
                          {m.rechtsgrundlage && <p className="text-xs text-slate-500">{m.rechtsgrundlage}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          {m.erledigtAm ? (
                            <Marke ton="gruen">erledigt {datum(m.erledigtAm)}</Marke>
                          ) : (
                            <span className={`text-xs ${ueberfaellig ? 'font-medium text-rose-700' : 'text-slate-500'}`}>
                              bis {datum(m.faelligAm)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Karte>
          ) : (
            <Karte titel="Zeitplan">
              <Leer text="Es ist noch kein Projekt zur Bildung des Aufsichtsrats angelegt." />
            </Karte>
          )}

          {projekt?.bemerkung && (
            <Karte titel="Vermerk">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{projekt.bemerkung}</p>
            </Karte>
          )}
        </div>

        <div className="space-y-6">
          {naechster && (
            <Karte titel="Nächster Schritt">
              <p className="text-sm font-medium text-slate-900">{naechster.bezeichnung}</p>
              {naechster.rechtsgrundlage && (
                <p className="mt-0.5 text-xs text-slate-500">{naechster.rechtsgrundlage}</p>
              )}
              <p className="mt-2 text-sm text-slate-600">fällig bis {datum(naechster.faelligAm)}</p>
            </Karte>
          )}

          <Rechtshinweis norm="§ 5 DrittelbG">
            Die Arbeitnehmervertreter werden von den Arbeitnehmern in unmittelbarer und geheimer Wahl
            gewählt. Bei durchgehendem Schichtbetrieb ist der Wahlvorgang so zu organisieren, dass
            auch Nacht- und Wochenendschichten ihre Stimme abgeben können – etwa durch verlängerte
            Öffnungszeiten des Wahllokals oder schriftliche Stimmabgabe.
          </Rechtshinweis>

          <Rechtshinweis norm="§ 2 Abs. 2 DrittelbG">
            Bei Konzernzugehörigkeit sind Arbeitnehmer von Konzernunternehmen unter den dort genannten
            Voraussetzungen dem herrschenden Unternehmen zuzurechnen. Das kann die Schwellenwerte
            verändern und ist vor der Festlegung der Aufsichtsratsgröße zu klären.
          </Rechtshinweis>

          <Rechtshinweis norm="§§ 97 ff. AktG">
            Streitet man über die richtige Zusammensetzung, entscheidet das Statusverfahren. Das
            Verfahren kann auch vom Betriebsrat oder von einer Mindestzahl von Arbeitnehmern
            eingeleitet werden – ein wirksames Mittel, wenn das Unternehmen die Bildung verzögert.
          </Rechtshinweis>

          <Rechtshinweis norm="§ 79 BetrVG, § 116 AktG">
            Arbeitnehmervertreter im Aufsichtsrat unterliegen der aktienrechtlichen
            Verschwiegenheitspflicht. Sie dürfen Aufsichtsratsinformationen nicht ohne Weiteres in den
            Betriebsrat tragen. Diese Trennung ist auch in der Rechtevergabe dieses Systems abzubilden.
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
