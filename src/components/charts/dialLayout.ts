/**
 * The radial dial's layout, from the designs' two `dial()`s (FinnyFinance's
 * budget dial and FinnyPlanner's allocation dial): tick groups round a ring
 * from the top, an arc at 208, and the points the dial marks. Everything is in
 * viewBox units centred on the dial.
 */

import { tokens } from '@/theme/tokens';
import {
  arcPath,
  labelAnchor,
  polar,
  tickPaths,
  type Anchor,
  type Point,
  type Tick,
} from './geometry';

const look = tokens.dial;

export type DialGroup = {
  key: string;
  /** Each tick's length; the group has one tick per entry. */
  ticks: readonly number[];
  /** Small dots on the inside instead of ticks (future days, unallocated). */
  dots?: boolean;
  /** Today's tick: stronger, with the pulsing head at its tip. */
  today?: boolean;
  /** An outside label: the group's name and value. */
  label?: { name: string; value: string };
};

export type DialArc = {
  /**
   * How far round the arc runs from the top, as a fraction of the circle, or
   * 'groups' to end where the last group of ticks does.
   */
  to: number | 'groups';
  /** Past the limit: the arc turns danger-coloured. */
  over: boolean;
  /** The arc's end: a small ink dot, or the pulsing lime head. */
  cap: 'dot' | 'head';
};

export type DialConfig = {
  groups: readonly DialGroup[];
  /** Degrees between groups. */
  gap: number;
  /** The side strokes' angle either side of each tick. */
  spread: number;
  /** The entrance: `ms` a tick, the first tick waiting `from` ticks. */
  stagger: { ms: number; from: number };
  /** A bead on the arc's ring before each group. */
  beads: boolean;
  arc: DialArc | null;
  /** The budget dial's "even pace" marker, a fraction of the way round. */
  pace?: { at: number; label: string };
  centre: { primary: string; secondary: string; primarySize: number };
};

export type DialRun = {
  /** The first tick's index round the whole ring. */
  firstIndex: number;
  centre: string;
  sides: string;
};

export type DialLabel = {
  x: number;
  anchor: Anchor;
  nameY: number;
  valueY: number;
  name: string;
  value: string;
};

export type LaidGroup = {
  key: string;
  start: number;
  end: number;
  today: boolean;
  /** Tick runs for the entrance, empty for a group of dots. */
  runs: DialRun[];
  dots: Point[];
  bead: Point | null;
  label: DialLabel | null;
};

export type DialGeometry = {
  groups: LaidGroup[];
  arc: { d: string; end: Point; over: boolean; cap: 'dot' | 'head' } | null;
  /** The pulsing head: today's tick tip, or the arc's end. */
  head: Point | null;
  pace: { at: Point; labelAt: Point; label: string } | null;
};

/** An arc that closes on itself draws nothing, so it stops just short. */
const ARC_MAX = 0.9999;
/** The allocation arc stops at 269.9°: just short of the top. */
const GROUPS_ARC_MAX = (269.9 + 90) / 360;

export function dialGeometry(config: DialConfig): DialGeometry {
  const { gap, spread } = config;
  const shown = config.groups.filter(g => g.ticks.length > 0);
  const count = shown.reduce((n, g) => n + g.ticks.length, 0);
  const step = count > 0 ? (360 - gap * shown.length) / count : 0;

  let angle = -90 + gap / 2;
  let index = 0;
  let ticksEnd = -90;
  let head: Point | null = null;
  const groups = shown.map((g): LaidGroup => {
    const start = angle;
    const end = start + step * g.ticks.length;
    const ticks: Tick[] = g.ticks.map((length, j) => ({
      angle: start + step * (j + 0.5),
      length,
    }));
    const firstIndex = index;
    index += ticks.length;
    angle = end + gap;

    const runs: DialRun[] = [];
    let dots: Point[] = [];
    if (g.dots) {
      dots = ticks.map(t => polar(look.dot.radius, t.angle));
    } else {
      ticksEnd = end;
      const per = look.tick.perLayer;
      for (let j = 0; j < ticks.length; j += per) {
        runs.push({
          firstIndex: firstIndex + j,
          ...tickPaths(ticks.slice(j, j + per), {
            inner: look.tick.inner,
            spread,
            side: look.tick.side,
          }),
        });
      }
      const last = ticks[ticks.length - 1]!;
      if (g.today) head = polar(look.tick.inner + last.length, last.angle);
    }

    const mid = (start + end) / 2;
    const [lx, ly] = polar(look.label.radius, mid);
    return {
      key: g.key,
      start,
      end,
      today: !!g.today,
      runs,
      dots,
      bead: config.beads ? polar(look.arc.radius, start - gap / 2) : null,
      label: g.label
        ? {
            x: lx,
            anchor: labelAnchor(mid).anchor,
            nameY: ly - 3,
            valueY: ly + 13,
            ...g.label,
          }
        : null,
    };
  });

  let arc: DialGeometry['arc'] = null;
  if (config.arc) {
    const { to, over, cap } = config.arc;
    const fraction =
      to === 'groups'
        ? Math.min((ticksEnd + 90) / 360, GROUPS_ARC_MAX)
        : Math.min(Math.max(to, 0), ARC_MAX);
    const endAngle = -90 + fraction * 360;
    arc = {
      d: arcPath(look.arc.radius, -90, endAngle),
      end: polar(look.arc.radius, endAngle),
      over,
      cap,
    };
    if (cap === 'head') head = arc.end;
  }

  let pace: DialGeometry['pace'] = null;
  if (config.pace) {
    const a = -90 + config.pace.at * 360;
    pace = {
      at: polar(look.arc.radius, a),
      labelAt: polar(look.pace.labelRadius, a),
      label: config.pace.label,
    };
  }

  return { groups, arc, head, pace };
}
