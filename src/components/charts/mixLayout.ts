/**
 * The Trading portfolio mix ring's layout, from the design's `mixRing()`
 * (the same on desktop and mobile): everything MixRing draws, in viewBox
 * units centred on the ring, computed from the instrument-type breakdown.
 */

import { formatKMoney } from '@/utils/format/money';
import { polar, tickRing, type Point, type RingGroup } from './geometry';

/** One instrument type's share of the portfolio. */
export type MixPart = {
  /** The instrument type: Stock, ETF or REIT. */
  key: string;
  /** Shown in the centre when the type is highlighted. */
  label: string;
  /** Market value in S$ cents. */
  cents: number;
};

export const MIX = {
  /** Half the viewBox. */
  half: 128,
  outerRing: 116,
  innerRing: 50,
  spinRing: 60,
  ticks: {
    count: 72,
    gap: 6,
    inner: 68,
    /** The side strokes' angular offset from the centre stroke. */
    spread: 0.8,
    /** Side strokes are this fraction of the centre stroke's length. */
    side: 0.8,
    /** Ticks per entrance layer. */
    perLayer: 4,
  },
  /** Group-start beads and the pulsing head sit on the outer ring. */
  bead: 116,
} as const;

/** Tick length by instrument type; any other type takes 22. */
const TICK_LENGTH: Record<string, number> = { Stock: 38, ETF: 28, REIT: 18 };
const DEFAULT_TICK_LENGTH = 22;

export type MixGroup = MixPart & RingGroup & { bead: Point };

/** The tick ring: each type's span, ticks and bead. Types with no value are left out. */
export function mixGroups(parts: readonly MixPart[]): MixGroup[] {
  const shown = parts.filter(p => p.cents > 0);
  const ring = tickRing(
    shown.map(p => p.cents),
    shown.map(p => TICK_LENGTH[p.key] ?? DEFAULT_TICK_LENGTH),
    MIX.ticks,
  );
  return shown.map((p, k) => {
    const group = ring[k]!;
    return {
      ...p,
      ...group,
      bead: polar(MIX.bead, group.start - MIX.ticks.gap / 2),
    };
  });
}

/**
 * The centre's two lines: the portfolio total in S$ over US$ (the US$ line
 * waits for the rate), or the highlighted type's share over its name.
 */
export function mixCentre(
  parts: readonly MixPart[],
  selected: string | null,
  usdSgdRate: number | null,
): { primary: string; secondary: string | null } {
  const total = parts.reduce((s, p) => s + Math.max(0, p.cents), 0);
  const sel = selected ? parts.find(p => p.key === selected) : undefined;
  if (sel && total > 0) {
    return {
      primary: `${Math.round((sel.cents / total) * 100)}%`,
      secondary: sel.label,
    };
  }
  return {
    primary: formatKMoney(total),
    secondary:
      usdSgdRate && usdSgdRate > 0
        ? formatKMoney(Math.round(total / usdSgdRate), { currency: 'USD' })
        : null,
  };
}
