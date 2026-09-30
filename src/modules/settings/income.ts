import type { IncomeSourceRow, IncomeType } from '@/types/domain';
import { monthlyEquivalentCents, scheduleOf } from '@/utils/derive/recurrence';

export const INCOME_LABELS: Record<IncomeType, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  other: 'Others',
};

/**
 * A day of the month past a short month's end falls on its last day, so 31 is the last day of
 * every month: a salary's pay day when none is set.
 */
export const LAST_DAY = 31;
export const DEFAULT_PAYDAY = LAST_DAY;

/** A day of the month as it reads in a sentence: `25th`, `1st`, `last day`. */
export function dayOfMonthLabel(day: number): string {
  if (day >= LAST_DAY) {
    return 'last day';
  }
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th';
  return `${day}${suffix}`;
}

/** Whole days 1–31 from a text field; anything else is null. */
export function parseDayOfMonth(text: string): number | null {
  const n = Number(text);
  return text !== '' && Number.isInteger(n) && n >= 1 && n <= LAST_DAY
    ? n
    : null;
}

/** A rate as the drawer and rows show it: 0.2 is `20%`. */
export const ratePercent = (rate: number) => `${+(rate * 100).toFixed(2)}%`;

/** A stream's per-month equivalent, zero for a frequency the app does not know. */
export function perMonthCents(source: IncomeSourceRow): number {
  const schedule = scheduleOf(source);
  return schedule
    ? monthlyEquivalentCents(source.base_income_cents, schedule)
    : 0;
}
