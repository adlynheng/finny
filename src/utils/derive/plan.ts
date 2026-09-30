/**
 * The monthly plan (Goals & Planner): gross income from the income sources,
 * what CPF and the fixed commitments take off the top, and how much of the
 * rest the three allocations leave. Fixed commitments are the recurring
 * charges as monthly equivalents, grouped by category.
 */

import type { Plan } from '@/stores/planStore';
import type {
  CategoryRow,
  IncomeSourceRow,
  RecurringChargeRow,
} from '@/types/domain';
import { monthlyEquivalentCents, scheduleOf } from './recurrence';

/** The allocation sliders run from nothing to S$5,000, in S$50 steps. */
export const SLIDER_MAX_CENTS = 500_000;
export const SLIDER_STEP_CENTS = 5_000;
/** A typed allocation takes at most five digits of whole dollars. */
const TYPED_DIGITS = 5;

/** Per-month cents of each active row with a schedule the app knows. */
function monthlyTotal(
  rows: readonly {
    is_active: boolean;
    cents: number;
    schedule: ReturnType<typeof scheduleOf>;
  }[],
): number {
  return rows.reduce(
    (sum, r) =>
      r.is_active && r.schedule
        ? sum + monthlyEquivalentCents(r.cents, r.schedule)
        : sum,
    0,
  );
}

/** Every active income source's monthly equivalent. */
export function grossIncomeCents(sources: readonly IncomeSourceRow[]): number {
  return monthlyTotal(
    sources.map(s => ({
      is_active: s.is_active,
      cents: s.base_income_cents,
      schedule: scheduleOf(s),
    })),
  );
}

/** Every active recurring charge's monthly equivalent. */
export function fixedCostsCents(
  charges: readonly RecurringChargeRow[],
): number {
  return monthlyTotal(
    charges.map(c => ({
      is_active: c.is_active,
      cents: c.amount_cents,
      schedule: scheduleOf(c),
    })),
  );
}

export type Commitment = {
  /** The category's id, or `none` for uncategorised charges. */
  key: string;
  name: string;
  /** The category's icon key, for the icon registry. */
  icon: string | null;
  cents: number;
  /** How many charges, then their names, largest first. */
  detail: string;
  /** Of all the commitments. */
  share: number;
};

/**
 * The active charges grouped by category, largest group first: each group's
 * monthly equivalent, its share of the whole, and a line counting its
 * charges.
 */
export function commitmentGroups(
  charges: readonly RecurringChargeRow[],
  categories: readonly CategoryRow[],
): Commitment[] {
  const groups = new Map<
    string,
    { category: CategoryRow | undefined; charges: [string, number][] }
  >();
  for (const c of charges) {
    const schedule = c.is_active ? scheduleOf(c) : null;
    if (!schedule) {
      continue;
    }
    const key = c.category_id === null ? 'none' : String(c.category_id);
    const group = groups.get(key) ?? {
      category: categories.find(k => k.id === c.category_id),
      charges: [],
    };
    group.charges.push([
      c.name,
      monthlyEquivalentCents(c.amount_cents, schedule),
    ]);
    groups.set(key, group);
  }
  const total = fixedCostsCents(charges);
  return [...groups.entries()]
    .map(([key, { category, charges: list }]) => {
      const cents = list.reduce((sum, [, v]) => sum + v, 0);
      const names = [...list].sort((a, b) => b[1] - a[1]).map(([n]) => n);
      const count = `${list.length} ${
        list.length === 1 ? 'charge' : 'charges'
      }`;
      return {
        key,
        name: category?.name ?? 'Uncategorised',
        icon: category?.icon ?? null,
        cents,
        detail: `${count} · ${names.join(', ')}`,
        share: total > 0 ? cents / total : 0,
      };
    })
    .sort((a, b) => b.cents - a.cents);
}

export function allocatedCents(plan: Plan): number {
  return plan.investmentCents + plan.savingsCents + plan.expenditureCents;
}

/**
 * What the plan leaves of gross income once CPF, the fixed costs and the
 * three allocations are taken: negative when over. In whole dollars, as the
 * page shows it, so a plan can land on exactly nothing left even though the
 * fixed costs' monthly equivalents carry fractions of a cent.
 */
export function leftToAllocateCents({
  grossCents,
  cpfCents,
  fixedCents,
  plan,
}: {
  grossCents: number;
  cpfCents: number;
  fixedCents: number;
  plan: Plan;
}): number {
  const left = grossCents - cpfCents - fixedCents - allocatedCents(plan);
  // `+ 0` turns a rounded -0 into 0.
  return Math.round(left / 100) * 100 + 0;
}

export type LeftLabel = { text: string; tone: 'ink' | 'muted' | 'danger' };

/** `left to allocate`, `over income`, or `All allocated · every dollar has a job` at exactly zero. */
export function leftLabel(leftCents: number): LeftLabel {
  if (leftCents === 0) {
    return { text: 'All allocated · every dollar has a job', tone: 'ink' };
  }
  return leftCents > 0
    ? { text: 'left to allocate', tone: 'muted' }
    : { text: 'over income', tone: 'danger' };
}

/** A slider's value at `fraction` of its track: snapped to S$50, within the track. */
export function sliderCents(fraction: number): number {
  'worklet';
  const steps = Math.round((fraction * SLIDER_MAX_CENTS) / SLIDER_STEP_CENTS);
  return Math.min(SLIDER_MAX_CENTS, Math.max(0, steps * SLIDER_STEP_CENTS));
}

/** Where `cents` sits along a slider's track, from 0 to 1; past the end sits at the end. */
export function sliderFraction(cents: number): number {
  return Math.min(1, Math.max(0, cents / SLIDER_MAX_CENTS));
}

/**
 * A typed allocation: its digits (at most five, as the field keeps them) and
 * the amount they mean, no more than gross income.
 */
export function typedAllocation(
  text: string,
  grossCents: number,
): { text: string; cents: number } {
  const digits = text.replace(/[^0-9]/g, '').slice(0, TYPED_DIGITS);
  return {
    text: digits,
    cents: Math.min(grossCents, Number(digits || '0') * 100),
  };
}
