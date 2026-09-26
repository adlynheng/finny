/**
 * The design's CSS keyframe animations in Reanimated terms, derived from
 * `tokens.motion` so the timings exist in one place.
 *
 * Use with Reanimated as:
 *   withRepeat(withTiming(to, { duration: durationMs, easing: Easing.bezier(...easing) }), repeat, reverse)
 * with `Easing.linear` when `easing` is 'linear'. `repeat` follows withRepeat:
 * -1 is infinite.
 */

import { tokens, type MotionName, type MotionToken } from './tokens';

export type Bezier = [number, number, number, number];

export type MotionSpec = {
  durationMs: number;
  easing: Bezier | 'linear';
  repeat: number;
  reverse: boolean;
  /** Delay per element index; negative starts that element partway through the cycle. */
  staggerMs: number;
  from: Record<string, number>;
  to: Record<string, number>;
};

/** CSS `ease-in-out`. Reanimated's Easing.inOut(Easing.ease) is a different curve. */
const EASE_IN_OUT: Bezier = [0.42, 0, 0.58, 1];

function toEasing(easing: MotionToken['easing']): MotionSpec['easing'] {
  if (easing === 'linear') {
    return 'linear';
  }
  if (easing === 'ease-in-out') {
    return EASE_IN_OUT;
  }
  const points = easing
    .slice('cubic-bezier('.length, -1)
    .split(',')
    .map(Number);
  if (points.length !== 4 || points.some(Number.isNaN)) {
    throw new Error(`Unparseable easing: ${easing}`);
  }
  return points as Bezier;
}

function toSpec(token: MotionToken): MotionSpec {
  return {
    durationMs: token.durationMs,
    easing: toEasing(token.easing),
    repeat: token.iterations === 'infinite' ? -1 : token.iterations,
    reverse: token.direction === 'alternate',
    staggerMs: token.staggerMs,
    from: token.from,
    to: token.to,
  };
}

export const motion = Object.fromEntries(
  Object.entries(tokens.motion).map(([name, token]) => [name, toSpec(token)]),
) as Record<MotionName, MotionSpec>;
