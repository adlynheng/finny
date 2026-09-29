import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';

const { slideMs } = tokens.controls.segmented;

/**
 * A selection pill that slides between options: Segmented's and the mobile tab bar's. Each option
 * reports its layout through `measure(key)`; the pill is one view behind them, absolutely placed
 * at the selected option's left and width. It appears once that option is measured, already in
 * place, and slides from then on.
 */
export function useSlidingPill<T extends string>(value: T) {
  const [layouts, setLayouts] = useState<Partial<Record<T, LayoutRectangle>>>(
    {},
  );
  const target = layouts[value];

  const left = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!target) {
      return;
    }
    if (placed.current) {
      left.value = withTiming(target.x, { duration: slideMs });
      width.value = withTiming(target.width, { duration: slideMs });
    } else {
      left.value = target.x;
      width.value = target.width;
      placed.current = true;
    }
  }, [left, width, target]);
  const style = useAnimatedStyle(() => ({
    left: left.value,
    width: width.value,
  }));

  const measure =
    (key: T) =>
    ({ nativeEvent }: LayoutChangeEvent) =>
      setLayouts(prev => ({ ...prev, [key]: nativeEvent.layout }));

  return { ready: target !== undefined, style, measure };
}
