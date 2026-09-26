/**
 * The app's single notion of "now". Anything that compares against the current
 * date (recurrence, budget pace, goal ETA, "this month") must go through here,
 * never `new Date()` directly, so tests can pin the date.
 */

let frozen: Date | null = null;

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function now(): Date {
  return frozen ? new Date(frozen.getTime()) : new Date();
}

/** Today's local calendar date as `YYYY-MM-DD`, the format of Postgres `date` columns. */
export function today(): string {
  const d = now();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Test only. Pins `now()` to an instant, or to local midnight of a
 * `YYYY-MM-DD` date.
 */
export function freezeToday(at: Date | string): void {
  frozen =
    typeof at === 'string' ? parseCalendarDate(at) : new Date(at.getTime());
}

/** Test only. Returns `now()` to the real clock. */
export function resetToday(): void {
  frozen = null;
}

function parseCalendarDate(value: string): Date {
  const match = CALENDAR_DATE.exec(value);
  if (match) {
    const [year, month, day] = match.slice(1).map(Number) as [
      number,
      number,
      number,
    ];
    const date = new Date(year, month - 1, day);
    if (date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  }
  throw new Error(
    `freezeToday expects a real calendar date as YYYY-MM-DD, got "${value}"`,
  );
}
