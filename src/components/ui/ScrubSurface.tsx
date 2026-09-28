import { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { HoverSurfaceProps } from './hoverTypes';

/**
 * A chart's pointer on a touch screen: a tap, or a sideways drag, reports
 * where the finger is, as a HoverSurface does for the mouse on macOS. A mostly
 * vertical drag is left to the page's scroll view. Lifting the finger leaves
 * the point where it was, as the design's mobile chart does (a touch never
 * "leaves"); the chart clears it itself.
 */
export function ScrubSurface({
  onHover,
  className,
  testID,
}: HoverSurfaceProps) {
  const size = useRef({ width: 0, height: 0 });
  const gesture = useMemo(() => {
    const report = (e: { x: number; y: number }) =>
      onHover({ x: e.x, y: e.y, ...size.current });
    const drag = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-10, 10])
      .runOnJS(true)
      .onStart(report)
      .onUpdate(report)
      .withTestId(`${testID ?? 'scrub'}-drag`);
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(report)
      .withTestId(`${testID ?? 'scrub'}-tap`);
    return Gesture.Race(drag, tap);
  }, [onHover, testID]);
  return (
    <GestureDetector gesture={gesture}>
      <View
        testID={testID}
        className={className ?? 'absolute inset-0'}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          size.current = { width, height };
        }}
      />
    </GestureDetector>
  );
}
