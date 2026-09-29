/**
 * Trading's line charts, from the design's `chart()` and Watchlist sparks:
 * the paths EchoLine and Sparkline draw, from plain number arrays. The P&L
 * chart takes the screen's value-to-y mapper, so the screen owns the scale;
 * the sparkline scales to its own min and max.
 */

import { tokens } from '@/theme/tokens';
import { indexAt, xAt } from './historyLayout';

export { indexAt };

const look = tokens.echo;

/** The P&L chart's viewBox is 100 × 100, stretched to the chart's box. */
export const ECHO_BOX = 100;

/** A value's y in the P&L chart's viewBox, 0 at the top. */
export type YMapper = (value: number) => number;

const linePath = (
  values: readonly number[],
  x: (i: number) => number,
  y: (v: number) => number,
) =>
  values
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    .join('');

export type EchoPaths = {
  line: string;
  /** Deepest first, so the shallower echoes draw over them. */
  echoes: { d: string; opacity: number }[];
  /** The dashed zero line's y, only when the series crosses zero. */
  zeroY: number | null;
};

export function echoPaths(values: readonly number[], y: YMapper): EchoPaths {
  const n = values.length;
  const x = (i: number) => xAt(i, n) * ECHO_BOX;
  const { count, step, opacity, fade } = look.echoes;
  const depths = Array.from({ length: count }, (_, k) => count - k);
  const crosses = Math.min(...values) < 0 && Math.max(...values) > 0;
  return {
    line: linePath(values, x, y),
    echoes: depths.map(k => ({
      d: linePath(values, x, v => y(v) + k * step),
      opacity: opacity - k * fade,
    })),
    zeroY: crosses ? y(0) : null,
  };
}

/**
 * A step line in the P&L chart's viewBox: flat to each next day, then straight
 * up or down to its value, as capital steps up on each purchase.
 */
export function stepPath(values: readonly number[], y: YMapper): string {
  const n = values.length;
  const x = (i: number) => (xAt(i, n) * ECHO_BOX).toFixed(2);
  return values
    .map((v, i) =>
      i ? `H${x(i)}V${y(v).toFixed(2)}` : `M${x(i)},${y(v).toFixed(2)}`,
    )
    .join('');
}

/** The sample dots' indices: eight, evenly spaced, the first and last included. */
export function sampleIndices(n: number): number[] {
  const { count } = look.samples;
  if (n < 1) return [];
  return Array.from({ length: count }, (_, k) =>
    Math.round((k * (n - 1)) / (count - 1)),
  );
}

/** The sparkline's path in its 48 × 22 box, scaled to its own min and max. */
export function sparkPath(values: readonly number[]): string {
  const { box, inset } = tokens.spark;
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const n = values.length;
  return values
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${(xAt(i, n) * box.width).toFixed(1)},${(
          inset +
          (1 - (v - lo) / span) * (box.height - 2 * inset)
        ).toFixed(1)}`,
    )
    .join('');
}
