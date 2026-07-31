import { redirect } from 'next/navigation';
import Link from 'next/link';
import { aktuellerBenutzer, melde_ab } from '@/lib/auth';
import { ROLLENBEZEICHNUNG, darf, istArbeitgeberseite, type Recht } from '@/lib/authz';
import { Navigation, type Menuepunkt } from '@/components/navigation';

export const dynamic = 'force-dynamic';

const MENUE: Array<{ gruppe: string; punkte: Array<Menuepunkt & { recht?: Recht }> }> = [
  {
    gruppe: 'Gremium',
    punkte: [
      { pfad: '/uebersicht', text: 'Übersicht', recht: 'gremium.lesen' },
      { pfad: '/gremium', text: 'Mitglieder und Rollen', recht: 'gremium.lesen' },
      { pfad: '/ausschuesse', text: 'Ausschüsse', recht: 'gremium.lesen' },
    ],
  },
  {
    gruppe: 'Sitzungsbetrieb',
    punkte: [
      { pfad: '/sitzungen', text: 'Sitzungen', recht: 'sitzung.lesen' },
      { pfad: '/beschluesse', text: 'Beschlussregister', recht: 'beschluss.lesen' },
      { pfad: '/aufgaben', text: 'Aufgaben', recht: 'aufgabe.lesen' },
    ],
  },
  {
    gruppe: 'Mitbestimmung',
    punkte: [
      { pfad: '/vorgaenge', text: 'Vorgänge und Fristen', recht: 'vorgang.lesen' },
      { pfad: '/vereinbarungen', text: 'Betriebsvereinbarungen', recht: 'bv.lesen' },
      { pfad: '/schulungen', text: 'Schulungen', recht: 'schulung.lesen' },
      { pfad: '/aufsichtsrat', text: 'Aufsichtsrat', recht: 'gremium.lesen' },
    ],
  },
  {
    gruppe: 'Werkzeuge',
    punkte: [
      { pfad: '/fristenrechner', text: 'Fristenrechner', recht: 'gremium.lesen' },
      { pfad: '/compliance', text: 'Rechtsprüfung', recht: 'gremium.lesen' },
    ],
  },
  {
    gruppe: 'Datenschutz',
    punkte: [
      { pfad: '/datenschutz', text: 'Verarbeitung und Löschung', recht: 'datenschutz.lesen' },
      { pfad: '/protokoll', text: 'Zugriffsprotokoll', recht: 'audit.lesen' },
    ],
  },
  {
    gruppe: 'Betrieb',
    punkte: [{ pfad: '/system', text: 'Systemzustand', recht: 'system.verwalten' }],
  },
];

const MENUE_ARBEITGEBER: Array<{ gruppe: string; punkte: Menuepunkt[] }> = [
  {
    gruppe: 'Antragsportal',
    punkte: [
      { pfad: '/portal', text: 'Meine Anträge' },
      { pfad: '/portal/neu', text: 'Neuen Antrag stellen' },
    ],
  },
];

async function abmelden() {
  'use server';
  await melde_ab();
  redirect('/anmeldung');
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) redirect('/anmeldung');

  const arbeitgeberseite = istArbeitgeberseite(benutzer);
  const menue = arbeitgeberseite
    ? MENUE_ARBEITGEBER
    : MENUE.map((g) => ({
        gruppe: g.gruppe,
        punkte: g.punkte.filter((p) => !p.recht || darf(benutzer, p.recht)),
      })).filter((g) => g.punkte.length > 0);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="kein-druck border-b border-slate-200 bg-white lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="px-5 py-4">
          <Link href="/" className="block">
            <p className="text-base font-semibold text-slate-900">BR-Cockpit</p>
            <p className="text-xs text-slate-500">Werk Solingen</p>
          </Link>
        </div>
        <Navigation gruppen={menue} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="kein-druck flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{benutzer.anzeigename}</p>
            <p className="truncate text-xs text-slate-500">
              {benutzer.rollen.map((r) => ROLLENBEZEICHNUNG[r]).join(' · ')}
            </p>
          </div>
          <form action={abmelden}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Abmelden
            </button>
          </form>
        </header>

        {arbeitgeberseite && (
          <p className="kein-druck border-b border-sky-200 bg-sky-50 px-6 py-2 text-xs text-sky-900">
            Sie sind als Vertretung der Arbeitgeberseite angemeldet. Sichtbar sind ausschließlich die von
            Ihnen eingereichten Anträge und die dazu ergangene Antwort des Betriebsrats. Interne
            Beratungen und Abstimmungen des Gremiums sind nach §§ 78, 79 BetrVG nicht einsehbar.
          </p>
        )}

        <main className="flex-1 px-6 py-6">{children}</main>

        <footer className="kein-druck border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
          BR-Cockpit · quelloffen unter AGPL-3.0 · betrieben im eigenen Rechenzentrum ·
          Verantwortlich für die Verarbeitung ist nach § 79a S. 2 BetrVG der Arbeitgeber; die
          Nutzungshoheit liegt beim Betriebsrat.
        </footer>
      </div>
    </div>
  );
}
