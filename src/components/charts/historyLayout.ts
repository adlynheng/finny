/**
 * The net-worth history's layout, from the design's `hist()` in
 * FinnyOverview.dc.html: thirteen smoothed strands in a 1000 × 400 viewBox
 * that the chart stretches to fill its box, plus where the labels, the end dot
 * and the hover tooltip sit, as fractions of that box.
 */

import { tokens } from '@/theme/tokens';
import { formatMonthShort } from '@/utils/format/date';
import { formatKMoney, formatMoney } from '@/utils/format/money';
import type { HistoryPoint } from '@/utils/derive/networth';
import { interpolate, smoothPath, type Point } from './geometry';

export const HISTORY = { width: 1000, height: 400 } as const;

const look = tokens.history;

export type Strand = {
  kind: 'echo' | 'band' | 'net';
  d: string;
  opacity: number;
  width: number;
};

export type EdgeLabel = {
  text: string;
  /** The band's last value, as a fraction of the height from the top. */
  top: number;
  opacity: number;
};

export type HistoryGeometry = {
  n: number;
  strands: Strand[];
  labels: EdgeLabel[];
  /** The net line's last value, where the lime end dot sits. */
  endTop: number;
  /** Each month's net value, as a fraction of the height from the top. */
  netTops: number[];
};

/** The four bands, bottom to top. */
const bands = (points: readonly HistoryPoint[]) => ({
  cash: points.map(p => p.cash),
  investments: points.map(p => p.investments),
  cpf: points.map(p => p.cpf),
  net: points.map(p => p.net),
});

/** A month's x as a fraction of the width: the first at 0, the last at 1. */
export function xAt(i: number, n: number): number {
  return n > 1 ? i / (n - 1) : 0;
}

export function historyGeometry(
  points: readonly HistoryPoint[],
): HistoryGeometry {
  const n = points.length;
  const b = bands(points);
  const max = Math.max(0, ...b.net) * look.headroom;
  // From the top, so SVG and layout agree; with nothing to plot, the floor.
  const top = (v: number) => (max > 0 ? 1 - v / max : 1);
  const line = (series: readonly number[]) =>
    smoothPath(
      series.map(
        (v, i): Point => [xAt(i, n) * HISTORY.width, top(v) * HISTORY.height],
      ),
    );

  const strands: Strand[] = [];
  const stack = [b.cash, b.investments, b.cpf, b.net];
  for (let k = 0; k < 3; k++) {
    for (const t of look.echo.at) {
      strands.push({
        kind: 'echo',
        d: line(interpolate(stack[k]!, stack[k + 1]!, t)),
        opacity: look.echo.opacity,
        width: look.echo.width,
      });
    }
  }
  for (const series of [b.cash, b.investments, b.cpf]) {
    strands.push({
      kind: 'band',
      d: line(series),
      opacity: look.band.opacity,
      width: look.band.width,
    });
  }
  strands.push({
    kind: 'net',
    d: line(b.net),
    opacity: look.net.opacity,
    width: look.net.width,
  });

  const last = (series: readonly number[]) => top(series[n - 1] ?? 0);
  return {
    n,
    strands,
    labels: [
      { text: 'Net', top: last(b.net), opacity: 1 },
      { text: '+ CPF', top: last(b.cpf), opacity: look.labelOpacity },
      {
        text: '+ Invest.',
        top: last(b.investments),
        opacity: look.labelOpacity,
      },
      { text: 'Cash', top: last(b.cash), opacity: look.labelOpacity },
    ],
    endTop: last(b.net),
    netTops: b.net.map(top),
  };
}

/**
 * The month under a pointer `x` points into a chart `width` wide: the nearest
 * index, clamped to the chart.
 */
export function indexAt(x: number, width: number, n: number): number {
  if (n < 2 || width <= 0) return 0;
  return Math.max(0, Math.min(n - 1, Math.round((x / width) * (n - 1))));
}

export type HistoryTip = {
  /** The crosshair's x as a fraction of the width. */
  left: number;
  /** The net line's y there, as a fraction of the height. */
  top: number;
  /** Past 60% the tooltip sits to the crosshair's left. */
  flip: boolean;
  month: string;
  net: string;
  /** Each class's own amount, not the cumulative band. */
  mix: string;
};

export function historyTip(
  points: readonly HistoryPoint[],
  geo: HistoryGeometry,
  i: number,
): HistoryTip | null {
  const p = points[i];
  if (!p) return null;
  const left = xAt(i, geo.n);
  return {
    left,
    top: geo.netTops[i]!,
    flip: left > look.flipAt,
    month: formatMonthShort(p.date, { year: true }),
    net: formatMoney(p.net),
    mix: `Cash ${formatKMoney(p.cash)} · Inv ${formatKMoney(
      p.investments - p.cash,
    )} · CPF ${formatKMoney(p.cpf - p.investments)}`,
  };
}
