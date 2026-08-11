import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { BEWEGUNGSDATEN, GESCHUETZT, STAMMDATEN } from '@/lib/bestand';
import { Karte, Knopf, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';
import { Rueckmeldung } from '@/components/rueckmeldung';
import { setzeBestandZurueck } from '../aktionen';

export const dynamic = 'force-dynamic';

const feld = 'mt-1 w-full max-w-sm rounded border border-slate-300 px-2 py-1.5 text-sm';

/**
 * Bestand zuruecksetzen.
 *
 * Gedacht fuer die Erprobung: der Beispielbestand wird entfernt, damit der
 * echte Betrieb auf einem leeren Stand beginnt. Bewusst zweistufig und mit
 * Eingabebestaetigung, weil hier nichts rueckholbar ist.
 */
export default async function Datenbestand({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  await verlangeRecht('benutzer.verwalten');
  const { ok, fehler } = await searchParams;

  const betrieb = await prisma.betrieb.findFirst({ select: { name: true } });

  const [sitzungen, vorgaenge, beschluesse, aufgaben, dokumente, vereinbarungen, personen, konten, protokoll] =
    await Promise.all([
      prisma.sitzung.count(),
      prisma.vorgang.count(),
      prisma.beschluss.count(),
      prisma.aufgabe.count(),
      prisma.dokument.count(),
      prisma.betriebsvereinbarung.count(),
      prisma.person.count(),
      prisma.benutzer.count(),
      prisma.auditEintrag.count(),
    ]);

  const bestand = [
    { was: 'Sitzungen', zahl: sitzungen },
    { was: 'Vorgänge', zahl: vorgaenge },
    { was: 'Beschlüsse', zahl: beschluesse },
    { was: 'Aufgaben', zahl: aufgaben },
    { was: 'Dokumente', zahl: dokumente },
    { was: 'Betriebsvereinbarungen', zahl: vereinbarungen },
    { was: 'Personen', zahl: personen },
    { was: 'Benutzerkonten', zahl: konten },
    { was: 'Protokolleinträge', zahl: protokoll },
  ];

  return (
    <>
      <Seitenkopf
        titel="Bestand zurücksetzen"
        beschreibung="Entfernt den Beispielbestand, damit die Erprobung auf einem sauberen Stand beginnt."
        aktion={
          <Link
            href="/verwaltung"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Zurück zur Verwaltung
          </Link>
        }
      />

      <Rueckmeldung ok={ok} fehler={fehler} />

      <div className="mb-6">
        <Warnung titel="Gelöschte Daten sind nicht wiederherstellbar.">
          Es gibt in der Anwendung keinen Papierkorb. Legen Sie vorher eine Datenbanksicherung an
          (siehe <code className="rounded bg-amber-100 px-1">docs/BETRIEB.md</code>). Nach dem
          Übergang in den Echtbetrieb sollte diese Seite nicht mehr benutzt werden – für einzelne
          Löschungen gibt es die Löschregeln im Datenschutzmodul.
        </Warnung>
      </div>

      <div className="space-y-6">
        <Karte titel="Aktueller Bestand">
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {bestand.map((z) => (
              <div key={z.was} className="flex justify-between gap-4 border-b border-slate-100 py-1">
                <dt className="text-slate-600">{z.was}</dt>
                <dd className="font-medium tabular-nums text-slate-900">{z.zahl}</dd>
              </div>
            ))}
          </dl>
        </Karte>

        <Karte
          titel="Stufe 1 – Bewegungsdaten löschen"
          hinweis="Personen, Mitgliedschaften, Ausschüsse und Konten bleiben erhalten."
        >
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Entfernt alles, was im laufenden Betrieb entsteht: Sitzungen samt Tagesordnung,
            Niederschriften und Beschlüssen, Vorgänge mit ihren Fristen, Aufgaben, Dokumente,
            Betriebsvereinbarungen, Schulungen, Sprechstunden, das Aufsichtsratsprojekt sowie
            Verzeichnis, Löschregeln und Betroffenenanfragen des Datenschutzmoduls.
          </p>
          <p className="mb-4 text-xs text-slate-500">
            Betroffene Tabellen ({BEWEGUNGSDATEN.length}): {BEWEGUNGSDATEN.join(', ')}
          </p>
          <form action={setzeBestandZurueck} className="space-y-2">
            <input type="hidden" name="tiefe" value="BEWEGUNG" />
            <label htmlFor="best1" className="block text-xs font-medium text-slate-600">
              Zur Bestätigung <code className="rounded bg-slate-100 px-1">LÖSCHEN</code> eintragen
            </label>
            <input id="best1" name="bestaetigung" required autoComplete="off" className={feld} />
            <Knopf variante="gefahr">Bewegungsdaten löschen</Knopf>
          </form>
        </Karte>

        <Karte
          titel="Stufe 2 – Alle Beispieldaten löschen"
          hinweis="Zusätzlich Personen, Mitgliedschaften, Ausschüsse, alle übrigen Konten und das Zugriffsprotokoll."
        >
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Entfernt zusätzlich die Personen mit ihren Mitgliedschaften, Funktionen, Freistellungen
            und Wahlergebnissen, die Ausschüsse, die Schichtmodelle und alle Benutzerkonten außer
            Ihrem eigenen. Erhalten bleiben Betrieb, Gremium, Amtsperiode und Ihre Einstellungen
            ({GESCHUETZT.join(', ')}) – sonst wären Sie nach dem Löschen ausgesperrt.
          </p>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            <strong className="font-semibold">Das Zugriffsprotokoll wird dabei geleert und beginnt neu.</strong>{' '}
            Das ist kein Nebeneffekt, sondern notwendig: Die Einträge sind über eine Hash-Kette
            verbunden und verweisen auf die Konten, die gerade gelöscht werden. Bliebe das Protokoll
            stehen, meldete seine Prüfung ab sofort dauerhaft eine Manipulation. Der erste Eintrag
            der neuen Kette hält fest, wer wann zurückgesetzt hat.
          </p>
          <p className="mb-4 text-xs text-slate-500">
            Zusätzlich betroffene Tabellen ({STAMMDATEN.length}): {STAMMDATEN.join(', ')}
          </p>
          <form action={setzeBestandZurueck} className="space-y-2">
            <input type="hidden" name="tiefe" value="VOLLSTAENDIG" />
            <label htmlFor="best2" className="block text-xs font-medium text-slate-600">
              Zur Bestätigung den Namen des Betriebs eintragen:{' '}
              <code className="rounded bg-slate-100 px-1">{betrieb?.name ?? 'LÖSCHEN'}</code>
            </label>
            <input id="best2" name="bestaetigung" required autoComplete="off" className={feld} />
            <Knopf variante="gefahr">Alle Beispieldaten löschen</Knopf>
          </form>
        </Karte>

        <Rechtshinweis norm="§ 34 Abs. 2 BetrVG, Art. 5 Abs. 1 lit. e DSGVO">
          Solange die Erprobung läuft, bleibt die Papierakte maßgeblich: Niederschriften sind zu
          unterzeichnen und aufzubewahren, die Beschlusssammlung ist fortzuführen. Ein Zurücksetzen
          in dieser Anwendung berührt diese Unterlagen nicht. Umgekehrt ersetzt es auch keine
          Löschung nach Art. 17 DSGVO – dafür sind die Löschregeln im Datenschutzmodul vorgesehen,
          die einzelne Daten fristgebunden und dokumentiert entfernen.
        </Rechtshinweis>
      </div>
    </>
  );
}
