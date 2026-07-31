import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { pruefeKonfiguration } from '@/lib/krypto';
import { datumZeit } from '@/lib/format';
import { Karte, Kennzahl, Marke, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * Betriebssicht fuer die IT.
 *
 * Bewusst ohne jeden Fachinhalt: hier stehen nur technische Kennzahlen. Wer
 * die Maschinen betreibt, muss deren Zustand sehen koennen, ohne Einblick in
 * Sitzungen, Beschluesse oder personenbezogene Vorgaenge zu erhalten
 * (§§ 78, 79 BetrVG).
 */
export default async function System() {
  await verlangeRecht('system.verwalten');

  const [benutzerAktiv, benutzerGesperrt, tokens, auditAnzahl, letzterEintrag] = await Promise.all([
    prisma.benutzer.count({ where: { aktiv: true } }),
    prisma.benutzer.count({ where: { gesperrtBis: { gt: new Date() } } }),
    prisma.sitzungstoken.count({ where: { widerrufen: false, laeuftAbAm: { gt: new Date() } } }),
    prisma.auditEintrag.count(),
    prisma.auditEintrag.findFirst({ orderBy: { zeitpunkt: 'desc' }, select: { zeitpunkt: true } }),
  ]);

  const maengel = pruefeKonfiguration();

  return (
    <>
      <Seitenkopf
        titel="Systemzustand"
        beschreibung="Technische Kennzahlen für den Betrieb der Anwendung. Fachliche Inhalte des Betriebsrats sind auf dieser Rolle nicht zugänglich."
      />

      {maengel.length > 0 && (
        <div className="mb-6">
          <Warnung titel="Konfiguration unvollständig">
            <ul className="list-disc pl-4">
              {maengel.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Warnung>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl wert={benutzerAktiv} bezeichnung="Aktive Konten" />
        <Kennzahl wert={benutzerGesperrt} bezeichnung="Gesperrte Konten" ton={benutzerGesperrt ? 'gelb' : 'gruen'} />
        <Kennzahl wert={tokens} bezeichnung="Offene Sitzungen" />
        <Kennzahl wert={auditAnzahl} bezeichnung="Protokolleinträge" />
      </div>

      <Karte titel="Zustand">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Letzter Protokolleintrag</dt>
            <dd className="text-slate-800">{datumZeit(letzterEintrag?.zeitpunkt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Dokumentenverschlüsselung</dt>
            <dd>
              <Marke ton={process.env.DOKUMENT_SCHLUESSEL ? 'gruen' : 'rot'}>
                {process.env.DOKUMENT_SCHLUESSEL ? 'Schlüssel geladen' : 'Schlüssel fehlt'}
              </Marke>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Betriebsart</dt>
            <dd className="text-slate-800">{process.env.NODE_ENV}</dd>
          </div>
        </dl>
      </Karte>

      <div className="mt-6">
        <Rechtshinweis norm="§ 79a BetrVG">
          Der Arbeitgeber ist datenschutzrechtlich Verantwortlicher, auch soweit der Betriebsrat
          Daten verarbeitet. Ein Zugriffsrecht auf die Inhalte folgt daraus nicht. Für Wartung und
          Sicherung ist deshalb kein fachlicher Zugriff vorgesehen; Datenbank- und Dateisicherungen
          enthalten Dokumente ausschließlich verschlüsselt, der Schlüssel wird außerhalb der
          Sicherung beim Betriebsrat verwahrt.
        </Rechtshinweis>
      </div>
    </>
  );
}
