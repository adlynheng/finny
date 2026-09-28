/**
 * Money in and out of the ledger. Transfers move money between Adlyn's own
 * accounts, so they are excluded from both sides everywhere here.
 */

import { addMonths, subMonths } from 'date-fns';

import type { CategoryRow, TxnRow } from '@/types/domain';
import { monthKey, parseMonth, type MonthKey } from '@/utils/format/date';

export type CashFlowTxn = Pick<
  TxnRow,
  'date' | 'kind' | 'amount_cents' | 'category_id' | 'description'
>;

export type Category = Pick<CategoryRow, 'id' | 'name'>;

export type MonthTotals = {
  inCents: number;
  outCents: number;
  netCents: number;
};

export type CategoryRowSummary = {
  label: string;
  categoryId: number | null;
  count: number;
  cents: number;
  /** Of the group total: the percentage beside the bar. */
  fractionOfTotal: number;
  /** Of the group's largest row: the bar's length. */
  fractionOfMax: number;
};

export type CategoryGroup = { totalCents: number; rows: CategoryRowSummary[] };

/** Descriptions that name an income stream outright, checked in this order. */
const INCOME_KEYWORDS = [
  ['salary', 'Salary'],
  ['dividend', 'Dividends'],
  ['freelance', 'Freelance'],
] as const;

/** In, out and net, as positive `inCents` and `outCents`. Limited to `month` when given. */
export function monthTotals(
  txns: readonly CashFlowTxn[],
  month?: MonthKey,
): MonthTotals {
  let inCents = 0;
  let outCents = 0;
  for (const t of txns) {
    if (month !== undefined && monthKey(t.date) !== month) {
      continue;
    }
    if (t.kind === 'deposit') {
      inCents += t.amount_cents;
    } else if (t.kind === 'expense') {
      outCents -= t.amount_cents;
    }
  }
  return { inCents, outCents, netCents: inCents - outCents };
}

/** The share of income kept, clamped to 0–1, and 0 with no income. */
export function savingsRate({ inCents, outCents }: MonthTotals): number {
  if (inCents <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (inCents - outCents) / inCents));
}

/** `months` monthly totals ending on `endMonth`, oldest first. */
export function cashFlowSeries(
  txns: readonly CashFlowTxn[],
  endMonth: MonthKey,
  months: number,
): (MonthTotals & { month: MonthKey })[] {
  const first = subMonths(parseMonth(endMonth), months - 1);
  return Array.from({ length: months }, (_, i) => {
    const month = monthKey(addMonths(first, i));
    return { month, ...monthTotals(txns, month) };
  });
}

/**
 * An income row's name: a description mentioning salary, dividends or
 * freelance work wins, then the category, then `Other income`.
 */
export function incomeName(
  description: string,
  categoryName: string | null,
): string {
  const text = description.toLowerCase();
  const match = INCOME_KEYWORDS.find(([keyword]) => text.includes(keyword));
  return match?.[1] ?? categoryName ?? 'Other income';
}

/** The Categories view: spending and income grouped, each largest first. */
export function groupCategories(
  txns: readonly CashFlowTxn[],
  categories: readonly Category[],
): { spending: CategoryGroup; income: CategoryGroup } {
  const names = new Map(categories.map(c => [c.id, c.name]));
  const nameOf = (t: CashFlowTxn) =>
    t.category_id === null ? null : names.get(t.category_id) ?? null;

  const spending = txns
    .filter(t => t.kind === 'expense')
    .map(t => ({
      label: nameOf(t) ?? 'Uncategorised',
      categoryId: nameOf(t) === null ? null : t.category_id,
      cents: -t.amount_cents,
    }));
  const income = txns
    .filter(t => t.kind === 'deposit')
    .map(t => {
      const label = incomeName(t.description, nameOf(t));
      return {
        label,
        categoryId: label === nameOf(t) ? t.category_id : null,
        cents: t.amount_cents,
      };
    });

  return { spending: group(spending), income: group(income) };
}

function group(
  items: { label: string; categoryId: number | null; cents: number }[],
): CategoryGroup {
  const rows = new Map<
    string,
    Omit<CategoryRowSummary, 'fractionOfTotal' | 'fractionOfMax'>
  >();
  for (const item of items) {
    const row = rows.get(item.label) ?? { ...item, count: 0, cents: 0 };
    row.count += 1;
    row.cents += item.cents;
    rows.set(item.label, row);
  }
  const sorted = [...rows.values()].sort(
    (a, b) => b.cents - a.cents || a.label.localeCompare(b.label),
  );
  const totalCents = sorted.reduce((sum, r) => sum + r.cents, 0);
  const maxCents = sorted[0]?.cents ?? 0;
  return {
    totalCents,
    rows: sorted.map(r => ({
      ...r,
      fractionOfTotal: totalCents > 0 ? r.cents / totalCents : 0,
      fractionOfMax: maxCents > 0 ? r.cents / maxCents : 0,
    })),
  };
}
