/**
 * The maths every chart shares, as pure functions. Each one is lifted from the
 * design's own chart code (the Overview sphere and history, the Planner dial),
 * so a chart built on them draws what the design draws.
 *
 * Angles are in degrees, measured clockwise from 3 o'clock because SVG's y
 * axis points down; -90° is the top of the circle.
 */

export type Point = [x: number, y: number];

export function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** The point `r` from the centre at `deg`. */
export function polar(r: number, deg: number): Point {
  return [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
}

/**
 * A number for a path string: two decimals, never exponent notation (cos 90°
 * is 6e-17, not 0) and never `-0`.
 */
function num(n: number): string {
  const v = Math.round(n * 100) / 100;
  return String(v === 0 ? 0 : v);
}

/**
 * A clockwise arc of radius `r` from `from` to `to`. The large-arc flag is set
 * once the sweep passes 180°, as the sphere's hit arcs and the dial's progress
 * arc both need. The sweep must stay under 360° — an arc whose ends meet draws
 * nothing, which is why the dial stops its arc at 269.9°.
 */
export function arcPath(r: number, from: number, to: number): string {
  const [sx, sy] = polar(r, from);
  const [ex, ey] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${num(sx)},${num(sy)} A${num(r)},${num(r)} 0 ${large} 1 ${num(
    ex,
  )},${num(ey)}`;
}

const fix = (n: number) => n.toFixed(1);

/**
 * A smooth line through every point: one cubic per segment, with control
 * points a sixth of the way along the line joining each end's neighbours
 * (Catmull-Rom). An end with no neighbour borrows itself. Used by the history
 * strands and the cash-flow lines.
 */
export function smoothPath(points: readonly Point[]): string {
  const first = points[0];
  if (!first) return '';
  let d = `M${fix(first[0])},${fix(first[1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    d +=
      ` C${fix(p1[0] + (p2[0] - p0[0]) / 6)},${fix(
        p1[1] + (p2[1] - p0[1]) / 6,
      )}` +
      ` ${fix(p2[0] - (p3[0] - p1[0]) / 6)},${fix(
        p2[1] - (p3[1] - p1[1]) / 6,
      )}` +
      ` ${fix(p2[0])},${fix(p2[1])}`;
  }
  return d;
}

/**
 * The series `t` of the way from `a` to `b`, index by index. The history
 * chart's echo strands sit at .25, .5 and .75 between adjacent bands.
 */
export function interpolate(
  a: readonly number[],
  b: readonly number[],
  t: number,
): number[] {
  if (a.length !== b.length) {
    throw new Error(
      `interpolate: series lengths differ (${a.length} vs ${b.length})`,
    );
  }
  return a.map((v, i) => v + (b[i]! - v) * t);
}

export type TickGroup = {
  /** Ticks in this group. */
  n: number;
  /** Where the group's span begins and ends. */
  start: number;
  end: number;
  /** Each tick's angle, centred in its slot. */
  ticks: number[];
};

export type TickLayout = {
  groups: TickGroup[];
  /** Degrees per tick slot. */
  step: number;
};

/**
 * Shares `count` ticks round a circle in proportion to `values`, starting half
 * a gap past the top with a `gap`° break after each group. A non-empty value
 * always gets at least one tick; a zero value gets none, and no gap. Rounding
 * can make the total differ slightly from `count`; the slot size absorbs it,
 * so ticks and gaps always fill exactly 360°.
 */
export function distributeTicks(
  values: readonly number[],
  { count, gap }: { count: number; gap: number },
): TickLayout {
  const total = values.reduce((s, v) => s + v, 0);
  const ns = values.map(v =>
    v > 0 ? Math.max(1, Math.round((v / total) * count)) : 0,
  );
  const active = ns.filter(n => n > 0).length;
  const ticks = ns.reduce((s, n) => s + n, 0);
  const step = ticks > 0 ? (360 - gap * active) / ticks : 0;

  let angle = -90 + gap / 2;
  const groups = ns.map(n => {
    const start = angle;
    const end = start + step * n;
    const group = {
      n,
      start,
      end,
      ticks: Array.from({ length: n }, (_, j) => start + step * (j + 0.5)),
    };
    angle = n > 0 ? end + gap : end;
    return group;
  });
  return { groups, step };
}

export type Anchor = 'start' | 'middle' | 'end';

/**
 * How to set a label placed outside a circle at `deg`: anchored away from the
 * circle on either side, centred near the poles, and nudged 12 units further
 * out when close to the top or bottom so it clears the ticks.
 */
export function labelAnchor(deg: number): { anchor: Anchor; dy: number } {
  const cos = Math.cos(rad(deg));
  const sin = Math.sin(rad(deg));
  const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
  const dy = sin > 0.6 ? 12 : sin < -0.6 ? -12 : 0;
  return { anchor, dy };
}
