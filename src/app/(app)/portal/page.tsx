import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { fristampel, verbleibendeTage } from '@/lib/fristen';
import { datum, relativeTage } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';
import { STATUSTEXT, VORGANGSTYP } from '@/lib/vorgangstexte';

export const dynamic = 'force-dynamic';

/**
 * Antragsportal der Arbeitgeberseite.
 *
 * Sichtbar sind ausschliesslich die selbst eingereichten Vorgaenge – und von
 * diesen nur der Sachstand und die abschliessende Antwort des Gremiums. Wie der
 * Betriebsrat intern beraten und abgestimmt hat, bleibt verborgen (§§ 78, 79 BetrVG).
 */
export default async function Portal() {
  const benutzer = await verlangeRecht('vorgang.einreichen');
  const jetzt = new Date();

  const vorgaenge = await prisma.vorgang.findMany({
    where: { einreicherId: benutzer.id },
    orderBy: { eingegangenAm: 'desc' },
    select: {
      id: true,
      aktenzeichen: true,
      typ: true,
      titel: true,
      eingegangenAm: true,
      fristBis: true,
      status: true,
      antwortText: true,
      antwortAm: true,
      betroffeneInitialen: true,
      zustimmungsfiktion: true,
    },
  });

  const offen = vorgaenge.filter((v) => !['ABGESCHLOSSEN', 'BEANTWORTET', 'ZURUECKGEZOGEN'].includes(v.status));
  const beantwortet = vorgaenge.filter((v) => v.antwortText);

  return (
    <>
      <Seitenkopf
        titel="Meine Anträge"
        beschreibung="Beteiligungsverfahren, die Sie beim Betriebsrat eingeleitet haben."
        aktion={
          <Link
            href="/portal/neu"
            className="rounded-md bg-marke-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-marke-800"
          >
            Neuen Antrag stellen
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kennzahl wert={vorgaenge.length} bezeichnung="Anträge insgesamt" />
        <Kennzahl wert={offen.length} bezeichnung="In Bearbeitung" ton={offen.length ? 'blau' : 'gruen'} />
        <Kennzahl wert={beantwortet.length} bezeichnung="Beantwortet" ton="gruen" />
      </div>

      <Karte titel="Übersicht">
        {vorgaenge.length === 0 ? (
          <Leer text="Sie haben noch keine Anträge eingereicht." />
        ) : (
          <Tabelle kopf={['Aktenzeichen', 'Gegenstand', 'Eingereicht', 'Frist des Betriebsrats', 'Sachstand']}>
            {vorgaenge.map((v) => {
              const typ = VORGANGSTYP[v.typ] ?? { text: v.typ, norm: '' };
              const ampel = fristampel(v.fristBis, jetzt);
              const erledigt = Boolean(v.antwortAm);
              return (
                <tr key={v.id} className="align-top">
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-slate-500">{v.aktenzeichen}</td>
                  <td className="px-2 py-2">
                    <span className="font-medium text-slate-900">{v.titel}</span>
                    <span className="block text-xs text-slate-500">
                      {typ.text} · {typ.norm}
                      {v.betroffeneInitialen && ` · betrifft ${v.betroffeneInitialen}`}
                    </span>
                    {v.antwortText && (
                      <div className="mt-2 rounded-md bg-slate-50 p-2">
                        <p className="text-xs font-medium text-slate-600">
                          Antwort des Betriebsrats vom {datum(v.antwortAm)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-700">{v.antwortText}</p>
                      </div>
                    )}
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
                      <span className="text-slate-400">
                        keine laufende Frist
                        <span className="mt-0.5 block">Unterrichtung ggf. unvollständig</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Marke ton={erledigt ? 'gruen' : ampel === 'ABGELAUFEN' ? 'neutral' : 'blau'}>
                      {STATUSTEXT[v.status] ?? v.status}
                    </Marke>
                  </td>
                </tr>
              );
            })}
          </Tabelle>
        )}
      </Karte>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Rechtshinweis norm="§ 99 Abs. 1 BetrVG">
          Die Wochenfrist läuft erst ab vollständiger Unterrichtung. Zeigt Ihnen der Betriebsrat an,
          dass Angaben oder Unterlagen fehlen, beginnt die Frist erst mit deren Nachreichung. In der
          Spalte „Frist" steht dann keine Angabe.
        </Rechtshinweis>
        <Rechtshinweis norm="§§ 78, 79 BetrVG">
          Wie der Betriebsrat intern berät und abstimmt, ist Ihnen hier nicht zugänglich. Sichtbar
          sind allein Ihr Antrag, der Sachstand und die abschließende Stellungnahme des Gremiums.
        </Rechtshinweis>
      </div>
    </>
  );
}
