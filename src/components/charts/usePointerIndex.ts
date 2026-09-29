/**
 * A chart's pointed-at index (a day, a month), followed straight from its
 * HoverSurface / ScrubSurface. The chart draws from it at once; the screen
 * hears about each new index at low priority (a transition), so the chart
 * never waits for the screen to re-render whatever else follows the hover
 * (Task 43: a page-level re-render cost ~100 ms a step in Debug).
 */

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, type ViewStyle } from 'react-native';
import type { HoverPoint } from '@/components/ui/hoverTypes';

export function usePointerIndex(
  /** The index under a point. */
  toIndex: (p: HoverPoint) => number,
  /** Told each new index, and null when the pointer leaves. */
  onChange: ((index: number | null) => void) | undefined,
  /** A new key (a new series or range) forgets the index. */
  resetKey: string,
) {
  const [index, setIndex] = useState<number | null>(null);
  const reported = useRef<number | null>(null);

  useEffect(() => {
    setIndex(null);
    reported.current = null;
  }, [resetKey]);

  const onHover = useCallback(
    (p: HoverPoint | null) => {
      const i = p ? toIndex(p) : null;
      setIndex(i);
      if (i === reported.current) return;
      reported.current = i;
      if (onChange) startTransition(() => onChange(i));
    },
    [toIndex, onChange],
  );

  return { index, onHover };
}

// NativeWind has no cursor classes; react-native-macos adds a cursor rect for
// this style (its Fabric view knows 'crosshair', though React Native's types
// only list 'auto' and 'pointer'). iOS has no pointer to style.
const CROSSHAIR = { cursor: 'crosshair' } as unknown as ViewStyle;

/** The design's `cursor: crosshair` over a chart, on macOS. */
export const crosshairCursor = () =>
  Platform.OS === 'macos' ? CROSSHAIR : undefined;
