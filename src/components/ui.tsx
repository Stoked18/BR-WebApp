import type { ReactNode } from 'react';
import Link from 'next/link';

export function Karte({
  titel,
  hinweis,
  aktion,
  children,
  klasse = '',
}: {
  titel?: string;
  hinweis?: string;
  aktion?: ReactNode;
  children: ReactNode;
  klasse?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${klasse}`}>
      {(titel || aktion) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <div>
            {titel && <h2 className="text-sm font-semibold text-slate-900">{titel}</h2>}
            {hinweis && <p className="mt-0.5 text-xs text-slate-500">{hinweis}</p>}
          </div>
          {aktion && <div className="shrink-0">{aktion}</div>}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

type Ton = 'neutral' | 'gruen' | 'gelb' | 'rot' | 'blau' | 'violett';

const TOENE: Record<Ton, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  gruen: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  gelb: 'bg-amber-50 text-amber-800 ring-amber-200',
  rot: 'bg-rose-50 text-rose-800 ring-rose-200',
  blau: 'bg-sky-50 text-sky-800 ring-sky-200',
  violett: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function Marke({ ton = 'neutral', children }: { ton?: Ton; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TOENE[ton]}`}
    >
      {children}
    </span>
  );
}

export function Kennzahl({
  wert,
  bezeichnung,
  hinweis,
  ton = 'neutral',
  href,
}: {
  wert: ReactNode;
  bezeichnung: string;
  hinweis?: string;
  ton?: Ton;
  href?: string;
}) {
  const rahmen: Record<Ton, string> = {
    neutral: 'border-slate-200',
    gruen: 'border-emerald-300',
    gelb: 'border-amber-300',
    rot: 'border-rose-300',
    blau: 'border-sky-300',
    violett: 'border-violet-300',
  };
  const inhalt = (
    <div className={`h-full rounded-lg border-l-4 bg-white p-4 shadow-sm ${rahmen[ton]} border-y border-r border-y-slate-200 border-r-slate-200`}>
      <div className="text-2xl font-semibold tabular-nums text-slate-900">{wert}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{bezeichnung}</div>
      {hinweis && <div className="mt-1 text-xs leading-snug text-slate-500">{hinweis}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-md">
      {inhalt}
    </Link>
  ) : (
    inhalt
  );
}

/** Hinweis mit Bezug auf eine Rechtsnorm. */
export function Rechtshinweis({ norm, children }: { norm: string; children: ReactNode }) {
  return (
    <aside className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
      <span className="font-semibold text-slate-800">{norm}</span>
      <span className="mx-1.5 text-slate-400">·</span>
      {children}
    </aside>
  );
}

export function Warnung({ titel, children }: { titel: string; children?: ReactNode }) {
  return (
    <aside className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">{titel}</p>
      {children && <div className="mt-1 text-xs leading-relaxed">{children}</div>}
    </aside>
  );
}

export function Fehler({ titel, children }: { titel: string; children?: ReactNode }) {
  return (
    <aside className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <p className="font-semibold">{titel}</p>
      {children && <div className="mt-1 text-xs leading-relaxed">{children}</div>}
    </aside>
  );
}

export function Leer({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-500">{text}</p>;
}

export function Tabelle({ kopf, children }: { kopf: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {kopf.map((k) => (
              <th key={k} scope="col" className="px-2 py-2 font-medium">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Knopf({
  children,
  variante = 'primaer',
  typ = 'submit',
  name,
  wert,
  klasse = '',
}: {
  children: ReactNode;
  variante?: 'primaer' | 'sekundaer' | 'gefahr';
  typ?: 'submit' | 'button';
  name?: string;
  wert?: string;
  klasse?: string;
}) {
  const stile = {
    primaer: 'bg-marke-700 text-white hover:bg-marke-800',
    sekundaer: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    gefahr: 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50',
  };
  return (
    <button
      type={typ}
      name={name}
      value={wert}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${stile[variante]} ${klasse}`}
    >
      {children}
    </button>
  );
}

export function Seitenkopf({
  titel,
  beschreibung,
  aktion,
}: {
  titel: string;
  beschreibung?: string;
  aktion?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{titel}</h1>
        {beschreibung && <p className="mt-1 max-w-3xl text-sm text-slate-600">{beschreibung}</p>}
      </div>
      {aktion}
    </div>
  );
}
