/**
 * The two dials the designs draw, as RadialDial configurations: the budget
 * dial (FinnyFinance `dial()`) and the allocation dial (FinnyPlanner
 * `dial()`).
 */

import { formatMoney } from '@/utils/format/money';
import type { DialConfig, DialGroup } from './dialLayout';

/**
 * The month's budget: one tick per elapsed day, its length by that day's
 * spend (10 plus up to 58 for the biggest day), today's tick highlighted and
 * the days still to come as dots. The arc is the share of the limit used and
 * the "even pace" marker sits where today's share of the month would put it.
 */
export function budgetDial({
  dailyCents,
  daysInMonth,
  spentCents,
  limitCents,
}: {
  /** Spend on each day so far, today last. */
  dailyCents: readonly number[];
  daysInMonth: number;
  spentCents: number;
  limitCents: number;
}): DialConfig {
  const today = dailyCents.length;
  const max = Math.max(0, ...dailyCents);
  const lengths = dailyCents.map(c => 10 + (max > 0 ? c / max : 0) * 58);
  const groups: DialGroup[] = [
    { key: 'past', ticks: lengths.slice(0, -1) },
    { key: 'today', ticks: lengths.slice(-1), today: true },
    {
      key: 'future',
      ticks: Array<number>(Math.max(0, daysInMonth - today)).fill(0),
      dots: true,
    },
  ];
  const used = limitCents > 0 ? spentCents / limitCents : 0;
  return {
    groups,
    gap: 0,
    spread: 1.3,
    // 25 ms a day, day 1 first.
    stagger: { ms: 25, from: 1 },
    beads: false,
    arc: { to: used, over: spentCents > limitCents, cap: 'dot' },
    pace: { at: today / daysInMonth, label: 'even pace' },
    centre: {
      primary: `${Math.round(used * 100)}%`,
      secondary: 'of limit used',
      primarySize: 40,
    },
  };
}

export type AllocationCategory = {
  key: string;
  name: string;
  cents: number;
  /** The design's tick length for the category. */
  length: number;
};

const ALLOCATION_TICKS = 96;

/**
 * The monthly plan: 96 ticks shared between the categories by amount (at
 * least one each), each category's own length with the design's wobble, and
 * any unallocated remainder as dots. The arc runs to the end of the allocated
 * ticks and turns danger-coloured when the plan exceeds gross income.
 */
export function allocationDial({
  grossCents,
  categories,
}: {
  grossCents: number;
  categories: readonly AllocationCategory[];
}): DialConfig {
  const used = categories.reduce((s, c) => s + c.cents, 0);
  const rem = grossCents - used;
  const total = Math.max(grossCents, used);
  const all = [
    ...categories,
    ...(rem > 0
      ? [{ key: 'unallocated', name: 'Unallocated', cents: rem, length: 0 }]
      : []),
  ];
  let i = 0;
  const groups: DialGroup[] = all.map(c => {
    const n =
      c.cents > 0 && total > 0
        ? Math.max(1, Math.round((c.cents / total) * ALLOCATION_TICKS))
        : 0;
    const ticks = Array.from(
      { length: n },
      (_, j) => c.length * (0.84 + 0.16 * Math.sin((i + j) * 1.9 + j * 0.7)),
    );
    i += n;
    return {
      key: c.key,
      ticks,
      dots: c.key === 'unallocated',
      label: { name: c.name, value: formatMoney(c.cents) },
    };
  });
  return {
    groups,
    gap: 6,
    spread: 0.9,
    stagger: { ms: 12, from: 0 },
    beads: true,
    arc: { to: 'groups', over: rem < 0, cap: 'head' },
    centre: {
      primary: formatMoney(grossCents),
      secondary: `gross income · ${
        grossCents > 0 ? Math.round((used / grossCents) * 100) : 0
      }% allocated`,
      primarySize: 36,
    },
  };
}
