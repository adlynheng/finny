import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { cx } from '@/components/ui/cardChrome';
import { tokens } from '@/theme/tokens';
import {
  SLIDER_MAX_CENTS,
  sliderCents,
  sliderFraction,
} from '@/utils/derive/plan';

/** The knob's lime dot, ringed in faint ink. */
const KNOB_RING = { boxShadow: `0 0 0 1px ${tokens.colors.ink}40` };

/**
 * An allocation's drag track: a hairline with an ink fill to the amount, an
 * end tick, and a lime knob. Pressing anywhere on it sets the amount there and
 * dragging follows, snapped to S$50, and keeps following outside the track
 * until release. The gesture runs on the UI thread and moves the fill and
 * knob there, so they keep up with the pointer however long the page takes to
 * re-render. React hears only of a changed snapped amount.
 *
 * On iOS a drag only starts sideways, so a vertical swipe still scrolls the
 * page; a tap sets the amount where it lands.
 */
export function AllocationTrack({
  cents,
  onChange,
  label,
  testID,
}: {
  cents: number;
  onChange: (cents: number) => void;
  /** Read out with the amount, e.g. `Investments`. */
  label: string;
  testID: string;
}) {
  const mobile = Platform.OS === 'ios';
  const width = useSharedValue(0);
  const last = useSharedValue(-1);
  // Where the fill ends, 0–1. The drag sets it; otherwise it follows `cents`.
  const fraction = useSharedValue(sliderFraction(cents));
  const dragging = useSharedValue(false);
  useEffect(() => {
    if (!dragging.value) {
      fraction.value = sliderFraction(cents);
    }
  }, [cents, dragging, fraction]);

  // The gesture keeps one callback for its lifetime, so a re-render mid-drag
  // never swaps its handlers; it reaches the latest onChange through a ref.
  const latest = useRef(onChange);
  latest.current = onChange;
  const report = useCallback((value: number) => latest.current(value), []);

  const gesture = useMemo(() => {
    const set = (x: number) => {
      'worklet';
      if (width.value <= 0) {
        return;
      }
      const value = sliderCents(x / width.value);
      fraction.value = value / SLIDER_MAX_CENTS;
      if (value !== last.value) {
        last.value = value;
        scheduleOnRN(report, value);
      }
    };
    const drag = Gesture.Pan()
      .shouldCancelWhenOutside(false)
      .onStart(e => {
        dragging.value = true;
        last.value = -1;
        set(e.x);
      })
      .onUpdate(e => set(e.x))
      .onFinalize(() => {
        dragging.value = false;
      })
      .withTestId(`${testID}-drag`);
    if (!mobile) {
      // The mouse: the press itself starts the drag.
      return drag.minDistance(0);
    }
    const tap = Gesture.Tap()
      .onEnd(e => {
        last.value = -1;
        set(e.x);
      })
      .withTestId(`${testID}-tap`);
    return Gesture.Race(drag.activeOffsetX([-4, 4]).failOffsetY([-8, 8]), tap);
  }, [dragging, fraction, last, mobile, report, testID, width]);

  // The fill's length and the knob's place: animated, so not a class.
  // One style per view: Reanimated binds an animated style to a single view.
  const fillAt = useAnimatedStyle(() => ({
    width: `${fraction.value * 100}%`,
  }));
  const knobAt = useAnimatedStyle(() => ({
    width: `${fraction.value * 100}%`,
  }));
  return (
    <GestureDetector gesture={gesture}>
      <View
        testID={testID}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        className="h-[28px] ios:h-[36px]"
        // The macOS pointer, as the design's `cursor:pointer`.
        style={mobile ? undefined : ({ cursor: 'pointer' } as object)}
        onLayout={e => {
          width.value = e.nativeEvent.layout.width;
        }}
      >
        <View className="absolute inset-x-0 top-[13.5px] h-px bg-ink/[.18] ios:top-[17.5px]" />
        <Animated.View
          testID={`${testID}-fill`}
          className="absolute left-0 top-[13px] h-[2px] bg-ink ios:top-[17px]"
          style={fillAt}
        />
        <View className="absolute right-0 top-[10px] h-[8px] w-px bg-ink/30 ios:top-[14px]" />
        {/* The knob hangs from the fill's end, centred on it. */}
        <Animated.View className="absolute inset-y-0 left-0" style={knobAt}>
          <View
            className={cx(
              'absolute items-center justify-center rounded-full bg-lime/35',
              '-right-[9px] top-[5px] size-[18px] ios:-right-[12px] ios:top-[6px] ios:size-[24px]',
            )}
          >
            <View
              className="size-[8px] rounded-full bg-lime ios:size-[10px]"
              style={KNOB_RING}
            />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
