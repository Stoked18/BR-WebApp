'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type Menuepunkt = { pfad: string; text: string };

export function Navigation({ gruppen }: { gruppen: Array<{ gruppe: string; punkte: Menuepunkt[] }> }) {
  const pfad = usePathname();

  return (
    <nav aria-label="Hauptnavigation" className="px-3 pb-4">
      {gruppen.map((g) => (
        <div key={g.gruppe} className="mb-4">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.gruppe}</p>
          <ul className="space-y-0.5">
            {g.punkte.map((p) => {
              const aktiv = pfad === p.pfad || (p.pfad !== '/' && pfad.startsWith(`${p.pfad}/`));
              return (
                <li key={p.pfad}>
                  <Link
                    href={p.pfad}
                    aria-current={aktiv ? 'page' : undefined}
                    className={`block rounded-md px-2 py-1.5 text-sm transition ${
                      aktiv ? 'bg-marke-50 font-medium text-marke-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.text}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
