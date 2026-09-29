/**
 * What Glass.tsx (iOS) and Glass.macos.tsx share: each recipe's class names and
 * shadow. Class names are written out in full so Tailwind can find them.
 */

import type { ViewProps } from 'react-native';
import { tokens, type GlassName } from '@/theme/tokens';

/**
 * Corner radii Glass can take. Glass needs its radius as a prop, not a
 * `rounded-*` class, because it rounds two views alike (see GlassBase).
 */
export const glassRadius = {
  4: 'rounded-4',
  5: 'rounded-5',
  6: 'rounded-6',
  7: 'rounded-7',
  8: 'rounded-8',
  9: 'rounded-9',
  10: 'rounded-10',
  12: 'rounded-12',
  14: 'rounded-14',
  /** 6px on desktop, 8px on mobile, as every card. */
  card: 'rounded-6 ios:rounded-8',
  /** The mobile sheet's top corners. */
  sheet: 'rounded-t-sheet',
  bottomPill: 'rounded-bottom-pill',
  full: 'rounded-full',
} as const;

export type GlassRadius = keyof typeof glassRadius;

export type GlassProps = Omit<ViewProps, 'style'> & {
  recipe: GlassName;
  /** Corner radius; square when omitted. Do not pass `rounded-*` in className. */
  radius?: GlassRadius;
  className?: string;
};

/** Each recipe's own fill. */
export const glassFill: Record<GlassName, string> = {
  chip: 'bg-glass-chip',
  navPill: 'bg-glass-nav-pill',
  card: 'bg-glass-card',
  onGradient: 'bg-glass-on-gradient',
  modal: 'bg-glass-modal',
  modalScrim: 'bg-glass-modal-scrim',
  sheet: 'bg-glass-sheet',
  sheetScrim: 'bg-glass-sheet-scrim',
  popover: 'bg-glass-popover',
  tooltip: 'bg-glass-tooltip',
  bottomBar: 'bg-glass-bottom-bar',
};

/** Each recipe's 1px hairline, or null for none. */
export const glassBorder: Record<GlassName, string | null> = {
  chip: 'border border-glass-chip-border',
  navPill: 'border border-glass-nav-pill-border',
  card: 'border border-glass-card-border',
  onGradient: 'border border-glass-on-gradient-border',
  modal: 'border border-glass-modal-border',
  modalScrim: null,
  sheet: null,
  sheetScrim: null,
  popover: 'border border-glass-popover-border',
  tooltip: 'border border-glass-tooltip-border',
  bottomBar: 'border border-glass-bottom-bar-border',
};

/**
 * The recipe's shadow as React Native's `boxShadow` style. This is the one
 * style prop in Glass: NativeWind 4 turns `box-shadow` into the legacy iOS
 * shadow props, keeping only the colour and one layer, so the design's shadows
 * (two layers on navPill) cannot be written as classes.
 */
export function glassShadow(recipe: GlassName) {
  const shadow = tokens.glass[recipe].shadow;
  return shadow ? { boxShadow: shadow } : undefined;
}
