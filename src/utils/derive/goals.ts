/**
 * A goal's progress, pace and status. The share of its funding pot is derived
 * on every render from target, saved and target date against the current pot
 * (reconciliation item 4), so moving an allocation slider re-proportions every
 * goal rather than only resizing the pot.
 */

import { addMonths, differenceInCalendarMonths } from 'date-fns';

import type { GoalRow, GoalSource } from '@/types/domain';
import { today } from '@/lib/today';
import { formatMonthShort, parseDate, toIsoDate } from '@/utils/format/date';
import { formatMoney } from '@/utils/format/money';

export type Goal = Pick<
  GoalRow,
  'target_amount_cents' | 'current_amount_cents' | 'target_date'
>;

export type GoalStatus =
  | { kind: 'reached'; label: 'Reached' }
  | { kind: 'on-track'; label: string }
  | { kind: 'short'; label: string }
  | { kind: 'no-deadline'; label: 'No target date' };

/**
 * Integer cents make a perfectly funded goal land a fraction of a cent under
 * what it needs. Half a cent a month of slack keeps it from flickering to short.
 */
const TOLERANCE_CENTS = 0.5;

export function goalProgress(goal: Goal) {
  const targetCents = goal.target_amount_cents;
  const savedCents = goal.current_amount_cents;
  return {
    savedCents,
    targetCents,
    remainingCents: Math.max(0, targetCents - savedCents),
    fraction:
      targetCents <= 0 ? 1 : Math.min(1, Math.max(0, savedCents / targetCents)),
  };
}

/** Whole calendar months from `from` to the target date, at least one. Null with no deadline. */
export function monthsUntil(
  targetDate: string | null,
  from: string = today(),
): number | null {
  if (targetDate === null) {
    return null;
  }
  return Math.max(
    1,
    differenceInCalendarMonths(parseDate(targetDate), parseDate(from)),
  );
}

/** What the goal needs each month to land on its date: 0 once reached, null with no deadline. */
export function requiredMonthlyCents(
  goal: Goal,
  from: string = today(),
): number | null {
  const { remainingCents } = goalProgress(goal);
  if (remainingCents === 0) {
    return 0;
  }
  const months = monthsUntil(goal.target_date, from);
  return months === null ? null : remainingCents / months;
}

/** The monthly pot a goal draws from, by its `src`. */
export function potCents(
  src: GoalSource,
  plan: { savingsCents: number; investmentCents: number },
): number {
  return src === 'savings' ? plan.savingsCents : plan.investmentCents;
}

/**
 * The fraction of its pot the goal needs, capped at the whole pot. Zero for an
 * empty pot, a reached goal, or a goal with no deadline to pace against.
 */
export function goalShare(
  goal: Goal,
  pot: number,
  from: string = today(),
): number {
  const required = requiredMonthlyCents(goal, from);
  if (pot <= 0 || !required) {
    return 0;
  }
  return Math.min(1, required / pot);
}

/** What the goal's share of the pot actually puts in each month, in whole cents. */
export function contributionCents(
  goal: Goal,
  pot: number,
  from: string = today(),
): number {
  return Math.round(goalShare(goal, pot, from) * pot);
}

/** Months until reached at `contribution` a month: 0 once reached, null with no contribution. */
export function etaMonths(goal: Goal, contribution: number): number | null {
  const { remainingCents } = goalProgress(goal);
  if (remainingCents === 0) {
    return 0;
  }
  if (contribution <= 0) {
    return null;
  }
  return Math.ceil(remainingCents / (contribution + TOLERANCE_CENTS));
}

/** `Reached`, `On track · Nov 2026`, or `S$180/mo short`. */
export function goalStatus(
  goal: Goal,
  pot: number,
  from: string = today(),
): GoalStatus {
  const required = requiredMonthlyCents(goal, from);
  if (required === 0) {
    return { kind: 'reached', label: 'Reached' };
  }
  if (required === null) {
    return { kind: 'no-deadline', label: 'No target date' };
  }
  const contribution = contributionCents(goal, pot, from);
  const eta = etaMonths(goal, contribution);
  if (contribution + TOLERANCE_CENTS >= required && eta !== null) {
    const reachMonth = toIsoDate(addMonths(parseDate(from), eta));
    return {
      kind: 'on-track',
      label: `On track · ${formatMonthShort(reachMonth, { year: true })}`,
    };
  }
  return {
    kind: 'short',
    label: `${formatMoney(required - contribution)}/mo short`,
  };
}
