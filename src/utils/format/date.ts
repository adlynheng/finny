/**
 * Dates as the app stores them — `YYYY-MM-DD` for a Postgres `date` column and
 * `YYYY-MM` as a month key — and the labels the design shows for them. All
 * parsing, arithmetic and formatting goes through date-fns; this module only
 * pins the string shapes. Strings are parsed to local midnight, never through
 * `new Date(string)`, which reads a bare date as UTC and can shift the day.
 */

import {
  endOfMonth,
  format,
  getDaysInMonth,
  getISODay,
  isValid,
  parse,
  startOfMonth,
} from 'date-fns';

/** `YYYY-MM`, the month a transaction list, calendar or budget is showing. */
export type MonthKey = string;

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_SHAPE = /^\d{4}-\d{2}$/;

type YearOption = { year?: boolean };

/** A `YYYY-MM-DD` string as local midnight. Throws on anything else, including 30 Feb. */
export function parseDate(value: string): Date {
  return strictParse(value, DATE_SHAPE, 'yyyy-MM-dd', 'YYYY-MM-DD');
}

/** A `YYYY-MM` key, or a `YYYY-MM-DD` date, as local midnight on the 1st of its month. */
export function parseMonth(value: string): Date {
  return MONTH_SHAPE.test(value)
    ? strictParse(value, MONTH_SHAPE, 'yyyy-MM', 'YYYY-MM')
    : startOfMonth(parseDate(value));
}

/** A `Date` as the `YYYY-MM-DD` string a `date` column takes. */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** `24 Sep` */
export function formatDayMonth(date: string): string {
  return format(parseDate(date), 'd MMM');
}

/** `Sep`, or `Sep 2026` with `{ year: true }`. Takes a month key or a date. */
export function formatMonthShort(
  value: string,
  { year = false }: YearOption = {},
): string {
  return format(parseMonth(value), year ? 'MMM yyyy' : 'MMM');
}

/** `September`, or `September 2026` with `{ year: true }`. Takes a month key or a date. */
export function formatMonthLong(
  value: string,
  { year = false }: YearOption = {},
): string {
  return format(parseMonth(value), year ? 'MMMM yyyy' : 'MMMM');
}

/** `Thu` */
export function formatWeekdayShort(date: string): string {
  return format(parseDate(date), 'EEE');
}

/** `Thu, 24 Sep 2026`, the date-picker button's label. */
export function formatFullDate(date: string): string {
  return format(parseDate(date), 'EEE, d MMM yyyy');
}

/** The month key of a `YYYY-MM-DD` string or a local `Date`. */
export function monthKey(value: string | Date): MonthKey {
  return format(
    typeof value === 'string' ? parseMonth(value) : value,
    'yyyy-MM',
  );
}

/** `2026-09-01` */
export function firstOfMonth(month: MonthKey): string {
  return toIsoDate(parseMonth(month));
}

/** `2026-09-30` */
export function lastOfMonth(month: MonthKey): string {
  return toIsoDate(endOfMonth(parseMonth(month)));
}

export function daysInMonth(month: MonthKey): number {
  return getDaysInMonth(parseMonth(month));
}

/**
 * How many tiles precede the 1st in a Monday-first week: 0 when the month
 * starts on a Monday, 6 when it starts on a Sunday. Every calendar grid in the
 * design places its first day with this.
 */
export function mondayOffset(month: MonthKey): number {
  return getISODay(parseMonth(month)) - 1;
}

/**
 * date-fns `parse` accepts one-digit months and days, so the shape is checked
 * first; `parse` then rejects dates that do not exist.
 */
function strictParse(
  value: string,
  shape: RegExp,
  pattern: string,
  expected: string,
): Date {
  const date = shape.test(value) ? parse(value, pattern, new Date(0)) : null;
  if (date === null || !isValid(date)) {
    throw new Error(`Expected a date as ${expected}, got "${value}"`);
  }
  return date;
}
