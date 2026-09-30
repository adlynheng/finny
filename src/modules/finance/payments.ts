/**
 * The payments calendar's arithmetic: which days of a month each recurring
 * charge, credit card bill and payday falls on (from the recurrence derive and
 * the day-of-month fields, so a change moves the calendar at once), which of
 * those are still to come, and the day it opens on.
 */

import { addDays, setDate } from 'date-fns';

import { LAST_DAY } from '@/modules/settings/income';
import type {
  CardRow,
  IncomeSourceRow,
  RecurringChargeRow,
  TxnRow,
} from '@/types/domain';
import { occurrencesInMonth, scheduleOf } from '@/utils/derive/recurrence';
import {
  dayInMonth,
  parseDate,
  parseMonth,
  shiftMonth,
  toIsoDate,
  type MonthKey,
} from '@/utils/format/date';

/**
 * One thing on a calendar day. Charges and bills are money out; a payday is
 * money in, the salary's take-home.
 */
export type DayItem = {
  key: string;
  name: string;
  cents: number;
  kind: 'charge' | 'bill' | 'payday';
};

/** Money out: everything but a payday. */
export const isOutgoing = (item: DayItem) => item.kind !== 'payday';

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

/** Each day of `month` with something on it: its charges, then bills, then paydays. */
export function calendarItems(
  sources: {
    charges: readonly RecurringChargeRow[];
    cards: readonly CardRow[];
    incomes: readonly IncomeSourceRow[];
    txns: readonly Pick<
      TxnRow,
      'account_id' | 'date' | 'kind' | 'amount_cents'
    >[];
    employeeRate: number;
  },
  month: MonthKey,
): Map<number, DayItem[]> {
  const byDay = new Map<number, DayItem[]>();
  const add = (day: number, item: DayItem) =>
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  for (const [day, charges] of chargesByDay(sources.charges, month)) {
    for (const c of charges) {
      add(day, {
        key: `charge-${c.id}`,
        name: c.name,
        cents: c.amount_cents,
        kind: 'charge',
      });
    }
  }
  for (const card of sources.cards) {
    const bill = billOf(card, sources.txns, month);
    if (bill) {
      add(bill.day, {
        key: `bill-${card.id}`,
        name: `${card.bank} bill`,
        cents: bill.cents,
        kind: 'bill',
      });
    }
  }
  for (const source of sources.incomes) {
    const date = dayInMonth(month, source.payday ?? LAST_DAY);
    if (
      source.type === 'salary' &&
      source.is_active &&
      date >= source.start_date
    ) {
      add(parseDate(date).getDate(), {
        key: `payday-${source.id}`,
        name: `Payday · ${source.name}`,
        cents: Math.round(
          source.base_income_cents * (1 - sources.employeeRate),
        ),
        kind: 'payday',
      });
    }
  }
  return byDay;
}

/**
 * A credit card's bill in `month`: due on its bill day, for the cycle whose
 * statement closed last before it, and what that cycle spent on the card,
 * refunds taken off and payments to it left out. A cycle still open shows what
 * it has spent so far. None for a card without both days.
 */
export function billOf(
  card: Pick<
    CardRow,
    'card_type' | 'account_id' | 'statement_day' | 'bill_due_day'
  >,
  txns: readonly Pick<
    TxnRow,
    'account_id' | 'date' | 'kind' | 'amount_cents'
  >[],
  month: MonthKey,
): { day: number; cents: number } | null {
  if (
    card.card_type !== 'credit' ||
    card.statement_day === null ||
    card.bill_due_day === null
  ) {
    return null;
  }
  const due = dayInMonth(month, card.bill_due_day);
  let closes = dayInMonth(month, card.statement_day);
  let opens = dayInMonth(shiftMonth(month, -1), card.statement_day);
  if (closes >= due) {
    closes = opens;
    opens = dayInMonth(shiftMonth(month, -2), card.statement_day);
  }
  const from = toIsoDate(addDays(parseDate(opens), 1));
  const spent = txns
    .filter(
      t =>
        t.account_id === card.account_id &&
        t.kind !== 'transfer' &&
        t.date >= from &&
        t.date <= closes,
    )
    .reduce((sum, t) => sum - t.amount_cents, 0);
  return { day: parseDate(due).getDate(), cents: Math.max(spent, 0) };
}
