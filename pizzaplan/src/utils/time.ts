/**
 * Tidshjælpere.
 *
 * PizzaPlan regner i absolutte tidspunkter (Date) og viser altid lokal tid.
 * Der bruges bevidst ingen UTC-logik i UI'et.
 *
 * Sommer-/vintertid: Vi lægger timer til i faktisk forløbet tid, fordi det er
 * den forløbne tid, dejen hæver i – ikke urets visning. En plan hen over et
 * tidsskifte får derfor korrekte vægurstidspunkter, mens hævetiden i timer
 * forbliver den samme.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

export function subtractHours(date: Date, hours: number): Date {
  return addHours(date, -hours);
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_HOUR;
}

/** Sand hvis de to tidspunkter falder på samme lokale kalenderdag. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Antal hele lokale kalenderdage mellem to tidspunkter (kan være negativt). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / (24 * MS_PER_HOUR));
}
