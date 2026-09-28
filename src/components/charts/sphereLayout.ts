/**
 * The net-worth sphere's layout, from the design's `sphere()` in
 * FinnyOverview.dc.html: everything the Sphere draws, in viewBox units centred
 * on the sphere, computed once from the asset-class breakdown.
 */

import { formatKMoney } from '@/utils/format/money';
import {
  arcPath,
  distributeTicks,
  labelAnchor,
  polar,
  tickPaths,
  type Anchor,
  type Point,
  type Tick,
} from './geometry';
import { textWidth } from './textWidth';

export type SphereClass = { key: string; label: string; cents: number };

export const SPHERE = {
  radius: 170,
  meridians: 10,
  latitudes: 13,
  /** A latitude's height as a fraction of its width. */
  latitudeFlatten: 0.17,
  /** Rings outside the sphere. */
  spinRing: 188,
  outerRing: 252,
  ticks: {
    count: 96,
    gap: 5,
    inner: 198,
    /** The side strokes' angular offset from the centre stroke. */
    spread: 0.7,
    /** Side strokes are this fraction of the centre stroke's length. */
    side: 0.8,
    /** Ticks per entrance layer (see Sphere's TickLayer). */
    perLayer: 4,
  },
  hit: { radius: 222, width: 60 },
  bead: 252,
  label: {
    radius: 272,
    nameSize: 12,
    valueSize: 19,
    percentSize: 12,
    /** Space between the value and its percentage. */
    percentGap: 6,
  },
  /** Half the viewBox: the desktop leaves room for labels, mobile has none. */
  half: { labels: 360, compact: 262 },
} as const;

/** Tick length by class label; the design has none for Other, which takes Cash's. */
const TICK_LENGTH: Record<string, number> = {
  Cash: 30,
  CPF: 22,
  Investments: 44,
  Property: 36,
};
const DEFAULT_TICK_LENGTH = 30;

/**
 * The dashed circle's radius: the sphere scaled by the square root of oldest
 * over newest net worth, so their areas compare. Null when either is not
 * positive, where the ratio means nothing.
 */
export function referenceRadius(
  oldestCents: number,
  newestCents: number,
): number | null {
  if (oldestCents <= 0 || newestCents <= 0) return null;
  return SPHERE.radius * Math.sqrt(oldestCents / newestCents);
}

export type Latitude = { key: string; y: number; rx: number; ry: number };

/**
 * Thirteen latitude ellipses, bottom to top, each taking the class whose
 * cumulative share its height falls within.
 */
export function latitudes(classes: readonly SphereClass[]): Latitude[] {
  const total = classes.reduce((s, c) => s + c.cents, 0);
  let cum = 0;
  const bounds = classes.map(c => ({
    key: c.key,
    c: (cum += c.cents / total),
  }));
  const R = SPHERE.radius;
  return Array.from({ length: SPHERE.latitudes }, (_, j) => {
    const f = (j + 0.5) / SPHERE.latitudes;
    const phi = -Math.PI / 2 + f * Math.PI;
    const rx = R * Math.cos(phi);
    // Floating-point sums can leave the last bound a hair under 1.
    const key = (bounds.find(b => f <= b.c) ?? bounds[bounds.length - 1])!.key;
    return { key, y: -R * Math.sin(phi), rx, ry: rx * SPHERE.latitudeFlatten };
  });
}

export type { Tick } from './geometry';

/** A few adjacent ticks, drawn and animated in as one layer. */
export type TickChunk = {
  /** The first tick's index round the whole ring: its entrance stagger. */
  firstIndex: number;
  centre: string;
  sides: string;
};

export type ClassLabel = {
  x: number;
  anchor: Anchor;
  dy: number;
  /** Baselines, nudge included. */
  nameY: number;
  valueY: number;
  /** The value and percentage are drawn as two texts from these lefts. */
  valueX: number;
  percentX: number;
  /** The label's bounds, for hover. */
  box: { left: number; right: number; top: number; bottom: number };
};

export type TickGroup = SphereClass & {
  start: number;
  end: number;
  firstIndex: number;
  tickLength: number;
  ticks: Tick[];
  chunks: TickChunk[];
  hitPath: string;
  bead: Point;
  value: string;
  percent: string;
  /** Where the label goes. */
  labelAt: ClassLabel;
};

