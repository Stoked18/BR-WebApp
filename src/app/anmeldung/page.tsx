import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { aktuellerBenutzer, melde_an } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function anmelden(formular: FormData) {
  'use server';
  const email = String(formular.get('email') ?? '');
  const passwort = String(formular.get('passwort') ?? '');
  const ergebnis = await melde_an(email, passwort);
  if (!ergebnis.erfolg) {
    redirect(`/anmeldung?fehler=${encodeURIComponent(ergebnis.fehler)}`);
  }
  // Die rollenabhaengige Weiterleitung liegt in src/app/page.tsx an einer
  // Stelle, damit Anmeldung und direkter Aufruf nicht auseinanderlaufen.
  redirect('/');
}

export default async function Anmeldung({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const benutzer = await aktuellerBenutzer();
  if (benutzer) redirect('/');
  // Frische Installation: erst einrichten, dann anmelden.
  if ((await prisma.benutzer.count()) === 0) redirect('/einrichtung');
  const betrieb = await prisma.betrieb.findFirst({ select: { name: true, ort: true } });
  const { fehler } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">BR-Cockpit</h1>
          <p className="mt-1 text-sm text-slate-600">
            {betrieb ? `Betriebsrat ${betrieb.name}, ${betrieb.ort}` : 'Betriebsratsverwaltung'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {fehler && (
            <p role="alert" className="mb-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {fehler}
            </p>
          )}

          <form action={anmelden} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Dienstliche E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-marke-600"
              />
            </div>
            <div>
              <label htmlFor="passwort" className="block text-sm font-medium text-slate-700">
                Passwort
              </label>
              <input
                id="passwort"
                name="passwort"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-marke-600"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-marke-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-marke-800"
            >
              Anmelden
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          Zugriffe auf dieses System werden protokolliert. Die Unterlagen des Betriebsrats unterliegen
          der Geheimhaltungspflicht nach § 79 BetrVG; eine Weitergabe an Dritte, auch innerhalb des
          Unternehmens, ist unzulässig.
        </p>
      </div>
    </main>
  );
}
