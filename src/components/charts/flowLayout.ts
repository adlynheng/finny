/**
 * Personal Finance's two flow visuals, from the design's `strands()` and
 * `cashflow()` (the same on desktop and mobile): the paths StrandsFlow and
 * CashflowArea draw, in their stretched viewBoxes.
 */

import { tokens } from '@/theme/tokens';
import { smoothPath, type Point } from './geometry';

/** StrandsFlow's viewBox is 100 × 100, stretched to its box. */
export const STRANDS_BOX = 100;

export type StrandPath = { d: string; saved: boolean };

/**
 * The 22 strands from the origin (0, 50): the first round(rate × 22) run to
 * Saved at the top right, the rest to Spent at the bottom right. Each fans
 * out from its place in the bundle and gathers into its destination's.
 */
export function strandPaths(rate: number): StrandPath[] {
  const { count, saved: s, spent: p, spread } = tokens.strands;
  const saved = Math.round(Math.min(1, Math.max(0, rate)) * count);
  const spent = count - saved;
  return Array.from({ length: count }, (_, i) => {
    const toSaved = i < saved;
    const oy = 50 + (i - count / 2) * spread.out;
    const ey = toSaved
      ? s.endY + (i - saved / 2) * spread.in
      : p.endY + (i - saved - spent / 2) * spread.in;
    const end = toSaved ? s.endY : p.endY;
    return {
      d: `M0,50 C35,${oy} 45,${oy} 55,${(oy + ey) / 2} S80,${ey} 100,${end}`,
      saved: toSaved,
    };
  });
}

/** CashflowArea's viewBox, stretched to its box. */
export const CASHFLOW = { width: 1000, height: 200 } as const;

export type CashflowGeometry = {
  n: number;
  income: string;
  expense: string;
  /** The band between the lines: along income, back along expenses. */
  band: string;
  /** Each month's drop line, from the bottom up to its income. */
  drops: Point[];
  /** Each month's centre as a fraction of the width. */
  lefts: number[];
  /** Each month's income and expense heights as fractions of the height. */
  incomeTops: number[];
  expenseTops: number[];
};

/**
 * Months sit at the centres of equal columns. `max` is the screen's scale:
 * the value at the top of the box; anything above it is held at the top.
 */
export function cashflowGeometry(
  income: readonly number[],
  expense: readonly number[],
  max: number,
): CashflowGeometry {
  const { width: W, height: H } = CASHFLOW;
  const n = income.length;
  const x = (i: number) => ((i + 0.5) / n) * W;
  const y = (v: number) => H - (Math.min(v, max) / max) * H;
  const pi = income.map((v, i): Point => [x(i), y(v)]);
  const pe = expense.map((v, i): Point => [x(i), y(v)]);
  const last = pe[n - 1];
  const back = smoothPath([...pe].reverse()).replace(/^M[^ ]+/, '');
  return {
    n,
    income: smoothPath(pi),
    expense: smoothPath(pe),
    band: last ? `${smoothPath(pi)} L${last[0]},${last[1]}${back} Z` : '',
    drops: pi,
    lefts: pi.map(([px]) => px / W),
    incomeTops: pi.map(([, py]) => py / H),
    expenseTops: pe.map(([, py]) => py / H),
  };
}

/** The month whose column is under a pointer `x` points into a box `width` wide. */
export function columnAt(x: number, width: number, n: number): number {
  if (n < 1 || width <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.floor((x / width) * n)));
}
