import { Fehler } from './ui';

/**
 * Rueckmeldung nach einer Formularaktion.
 *
 * Der Text kommt aus der Adresszeile, weil die Aktionen nach dem Speichern
 * umleiten (PRG-Muster) – so loest ein Neuladen die Aktion nicht erneut aus.
 * Deshalb gehoert in diese Texte nie etwas Vertrauliches: die Adresszeile
 * steht im Browserverlauf und moeglicherweise im Zugriffsprotokoll eines
 * vorgelagerten Servers.
 */
export function Rueckmeldung({ ok, fehler }: { ok?: string; fehler?: string }) {
  if (!ok && !fehler) return null;
  return (
    <div className="mb-6" role="status" aria-live="polite">
      {fehler ? (
        <Fehler titel="Nicht gespeichert">{fehler}</Fehler>
      ) : (
        <aside className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {ok}
        </aside>
      )}
    </div>
  );
}
