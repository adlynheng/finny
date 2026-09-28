import type { HoverSurfaceProps } from './hoverTypes';

/**
 * Pointer tracking for chart hover. iOS has no pointer to follow: charts take
 * their selection from taps and chips instead, so this draws nothing.
 */
export function HoverSurface(_props: HoverSurfaceProps) {
  return null;
}
