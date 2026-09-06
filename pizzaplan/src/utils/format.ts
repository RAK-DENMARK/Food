/**
 * Dansk formatering.
 *
 * Der bruges bevidst ikke Intl, så output er identisk i tests, på iOS og på
 * Android uanset hvilken ICU-udgave værten har med.
 *
 * Al afrunding sker HER – domænelaget regner med fuld præcision.
 */

import { calendarDaysBetween, isSameLocalDay } from './time';

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS_SHORT = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Tal med dansk decimalkomma. */
export function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

/** Mel, vand og andre store mængder: hele gram. */
export function formatGrams(grams: number): string {
  return `${Math.round(grams)} g`;
}

/** Salt: hele gram fra 10 g og op, ellers én decimal. */
export function formatSalt(grams: number): string {
  return grams >= 10 ? `${Math.round(grams)} g` : `${formatNumber(grams, 1)} g`;
}

/**
 * Gær: aldrig 0 g. Små mængder vises med to decimaler, så brugeren kan se,
 * at der faktisk skal en lille smule i.
 */
export function formatYeast(grams: number): string {
  if (grams >= 10) return `${formatNumber(grams, 1)} g`;
  if (grams >= 1) return `${formatNumber(grams, 2)} g`;
  const rounded = Math.max(Math.round(grams * 100) / 100, 0.01);
  return `${formatNumber(rounded, 2)} g`;
}

/** Bagerprocent til visning, fx "0,12 %". */
export function formatPercent(fraction: number, decimals = 2): string {
  return `${formatNumber(fraction * 100, decimals)} %`;
}

/** Klokkeslæt i lokal tid, fx "18:30". */
export function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Dag i lokal tid relativt til referencetidspunktet:
 * "I dag", "I morgen", "Lørdag" eller "lør. 12. sep." længere ude i fremtiden.
 */
export function formatDay(date: Date, reference: Date = new Date()): string {
  const days = calendarDaysBetween(reference, date);
  if (isSameLocalDay(date, reference)) return 'I dag';
  if (days === 1) return 'I morgen';
  if (days === 2) return 'I overmorgen';
  if (days > 2 && days < 7) return capitalize(WEEKDAYS[date.getDay()]);
  return `${capitalize(WEEKDAYS[date.getDay()].slice(0, 3))}. ${date.getDate()}. ${MONTHS_SHORT[date.getMonth()]}`;
}

/** Dag og klokkeslæt, fx "Lørdag 18:00". */
export function formatDayTime(date: Date, reference: Date = new Date()): string {
  return `${formatDay(date, reference)} ${formatTime(date)}`;
}

/** Varighed som naturligt dansk, fx "45 min.", "2 timer" eller "3 timer og 30 min.". */
export function formatDurationHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} min.`;

  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = wholeHours === 1 ? '1 time' : `${wholeHours} timer`;
  return minutes === 0 ? hourText : `${hourText} og ${minutes} min.`;
}

/** Temperatur, fx "22 °C". */
export function formatTemp(tempC: number): string {
  return `${Math.round(tempC)} °C`;
}
