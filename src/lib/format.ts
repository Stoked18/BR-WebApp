/** Einheitliche Darstellung von Datum, Zeit und Zahlen in deutscher Schreibweise. */

const ZONE = 'Europe/Berlin';

export function datum(d: Date | string | null | undefined): string {
  if (!d) return '–';
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));
}

export function datumLang(d: Date | string | null | undefined): string {
  if (!d) return '–';
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(d));
}

export function datumZeit(d: Date | string | null | undefined): string {
  if (!d) return '–';
  return `${new Intl.DateTimeFormat('de-DE', {
    timeZone: ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))} Uhr`;
}

export function uhrzeit(d: Date | string | null | undefined): string {
  if (!d) return '–';
  return `${new Intl.DateTimeFormat('de-DE', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d))} Uhr`;
}

/** Nimmt auch Prisma-Decimal entgegen, das nur toString sicher beherrscht. */
export function euro(betrag: number | string | { toString(): string } | null | undefined): string {
  if (betrag === null || betrag === undefined) return '–';
  const zahl = typeof betrag === 'number' ? betrag : Number(betrag.toString());
  if (Number.isNaN(zahl)) return '–';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(zahl);
}

/** Wandelt SCHREIENDE_KONSTANTEN in lesbaren Text. */
export function lesbar(wert: string | null | undefined): string {
  if (!wert) return '–';
  return wert
    .toLowerCase()
    .split('_')
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');
}

/** Relative Angabe wie "in 3 Tagen" oder "vor 2 Tagen". */
export function relativeTage(tage: number): string {
  if (tage === 0) return 'heute';
  if (tage === 1) return 'morgen';
  if (tage === -1) return 'gestern';
  if (tage > 0) return `in ${tage} Tagen`;
  return `vor ${Math.abs(tage)} Tagen`;
}