function classLabel(
  mid: number,
  value: string,
  percent: string,
  name: string,
): ClassLabel {
  const L = SPHERE.label;
  const [x, y] = polar(L.radius, mid);
  const { anchor, dy } = labelAnchor(mid);
  const valueW = textWidth(value, L.valueSize, 'light');
  const run = valueW + L.percentGap + textWidth(percent, L.percentSize);
  const at = (w: number) =>
    anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  const valueX = at(run);
  const nameW = textWidth(name, L.nameSize);
  const nameY = y - 5 + dy;
  const valueY = y + 14 + dy;
  return {
    x,
    anchor,
    dy,
    nameY,
    valueY,
    valueX,
    percentX: valueX + valueW + L.percentGap,
    box: {
      left: Math.min(at(nameW), valueX),
      right: Math.max(at(nameW) + nameW, valueX + run),
      top: nameY - L.nameSize,
      bottom: valueY + 4,
    },
  };
}

/** The tick ring: each class's span, ticks, hit arc, bead and label. */
export function tickGroups(classes: readonly SphereClass[]): TickGroup[] {
  const total = classes.reduce((s, c) => s + c.cents, 0);
  const { count, gap, perLayer } = SPHERE.ticks;
  const layout = distributeTicks(
    classes.map(c => c.cents),
    { count, gap },
  );
  let index = 0;
  return classes.map((c, k) => {
    const group = layout.groups[k]!;
    const firstIndex = index;
    const tickLength = TICK_LENGTH[c.label] ?? DEFAULT_TICK_LENGTH;
    const ticks = group.ticks.map((angle, j) => ({
      angle,
      length:
        tickLength * (0.84 + 0.16 * Math.sin((firstIndex + j) * 1.9 + j * 0.7)),
    }));
    index += ticks.length;
    const chunks: TickChunk[] = [];
    for (let j = 0; j < ticks.length; j += perLayer) {
      chunks.push({
        firstIndex: firstIndex + j,
        ...tickPaths(ticks.slice(j, j + perLayer), SPHERE.ticks),
      });
    }
    const value = formatKMoney(c.cents);
    const percent = `${Math.round((c.cents / total) * 100)}%`;
    return {
      ...c,
      start: group.start,
      end: group.end,
      firstIndex,
      tickLength,
      ticks,
      chunks,
      hitPath: arcPath(SPHERE.hit.radius, group.start, group.end),
      bead: polar(SPHERE.bead, group.start - gap / 2),
      value,
      percent,
      labelAt: classLabel(
        (group.start + group.end) / 2,
        value,
        percent,
        c.label,
      ),
    };
  });
}

export type SphereGeometry = {
  /** Half the viewBox's side: it runs from -half to half on both axes. */
  half: number;
  labels: boolean;
  latitudes: Latitude[];
  groups: TickGroup[];
};

/** The whole layout. Classes with no value are left out. */
export function sphereGeometry(
  classes: readonly SphereClass[],
  { labels }: { labels: boolean },
): SphereGeometry {
  const shown = classes.filter(c => c.cents > 0);
  return {
    half: labels ? SPHERE.half.labels : SPHERE.half.compact,
    labels,
    latitudes: latitudes(shown),
    groups: tickGroups(shown),
  };
}

/**
 * The class under a point in viewBox units, as the design's hover targets
 * decide it: a class's hit arc (60 wide at 222, over its span) and, when
 * labels show, its label.
 */
export function classAt(
  geo: SphereGeometry,
  x: number,
  y: number,
): string | null {
  const r = Math.hypot(x, y);
  const { radius, width } = SPHERE.hit;
  if (Math.abs(r - radius) <= width / 2) {
    // Angles run from -90 (the top) clockwise to 270.
    let a = (Math.atan2(y, x) * 180) / Math.PI;
    if (a < -90) a += 360;
    const hit = geo.groups.find(g => a >= g.start && a <= g.end);
    if (hit) return hit.key;
  }
  if (geo.labels) {
    const hit = geo.groups.find(
      ({ labelAt: { box } }) =>
        x >= box.left && x <= box.right && y >= box.top && y <= box.bottom,
    );
    if (hit) return hit.key;
  }
  return null;
}
