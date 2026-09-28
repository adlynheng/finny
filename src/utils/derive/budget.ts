/**
 * The monthly budget: what was spent, how that compares to an even pace
 * through the month, and how much of the limit is used. Only `expense`
 * transactions count; deposits and transfers never touch the budget.
 */

import { differenceInCalendarMonths, getDate } from 'date-fns';

import { appSettings } from '@/config/appSettings';
import type { TxnRow } from '@/types/domain';
import { today } from '@/lib/today';
import {
  daysInMonth,
  monthKey,
  parseDate,
  parseMonth,
  type MonthKey,
} from '@/utils/format/date';
import { formatMoney } from '@/utils/format/money';

export type BudgetTxn = Pick<TxnRow, 'date' | 'kind' | 'amount_cents'>;

export type PaceStatus = { kind: 'under' | 'over'; label: string };

/** One bucket per calendar day of `month`, each that day's expenses as positive cents. */
export function dailySpend(
  txns: readonly BudgetTxn[],
  month: MonthKey,
): number[] {
  const buckets = new Array<number>(daysInMonth(month)).fill(0);
  for (const t of txns) {
    if (t.kind === 'expense' && monthKey(t.date) === month) {
      buckets[getDate(parseDate(t.date)) - 1]! -= t.amount_cents;
    }
  }
  return buckets;
}

/** The month's spend, or its spend through day `throughDay` (1-based) when given. */
export function monthSpentCents(
  txns: readonly BudgetTxn[],
  month: MonthKey,
  throughDay?: number,
): number {
  return dailySpend(txns, month)
    .slice(0, throughDay)
    .reduce((sum, cents) => sum + cents, 0);
}

/**
 * Days of `month` that have happened, counting today: all of a past month,
 * none of a future one.
 */
export function elapsedDays(month: MonthKey, from: string = today()): number {
  const diff = differenceInCalendarMonths(parseMonth(from), parseMonth(month));
  if (diff > 0) {
    return daysInMonth(month);
  }
  return diff < 0 ? 0 : getDate(parseDate(from));
}

/**
 * Days of `month` still to spend in, counting today: all of a future month,
 * none of a past one, and 1 on the last day of this one.
 */
export function daysRemaining(month: MonthKey, from: string = today()): number {
  const isCurrent = monthKey(from) === month;
  return daysInMonth(month) - elapsedDays(month, from) + (isCurrent ? 1 : 0);
}

/** Where spend would be on day `day` if the limit were spread evenly over the month. */
export function evenPaceCents(
  limitCents: number,
  month: MonthKey,
  day: number,
): number {
  return (limitCents * day) / daysInMonth(month);
}

/** `S$200 under pace` / `S$120 over pace`. Exactly on pace reads as under. */
export function paceStatus(
  spentCents: number,
  limitCents: number,
  month: MonthKey,
  day: number,
): PaceStatus {
  const gap = spentCents - evenPaceCents(limitCents, month, day);
  const kind = gap > 0 ? 'over' : 'under';
  return { kind, label: `${formatMoney(gap)} ${kind} pace` };
}

export function dailyAverageCents(spentCents: number, days: number): number {
  return days > 0 ? spentCents / days : 0;
}

/**
 * What can still be spent each remaining day, today included, without
 * breaking the limit. Never below zero, and zero once the month is over.
 */
export function safeDailyCents(
  limitCents: number,
  spentCents: number,
  month: MonthKey,
  from: string = today(),
): number {
  const left = daysRemaining(month, from);
  return left === 0 ? 0 : Math.max(0, (limitCents - spentCents) / left);
}

/**
 * The fraction of the limit spent. Deliberately not clamped: the dial's arc
 * clamps at render, but the centre label shows the true figure, e.g. 114%.
 * Null for a zero limit, where there is no fraction to show.
 */
export function usage(spentCents: number, limitCents: number) {
  const overLimit = spentCents > limitCents;
  if (limitCents <= 0) {
    return { fraction: null, overLimit, warn: overLimit };
  }
  const fraction = spentCents / limitCents;
  return {
    fraction,
    overLimit,
    warn: fraction >= appSettings.budgetWarnThreshold,
  };
}
