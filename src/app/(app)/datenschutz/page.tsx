import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { fristampel } from '@/lib/fristen';
import { datum } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle, Warnung } from '@/components/ui';

export const dynamic = 'force-dynamic';

const ANFRAGETYP: Record<string, string> = {
  AUSKUNFT_15: 'Auskunft (Art. 15 DSGVO)',
  BERICHTIGUNG_16: 'Berichtigung (Art. 16 DSGVO)',
  LOESCHUNG_17: 'Löschung (Art. 17 DSGVO)',
  EINSCHRAENKUNG_18: 'Einschränkung (Art. 18 DSGVO)',
  WIDERSPRUCH_21: 'Widerspruch (Art. 21 DSGVO)',
};

export default async function Datenschutz() {
  await verlangeRecht('datenschutz.lesen');
  const jetzt = new Date();

  const [vvt, regeln, anfragen, faelligeVorgaenge, faelligeDokumente] = await Promise.all([
    prisma.verarbeitungstaetigkeit.findMany({ orderBy: { bezeichnung: 'asc' } }),
    prisma.loeschregel.findMany({ orderBy: { entitaet: 'asc' } }),
    prisma.betroffenenanfrage.findMany({ orderBy: { fristBis: 'asc' } }),
    prisma.vorgang.findMany({
      where: { loeschenAb: { lte: jetzt }, geloeschtAm: null },
      select: { id: true, aktenzeichen: true, titel: true, loeschenAb: true },
    }),
    prisma.dokument.count({ where: { loeschenAb: { lte: jetzt }, geloeschtAm: null } }),
  ]);

  const offeneAnfragen = anfragen.filter((a) => a.status !== 'BEANTWORTET' && a.status !== 'ABGELEHNT');
  const dsfa = vvt.filter((v) => v.dsfaErforderlich);

  return (
    <>
      <Seitenkopf
        titel="Datenschutz"
        beschreibung="Verzeichnis der Verarbeitungstätigkeiten, Löschkonzept und Betroffenenrechte. Verantwortlicher ist nach § 79a S. 2 BetrVG der Arbeitgeber – die Zugriffshoheit auf die Inhalte bleibt gleichwohl beim Betriebsrat."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Kennzahl wert={vvt.length} bezeichnung="Verarbeitungstätigkeiten" hinweis="Art. 30 DSGVO" />
        <Kennzahl wert={regeln.length} bezeichnung="Löschregeln" hinweis="Art. 5 Abs. 1 lit. e DSGVO" />
        <Kennzahl wert={offeneAnfragen.length} bezeichnung="Offene Betroffenenanträge" ton={offeneAnfragen.length ? 'gelb' : 'gruen'} />
        <Kennzahl
          wert={faelligeVorgaenge.length + faelligeDokumente}
          bezeichnung="Löschung überfällig"
          ton={faelligeVorgaenge.length + faelligeDokumente ? 'rot' : 'gruen'}
        />
      </div>

      {faelligeVorgaenge.length > 0 && (
        <div className="mb-6">
          <Warnung titel="Aufbewahrungsfristen überschritten">
            {faelligeVorgaenge.length} Vorgänge hätten gelöscht werden müssen:{' '}
            {faelligeVorgaenge.map((v) => v.aktenzeichen).join(', ')}. Vor der Löschung ist zu prüfen,
            ob ein arbeitsgerichtliches Verfahren anhängig ist – dann ist die Löschung auszusetzen und
            der Grund zu vermerken.
          </Warnung>
        </div>
      )}

      <div className="space-y-6">
        <Karte
          titel="Verzeichnis von Verarbeitungstätigkeiten"
          hinweis="Der Betriebsrat liefert seinen Teil eigenverantwortlich zu, ohne vertrauliche Inhalte offenzulegen."
        >
          {vvt.length === 0 ? (
            <Leer text="Es sind keine Verarbeitungstätigkeiten dokumentiert." />
          ) : (
            <div className="space-y-5">
              {vvt.map((v) => (
                <article key={v.id} className="border-l-2 border-slate-200 pl-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{v.bezeichnung}</h3>
                    <div className="flex gap-1.5">
                      {v.dsfaErforderlich && <Marke ton="violett">Folgenabschätzung</Marke>}
                      {v.drittlandtransfer && <Marke ton="gelb">Drittlandtransfer</Marke>}
                    </div>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-slate-500">Zweck</dt>
                      <dd className="text-slate-700">{v.zweck}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Rechtsgrundlage</dt>
                      <dd className="text-slate-700">{v.rechtsgrundlage}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Betroffene</dt>
                      <dd className="text-slate-700">{v.betroffeneKategorien}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Datenkategorien</dt>
                      <dd className="text-slate-700">{v.datenkategorien}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Empfänger</dt>
                      <dd className="text-slate-700">{v.empfaenger ?? '–'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Löschfrist</dt>
                      <dd className="text-slate-700">{v.loeschfrist}</dd>
                    </div>
                    {v.tom && (
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-slate-500">Technische und organisatorische Maßnahmen</dt>
                        <dd className="text-slate-700">{v.tom}</dd>
                      </div>
                    )}
                    {v.dsfaVermerk && (
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-slate-500">Folgenabschätzung</dt>
                        <dd className="text-slate-700">{v.dsfaVermerk}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          )}
        </Karte>

        <div className="grid gap-6 lg:grid-cols-2">
          <Karte titel="Löschkonzept">
            {regeln.length === 0 ? (
              <Leer text="Es sind keine Löschregeln hinterlegt." />
            ) : (
              <Tabelle kopf={['Datenbestand', 'Aufbewahrung', 'Begründung']}>
                {regeln.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-2 py-2">
                      <span className="text-slate-900">{r.bezeichnung}</span>
                      <span className="block font-mono text-xs text-slate-400">{r.entitaet}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-700">
                      {r.aufbewahrungMonate} Monate
                    </td>
                    <td className="px-2 py-2 text-xs leading-relaxed text-slate-600">{r.begruendung}</td>
                  </tr>
                ))}
              </Tabelle>
            )}
          </Karte>

          <Karte titel="Betroffenenanträge" hinweis="Art. 12 Abs. 3 DSGVO: Antwort binnen eines Monats">
            {anfragen.length === 0 ? (
              <Leer text="Es liegen keine Anträge vor." />
            ) : (
              <ul className="space-y-3">
                {anfragen.map((a) => {
                  const ampel = fristampel(a.fristBis, jetzt);
                  return (
                    <li key={a.id} className="rounded-md bg-slate-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{a.antragstellerName}</p>
                          <p className="text-xs text-slate-500">{ANFRAGETYP[a.typ] ?? a.typ}</p>
                        </div>
                        <Marke ton={ampel === 'ABGELAUFEN' ? 'rot' : ampel === 'OFFEN' ? 'gruen' : 'gelb'}>
                          bis {datum(a.fristBis)}
                        </Marke>
                      </div>
                      {a.beschreibung && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{a.beschreibung}</p>
                      )}
                      {a.dsbEinbezogen && (
                        <p className="mt-1 text-xs text-slate-500">
                          Datenschutzbeauftragte:r eingebunden – Verschwiegenheit gegenüber dem
                          Arbeitgeber nach § 79a S. 3 BetrVG.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Karte>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Rechtshinweis norm="§ 79a BetrVG">
            Seit 2021 stellt das Gesetz klar, dass der Arbeitgeber auch für die Verarbeitung durch den
            Betriebsrat datenschutzrechtlich Verantwortlicher ist und beide einander unterstützen. Ein
            Einsichtsrecht des Arbeitgebers in Betriebsratsunterlagen folgt daraus nicht – die
            Unabhängigkeit des Gremiums nach § 78 BetrVG und die Geheimhaltungspflicht nach § 79 BetrVG
            bleiben unberührt. Technisch wird das hier durch getrennte Rollen, verschlüsselte
            Dokumentenablage und ein manipulationsgeschütztes Zugriffsprotokoll abgebildet.
          </Rechtshinweis>
          <Rechtshinweis norm="Art. 35 DSGVO">
            {dsfa.length > 0
              ? `Für ${dsfa.length} Verarbeitungstätigkeiten wurde eine Datenschutz-Folgenabschätzung als erforderlich bewertet: ${dsfa
                  .map((v) => v.bezeichnung)
                  .join(', ')}.`
              : 'Für keine der erfassten Verarbeitungstätigkeiten wurde eine Folgenabschätzung als erforderlich bewertet. Das ist bei der Verarbeitung von Gesundheits- und Sozialdaten im Kündigungsverfahren erneut zu prüfen.'}
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
