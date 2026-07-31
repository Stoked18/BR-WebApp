import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { pruefeKette } from '@/lib/audit';
import { datumZeit } from '@/lib/format';
import { Fehler, Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';

export const dynamic = 'force-dynamic';

const AKTION: Record<string, { text: string; ton: 'neutral' | 'gruen' | 'gelb' | 'rot' | 'blau' }> = {
  ANMELDUNG: { text: 'Anmeldung', ton: 'gruen' },
  ANMELDUNG_FEHLGESCHLAGEN: { text: 'Anmeldung fehlgeschlagen', ton: 'rot' },
  ABMELDUNG: { text: 'Abmeldung', ton: 'neutral' },
  LESEN: { text: 'Zugriff', ton: 'neutral' },
  ANLEGEN: { text: 'angelegt', ton: 'blau' },
  AENDERN: { text: 'geändert', ton: 'gelb' },
  LOESCHEN: { text: 'gelöscht', ton: 'rot' },
  EXPORT: { text: 'Export', ton: 'gelb' },
  FREIGABE: { text: 'Freigabe', ton: 'gruen' },
  RECHTEAENDERUNG: { text: 'Rechteänderung', ton: 'rot' },
  LOESCHLAUF: { text: 'Löschlauf', ton: 'blau' },
};

export default async function Protokoll() {
  await verlangeRecht('audit.lesen');

  const [eintraege, gesamt, pruefung] = await Promise.all([
    prisma.auditEintrag.findMany({ orderBy: { zeitpunkt: 'desc' }, take: 100 }),
    prisma.auditEintrag.count(),
    pruefeKette(),
  ]);

  const fehlversuche = eintraege.filter((e) => e.aktion === 'ANMELDUNG_FEHLGESCHLAGEN').length;

  return (
    <>
      <Seitenkopf
        titel="Zugriffsprotokoll"
        beschreibung="Jeder Eintrag enthält den Hash seines Vorgängers. Wird nachträglich ein Eintrag verändert oder entfernt, bricht die Kette und die Prüfung schlägt an."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kennzahl wert={gesamt} bezeichnung="Protokolleinträge" />
        <Kennzahl
          wert={pruefung.unversehrt ? 'unversehrt' : 'gestört'}
          bezeichnung="Integrität der Kette"
          hinweis={`${pruefung.geprueft} Einträge geprüft`}
          ton={pruefung.unversehrt ? 'gruen' : 'rot'}
        />
        <Kennzahl
          wert={fehlversuche}
          bezeichnung="Fehlgeschlagene Anmeldungen"
          hinweis="in den letzten 100 Einträgen"
          ton={fehlversuche > 3 ? 'gelb' : 'gruen'}
        />
      </div>

      {!pruefung.unversehrt && pruefung.ersterFehler && (
        <div className="mb-6">
          <Fehler titel="Die Protokollkette ist nicht unversehrt">
            Erster Fehler beim Eintrag vom {datumZeit(pruefung.ersterFehler.zeitpunkt)}:{' '}
            {pruefung.ersterFehler.grund} Das ist dem Gremium und der oder dem
            Datenschutzbeauftragten unverzüglich zu melden.
          </Fehler>
        </div>
      )}

      <Karte titel="Letzte 100 Vorgänge">
        {eintraege.length === 0 ? (
          <Leer text="Es sind keine Einträge vorhanden." />
        ) : (
          <Tabelle kopf={['Zeitpunkt', 'Person', 'Aktion', 'Gegenstand', 'Einzelheiten']}>
            {eintraege.map((e) => {
              const a = AKTION[e.aktion] ?? { text: e.aktion, ton: 'neutral' as const };
              return (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-2 py-2 text-xs tabular-nums text-slate-600">
                    {datumZeit(e.zeitpunkt)}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700">{e.benutzerName ?? '–'}</td>
                  <td className="px-2 py-2">
                    <Marke ton={a.ton}>{a.text}</Marke>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-700">
                    {e.entitaet}
                    {e.entitaetId && <span className="block font-mono text-slate-400">{e.entitaetId.slice(0, 16)}</span>}
                  </td>
                  <td className="px-2 py-2 text-xs leading-relaxed text-slate-600">{e.details ?? '–'}</td>
                </tr>
              );
            })}
          </Tabelle>
        )}
      </Karte>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Rechtshinweis norm="Art. 5 Abs. 2, Art. 32 DSGVO">
          Das Protokoll dient dem Nachweis rechtmäßiger Verarbeitung und der Erkennung unbefugter
          Zugriffe. Es wird selbst nach dem Grundsatz der Speicherbegrenzung nur zwölf Monate
          vorgehalten; IP-Adressen werden ausschließlich pseudonymisiert gespeichert.
        </Rechtshinweis>
        <Rechtshinweis norm="§ 79 BetrVG">
          Das Protokoll ist zugleich der Nachweis, dass niemand außerhalb des Gremiums Einsicht
          genommen hat. Es sollte regelmäßig – etwa vierteljährlich – im Gremium ausgewertet und das
          Ergebnis in die Niederschrift aufgenommen werden. Die Rolle IT-Betrieb hat auf die
          Fachdaten keinerlei Zugriff; Zugriffe über die Datenbank hinweg wären nur mit dem separat
          verwahrten Dokumentenschlüssel verwertbar.
        </Rechtshinweis>
      </div>
    </>
  );
}
