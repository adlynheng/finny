/**
 * The designs' `fnReveal` and `trReveal`: a clip that opens left to right.
 * React Native has no clip-path, so a clipping view slides in from the left
 * while its content slides the other way by as much, holding the drawing still
 * under an edge that sweeps across. Both are transforms, so the reveal stays
 * on the compositor. It plays once per mount; a chart remounts it (by key) for
 * a new series.
 */

import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme/motion';
import type { MotionName } from '@/theme/tokens';

type Props = {
  /** The width to sweep across, measured by the chart; the reveal waits for it. */
  width: number;
  /** Which of the designs' reveals: their durations differ. */
  name: Extract<MotionName, 'fnReveal' | 'trReveal'>;
  animate: boolean;
  testID: string;
  children: React.ReactNode;
};

export function Reveal({ width, name, animate, testID, children }: Props) {
  const shown = useSharedValue(animate ? 0 : 1);
  const measured = width > 0;

  useEffect(() => {
    if (!animate || !measured) return;
    const { durationMs, easing } = motion[name];
    shown.value = withTiming(1, {
      duration: durationMs,
      easing: easing === 'linear' ? Easing.linear : Easing.bezier(...easing),
    });
  }, [animate, measured, name, shown]);

  const clip = useAnimatedStyle(
    () => ({ transform: [{ translateX: -width * (1 - shown.value) }] }),
    [width],
  );
  const content = useAnimatedStyle(
    () => ({ transform: [{ translateX: width * (1 - shown.value) }] }),
    [width],
  );

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      className="absolute inset-0 overflow-hidden"
      style={clip}
    >
      <Animated.View
        testID={`${testID}-content`}
        className="absolute inset-0"
        style={content}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
