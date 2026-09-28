/**
 * The app's single notion of "now". Anything that compares against the current
 * date (recurrence, budget pace, goal ETA, "this month") must go through here,
 * never `new Date()` directly, so tests can pin the date.
 */

import { parseDate, toIsoDate } from '@/utils/format/date';

let frozen: Date | null = null;

export function now(): Date {
  return frozen ? new Date(frozen.getTime()) : new Date();
}

/** Today's local calendar date as `YYYY-MM-DD`, the format of Postgres `date` columns. */
export function today(): string {
  return toIsoDate(now());
}

/**
 * Test only. Pins `now()` to an instant, or to local midnight of a
 * `YYYY-MM-DD` date.
 */
export function freezeToday(at: Date | string): void {
  frozen = typeof at === 'string' ? parseDate(at) : new Date(at.getTime());
}

/** Test only. Returns `now()` to the real clock. */
export function resetToday(): void {
  frozen = null;
}
