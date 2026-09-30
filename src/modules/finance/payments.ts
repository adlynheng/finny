/**
 * The payments calendar's arithmetic over recurring charges: which days of a
 * month each charge falls on (from the recurrence derive, so a charge added or
 * removed moves the calendar at once), which of those are still to come, and
 * the day it opens on.
 */

import { setDate } from 'date-fns';

import type { RecurringChargeRow } from '@/types/domain';
import { occurrencesInMonth, scheduleOf } from '@/utils/derive/recurrence';
import { parseMonth, toIsoDate, type MonthKey } from '@/utils/format/date';

/** Each day of `month` with charges on it, and those charges. Inactive charges are left out. */
export function chargesByDay(
  charges: readonly RecurringChargeRow[],
  month: MonthKey,
): Map<number, RecurringChargeRow[]> {
  const byDay = new Map<number, RecurringChargeRow[]>();
  for (const charge of charges) {
    const schedule = charge.is_active ? scheduleOf(charge) : null;
    for (const day of schedule ? occurrencesInMonth(schedule, month) : []) {
      byDay.set(day, [...(byDay.get(day) ?? []), charge]);
    }
  }
  return byDay;
}

/**
 * Whether `day` of `month` has happened, today included: a charge due today
 * counts as paid, as the design shows it.
 */
export function isPastDay(month: MonthKey, day: number, today: string) {
  return dateOf(month, day) <= today;
}

/** The charge days still to come in `month`, in order. */
export function upcomingDays(
  byDay: Map<number, unknown>,
  month: MonthKey,
  today: string,
): number[] {
  return [...byDay.keys()]
    .filter(day => !isPastDay(month, day, today))
    .sort((a, b) => a - b);
}

/** The day the calendar opens on: the next charge day, else the month's first charge day. */
export function defaultDay(
  byDay: Map<number, unknown>,
  month: MonthKey,
  today: string,
): number | null {
  const days = [...byDay.keys()].sort((a, b) => a - b);
  return upcomingDays(byDay, month, today)[0] ?? days[0] ?? null;
}

/** A tile's amount: `S$72`, `S$1.14k`. */
export function tileAmount(cents: number): string {
  return cents >= 100_000
    ? `S$${(cents / 100_000).toFixed(2)}k`
    : `S$${Math.round(cents / 100)}`;
}

/** The ISO date of `day` in `month`. */
export function dateOf(month: MonthKey, day: number): string {
  return toIsoDate(setDate(parseMonth(month), day));
}
