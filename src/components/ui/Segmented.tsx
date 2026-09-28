import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type LayoutRectangle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';

export type SegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

const { selectedShadow, slideMs } = tokens.controls.segmented;

/**
 * The pill-in-a-tray switch: the transaction type picker, List/Categories,
 * Growth/Position, the range toggles, Trading's tabs and several drawer fields.
 * The selected segment has ink text over a white, softly shadowed pill; the
 * others are muted.
 *
 * The pill is one view behind the segments, not each segment's own fill, so it
 * can slide from the old selection to the new. It needs the segments' measured
 * positions, so it appears once they are laid out, already in place.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
  testID,
}: Props<T>) {
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
  const pillStyle = useAnimatedStyle(() => ({
    left: left.value,
    width: width.value,
  }));

  return (
    <View
      testID={testID}
      className={cx(
        'flex-row self-start rounded-8 bg-segment-tray p-[3px]',
        disabled && 'opacity-disabled',
        className,
      )}
    >
      {target && (
        <Animated.View
          testID="segment-pill"
          pointerEvents="none"
          className="absolute bottom-[3px] top-[3px] rounded-6 bg-white"
          style={[{ boxShadow: selectedShadow }, pillStyle]}
        />
      )}
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) {
                onChange(option.value);
              }
            }}
            onLayout={({ nativeEvent }) =>
              setLayouts(prev => ({
                ...prev,
                [option.value]: nativeEvent.layout,
              }))
            }
            className="items-center rounded-6 px-[12px] py-[5px]"
          >
            <Text
              className={cx(
                'font-sans text-[12px] font-medium',
                selected ? 'text-ink' : 'text-muted',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
