/**
 * Date display and month arithmetic over the strings Postgres hands back:
 * `YYYY-MM-DD` for a `date` column and `YYYY-MM` as a month key. Parsed by
 * hand, never through `new Date(string)`, so a label cannot shift a day with
 * the time zone.
 */

/** `YYYY-MM`, the month a transaction list, calendar or budget is showing. */
export type MonthKey = string;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const DATE_OR_MONTH = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

type YearOption = { year?: boolean };

/** `24 Sep` */
export function formatDayMonth(date: string): string {
  const { day, month } = parseDate(date);
  return `${day} ${shortMonth(month)}`;
}

/** `Sep`, or `Sep 2026` with `{ year: true }`. Takes a month key or a date. */
export function formatMonthShort(
  value: string,
  { year = false }: YearOption = {},
): string {
  const parts = parse(value);
  return withYear(shortMonth(parts.month), parts.year, year);
}

/** `September`, or `September 2026` with `{ year: true }`. Takes a month key or a date. */
export function formatMonthLong(
  value: string,
  { year = false }: YearOption = {},
): string {
  const parts = parse(value);
  return withYear(MONTHS[parts.month - 1]!, parts.year, year);
}

/** `Thu` */
export function formatWeekdayShort(date: string): string {
  return WEEKDAYS[weekday(parseDate(date))]!;
}

/** `Thu, 24 Sep 2026`, the date-picker button's label. */
export function formatFullDate(date: string): string {
  const parts = parseDate(date);
  return `${WEEKDAYS[weekday(parts)]}, ${parts.day} ${shortMonth(parts.month)} ${parts.year}`;
}

/** The month key of a `YYYY-MM-DD` string or a local `Date`. */
export function monthKey(value: string | Date): MonthKey {
  if (typeof value === 'string') {
    const { year, month } = parse(value);
    return key(year, month);
  }
  return key(value.getFullYear(), value.getMonth() + 1);
}

/** `2026-09-01` */
export function firstOfMonth(month: MonthKey): string {
  const parts = parse(month);
  return `${key(parts.year, parts.month)}-01`;
}

/** `2026-09-30` */
export function lastOfMonth(month: MonthKey): string {
  const parts = parse(month);
  return `${key(parts.year, parts.month)}-${daysInMonth(month)}`;
}

export function daysInMonth(month: MonthKey): number {
  const { year, month: m } = parse(month);
  return new Date(year, m, 0).getDate();
}

/**
 * How many tiles precede the 1st in a Monday-first week: 0 when the month
 * starts on a Monday, 6 when it starts on a Sunday. Every calendar grid in the
 * design places its first day with this.
 */
export function mondayOffset(month: MonthKey): number {
  const { year, month: m } = parse(month);
  return (weekday({ year, month: m, day: 1 }) + 6) % 7;
}

type Parts = { year: number; month: number; day: number | null };

function parse(value: string): Parts {
  const match = DATE_OR_MONTH.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = match[3] === undefined ? null : Number(match[3]);
    const probe = new Date(year, month - 1, day ?? 1);
    if (probe.getMonth() === month - 1 && probe.getDate() === (day ?? 1)) {
      return { year, month, day };
    }
  }
  throw new Error(`Expected a date as YYYY-MM-DD or YYYY-MM, got "${value}"`);
}

function parseDate(value: string): Parts & { day: number } {
  const parts = parse(value);
  if (parts.day === null) {
    throw new Error(`Expected a date as YYYY-MM-DD, got "${value}"`);
  }
  return { ...parts, day: parts.day };
}

function weekday({ year, month, day }: Parts): number {
  return new Date(year, month - 1, day ?? 1).getDay();
}

function shortMonth(month: number): string {
  return MONTHS[month - 1]!.slice(0, 3);
}

function withYear(label: string, year: number, show: boolean): string {
  return show ? `${label} ${year}` : label;
}

function key(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, '0')}`;
}
