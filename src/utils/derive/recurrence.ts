/**
 * Schedules for recurring charges and income sources. `start_date` is an
 * anchor, not a floor: the schedule runs both ways from it, as the design's
 * calendar does, and only `end_date` cuts it off.
 *
 * Month-based steps clamp to the month end instead of rolling over (date-fns
 * `addMonths` does this: 31 Jan + 1 month is 28 Feb, not 3 Mar), and every
 * occurrence is stepped from the anchor rather than from the one before, so a
 * charge on the 31st lands on 28 Feb and is back on the 31st in March.
 */

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  getDate,
} from 'date-fns';

import {
  CUSTOM_UNITS,
  FREQUENCIES,
  isOneOf,
  type Frequency,
} from '@/types/domain';
import {
  firstOfMonth,
  lastOfMonth,
  parseDate,
  toIsoDate,
  type MonthKey,
} from '@/utils/format/date';
import { today } from '@/lib/today';

export type Schedule = {
  frequency: Frequency;
  custom_every: number | null;
  custom_unit: string | null;
  start_date: string;
  /** Income sources have no end date. */
  end_date?: string | null;
};

/**
 * A charge's or income source's schedule, or null for a frequency the app
 * does not know.
 */
export function scheduleOf(
  row: Omit<Schedule, 'frequency'> & { frequency: string },
): Schedule | null {
  return isOneOf(FREQUENCIES, row.frequency)
    ? { ...row, frequency: row.frequency }
    : null;
}

type Interval = { unit: 'days' | 'months'; size: number };

/** Search guard: no schedule needs more steps than this to cross one month. */
const MAX_STEPS = 1_000;

/** `date` moved by `n` intervals of the schedule, forwards or backwards. */
export function stepDate(date: string, schedule: Schedule, n: number): string {
  const { unit, size } = interval(schedule);
  const step = unit === 'days' ? addDays : addMonths;
  return toIsoDate(step(parseDate(date), size * n));
}

/** The days of `month` (1–31) the schedule falls on, in order. */
export function occurrencesInMonth(
  schedule: Schedule,
  month: MonthKey,
): number[] {
  const first = firstOfMonth(month);
  const last = lastOfMonth(month);
  const days: number[] = [];
  let k = firstIndexOnOrAfter(schedule, first);
  for (let guard = 0; guard < MAX_STEPS; guard++, k++) {
    const date = occurrence(schedule, k);
    if (date > last || isAfterEnd(schedule, date)) {
      break;
    }
    days.push(getDate(parseDate(date)));
  }
  return days;
}

/** The first occurrence on or after `from` (default today), or null once the schedule has ended. */
export function nextDue(
  schedule: Schedule,
  from: string = today(),
): string | null {
  const date = occurrence(schedule, firstIndexOnOrAfter(schedule, from));
  return isAfterEnd(schedule, date) ? null : date;
}

/**
 * The amount as a per-month figure, using the design's formulas exactly:
 * weekly × 52 / 12, custom days × 365 / 12 / every, custom weeks × 52 / 12 / every.
 * Unrounded, so totals are summed before the formatter rounds them.
 */
export function monthlyEquivalentCents(
  cents: number,
  schedule: Schedule,
): number {
  switch (schedule.frequency) {
    case 'weekly':
      return (cents * 52) / 12;
    case 'monthly':
      return cents;
    case 'quarterly':
      return cents / 3;
    case 'yearly':
      return cents / 12;
    case 'custom': {
      const { every, unit } = custom(schedule);
      if (unit === 'days') {
        return (cents * 365) / 12 / every;
      }
      return unit === 'weeks' ? (cents * 52) / 12 / every : cents / every;
    }
  }
}

/** `Monthly`, `Every 2 weeks`, `Every 1 month`. */
export function intervalLabel(schedule: Schedule): string {
  if (schedule.frequency !== 'custom') {
    return capitalise(schedule.frequency);
  }
  const { every, unit } = custom(schedule);
  return `Every ${every} ${every === 1 ? unit.slice(0, -1) : unit}`;
}

/** `per quarter`, `per 2 weeks`, and `per month` for a custom every-1-month. */
export function periodSuffix(schedule: Schedule): string {
  const nouns = {
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
  };
  if (schedule.frequency !== 'custom') {
    return `per ${nouns[schedule.frequency]}`;
  }
  const { every, unit } = custom(schedule);
  return every === 1 ? `per ${unit.slice(0, -1)}` : `per ${every} ${unit}`;
}

function occurrence(schedule: Schedule, k: number): string {
  return stepDate(schedule.start_date, schedule, k);
}

/**
 * The design's walk: back from the anchor until before `date`, then forward to
 * the first occurrence on or after it. The walk starts from an estimate of the
 * right index so a schedule years from its anchor is not stepped one by one.
 */
function firstIndexOnOrAfter(schedule: Schedule, date: string): number {
  const { unit, size } = interval(schedule);
  const approxDays = unit === 'days' ? size : size * 30.44;
  let k = Math.floor(
    differenceInCalendarDays(parseDate(date), parseDate(schedule.start_date)) /
      approxDays,
  );
  for (let guard = 0; occurrence(schedule, k) >= date; guard++, k--) {
    if (guard === MAX_STEPS) {
      throw new Error('Recurrence search did not converge.');
    }
  }
  for (let guard = 0; occurrence(schedule, k) < date; guard++, k++) {
    if (guard === MAX_STEPS) {
      throw new Error('Recurrence search did not converge.');
    }
  }
  return k;
}

function isAfterEnd(schedule: Schedule, date: string): boolean {
  return schedule.end_date != null && date > schedule.end_date;
}

function interval(schedule: Schedule): Interval {
  switch (schedule.frequency) {
    case 'weekly':
      return { unit: 'days', size: 7 };
    case 'monthly':
      return { unit: 'months', size: 1 };
    case 'quarterly':
      return { unit: 'months', size: 3 };
    case 'yearly':
      return { unit: 'months', size: 12 };
    case 'custom': {
      const { every, unit } = custom(schedule);
      if (unit === 'months') {
        return { unit: 'months', size: every };
      }
      return { unit: 'days', size: unit === 'weeks' ? every * 7 : every };
    }
  }
}

function custom(schedule: Schedule) {
  const every = schedule.custom_every;
  const unit = schedule.custom_unit;
  if (
    every === null ||
    !Number.isInteger(every) ||
    every < 1 ||
    !isOneOf(CUSTOM_UNITS, unit)
  ) {
    throw new Error(
      'A custom schedule needs a whole number of days, weeks or months.',
    );
  }
  return { every, unit };
}

function capitalise(word: string): string {
  return word[0]!.toUpperCase() + word.slice(1);
}
