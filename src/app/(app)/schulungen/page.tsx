import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { schulungskontingentTage } from '@/lib/betrvg';
import { datum, euro } from '@/lib/format';
import { Karte, Kennzahl, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle } from '@/components/ui';

export const dynamic = 'force-dynamic';

const GRUNDLAGE: Record<string, { text: string; norm: string; ton: 'gruen' | 'blau' | 'violett' }> = {
  ERFORDERLICH_37_6: { text: 'erforderlich', norm: '§ 37 Abs. 6 BetrVG', ton: 'gruen' },
  GEEIGNET_37_7: { text: 'geeignet', norm: '§ 37 Abs. 7 BetrVG', ton: 'blau' },
  SBV_179_SGB_IX: { text: 'SBV', norm: '§ 179 Abs. 4 SGB IX', ton: 'violett' },
  JAV_65_BETRVG: { text: 'JAV', norm: '§ 65 Abs. 1 BetrVG', ton: 'violett' },
};

const STATUSTEXT: Record<string, string> = {
  GEPLANT: 'geplant',
  BESCHLOSSEN: 'beschlossen',
  AG_INFORMIERT: 'Arbeitgeber informiert',
  BESTAETIGT: 'bestätigt',
  ABGELEHNT: 'abgelehnt',
  DURCHGEFUEHRT: 'durchgeführt',
  STORNIERT: 'storniert',
};

export default async function Schulungen() {
  await verlangeRecht('schulung.lesen');

  const amtsperiode = await prisma.amtsperiode.findFirst({ where: { aktiv: true } });
  const schulungen = await prisma.schulung.findMany({
    where: amtsperiode ? { amtsperiodeId: amtsperiode.id } : undefined,
    include: { person: true },
    orderBy: { beginn: 'desc' },
  });

  // Kontingent nach § 37 Abs. 7 BetrVG je Person – nur "geeignete" Schulungen
  // werden angerechnet, erforderliche nach Abs. 6 nicht.
  const kontingent = new Map<string, { name: string; verbraucht: number; grenze: number }>();
  for (const s of schulungen) {
    const schluessel = s.personId;
    const eintrag = kontingent.get(schluessel) ?? {
      name: `${s.person.vorname} ${s.person.nachname}`,
      verbraucht: 0,
      // Erstmandat ist in den Stammdaten nicht erfasst; es wird der Regelwert
      // von drei Wochen angesetzt. Bei Erstmandat sind es vier Wochen.
      grenze: schulungskontingentTage(false),
    };
    if (s.grundlage === 'GEEIGNET_37_7' && s.status !== 'STORNIERT' && s.status !== 'ABGELEHNT') {
      eintrag.verbraucht += s.tage;
    }
    kontingent.set(schluessel, eintrag);
  }

  const gesamtkosten = schulungen
    .filter((s) => s.status !== 'STORNIERT' && s.status !== 'ABGELEHNT')
    .reduce((summe, s) => summe + Number(s.kostenEuro ?? 0), 0);

  const offeneMeldung = schulungen.filter((s) => s.status === 'BESCHLOSSEN' && !s.agMitgeteiltAm);

  return (
    <>
      <Seitenkopf
        titel="Schulungen"
        beschreibung={`${amtsperiode?.bezeichnung ?? 'laufende Amtsperiode'} · Erforderliche Schulungen nach § 37 Abs. 6 BetrVG sind vom Arbeitgeber zu tragen und werden nicht auf das Kontingent angerechnet.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kennzahl wert={schulungen.length} bezeichnung="Schulungen in der Amtsperiode" />
        <Kennzahl wert={euro(gesamtkosten)} bezeichnung="Kosten (§ 40 Abs. 1 BetrVG)" ton="blau" />
        <Kennzahl
          wert={offeneMeldung.length}
          bezeichnung="Mitteilung an Arbeitgeber offen"
          hinweis="§ 37 Abs. 6 S. 4 BetrVG"
          ton={offeneMeldung.length ? 'gelb' : 'gruen'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Karte titel="Übersicht">
            {schulungen.length === 0 ? (
              <Leer text="Es sind keine Schulungen erfasst." />
            ) : (
              <Tabelle kopf={['Teilnahme', 'Thema', 'Termin', 'Tage', 'Grundlage', 'Status']}>
                {schulungen.map((s) => {
                  const g = GRUNDLAGE[s.grundlage] ?? { text: s.grundlage, norm: '', ton: 'blau' as const };
                  return (
                    <tr key={s.id}>
                      <td className="px-2 py-2 text-slate-900">
                        {s.person.vorname} {s.person.nachname}
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-slate-800">{s.titel}</span>
                        <span className="block text-xs text-slate-500">
                          {s.anbieter}
                          {s.ort && ` · ${s.ort}`}
                          {s.kostenEuro && ` · ${euro(s.kostenEuro)}`}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-600">
                        {datum(s.beginn)} – {datum(s.ende)}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-slate-700">{s.tage}</td>
                      <td className="px-2 py-2">
                        <Marke ton={g.ton}>{g.text}</Marke>
                        <span className="mt-0.5 block text-xs text-slate-400">{g.norm}</span>
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-600">{STATUSTEXT[s.status] ?? s.status}</td>
                    </tr>
                  );
                })}
              </Tabelle>
            )}
          </Karte>
        </div>

        <div className="space-y-6">
          <Karte titel="Kontingent nach § 37 Abs. 7 BetrVG" hinweis="Nur geeignete Schulungen zählen">
            {kontingent.size === 0 ? (
              <Leer text="Keine Daten." />
            ) : (
              <ul className="space-y-3">
                {[...kontingent.values()]
                  .filter((k) => k.verbraucht > 0)
                  .map((k) => (
                    <li key={k.name}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-slate-800">{k.name}</span>
                        <span className="tabular-nums text-slate-600">
                          {k.verbraucht} / {k.grenze} Tage
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full ${k.verbraucht > k.grenze ? 'bg-rose-500' : 'bg-marke-600'}`}
                          style={{ width: `${Math.min(100, (k.verbraucht / k.grenze) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                {[...kontingent.values()].every((k) => k.verbraucht === 0) && (
                  <p className="text-sm text-slate-500">
                    Bisher wurden nur erforderliche Schulungen nach § 37 Abs. 6 BetrVG besucht. Diese
                    werden auf das Kontingent nicht angerechnet.
                  </p>
                )}
              </ul>
            )}
          </Karte>

          <Rechtshinweis norm="§ 37 Abs. 6 BetrVG">
            Erforderlich ist eine Schulung, wenn sie Kenntnisse vermittelt, die der Betriebsrat für
            seine konkrete Arbeit im Betrieb benötigt. Für ein Gremium, das gerade über ein
            Produktionsdatensystem verhandelt, ist eine Schulung zu § 87 Abs. 1 Nr. 6 BetrVG damit
            regelmäßig erforderlich. Der Beschluss sollte den betrieblichen Anlass benennen – das
            erleichtert die Kostentragung nach § 40 Abs. 1 BetrVG erheblich.
          </Rechtshinweis>

          <Rechtshinweis norm="§ 37 Abs. 6 S. 3, 4 BetrVG">
            Bei der Festlegung der Zeit sind die betrieblichen Notwendigkeiten zu berücksichtigen; der
            Arbeitgeber ist rechtzeitig zu unterrichten. Hält er die Belange des Betriebs für nicht
            hinreichend berücksichtigt, kann er die Einigungsstelle anrufen.
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
