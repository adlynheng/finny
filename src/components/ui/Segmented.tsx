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

/**
 * field: a form field's full-width switch (the transaction type, an interval).
 *   It takes its parent's width, so it belongs in a column, not a row.
 * compact: the in-card switches sized to their labels (List/Categories, the
 * transaction filter, Growth/Position, Positions/Watchlist/Portfolio).
 * nav: the desktop header's tab pill. Its tray is clear, since the header sets
 *   it in navPill glass; muted labels darken on hover.
 */
export type SegmentedSize = 'field' | 'compact' | 'nav';

const { selectedShadow, navShadow, slideMs } = tokens.controls.segmented;

/**
 * The tray (with its padding), each segment, the pill (rounded like a segment,
 * inset like the tray's padding), its shadow, and the label at rest.
 */
const sized: Record<
  SegmentedSize,
  {
    tray: string;
    segment: string;
    pill: string;
    shadow: string;
    text: string;
    muted: string;
  }
> = {
  field: {
    tray: 'self-stretch rounded-8 bg-segment-tray p-[3px] ios:rounded-10',
    segment: 'flex-1 rounded-6 py-[7px] ios:rounded-8 ios:py-[11px]',
    pill: 'bottom-[3px] top-[3px] rounded-6 ios:rounded-8',
    shadow: selectedShadow,
    text: 'text-[12px] ios:text-[13px]',
    muted: 'text-muted',
  },
  compact: {
    tray: 'self-start rounded-6 bg-segment-tray-soft p-[3px]',
    segment: 'rounded-4 px-[10px] py-[4px]',
    pill: 'bottom-[3px] top-[3px] rounded-4',
    shadow: selectedShadow,
    text: 'text-[12px]',
    muted: 'text-muted',
  },
  nav: {
    tray: 'p-[4px]',
    segment: 'group rounded-6 px-[16px] py-[7px]',
    pill: 'bottom-[4px] top-[4px] rounded-6',
    shadow: navShadow,
    text: 'text-[13px]',
    muted: 'text-muted group-hover:text-ink',
  },
};

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  size?: SegmentedSize;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

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
  size = 'field',
  value,
  onChange,
  disabled = false,
  className,
  testID,
}: Props<T>) {
  const look = sized[size];
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
        'flex-row gap-[2px]',
        look.tray,
        disabled && 'opacity-disabled',
        className,
      )}
    >
      {target && (
        <Animated.View
          testID="segment-pill"
          pointerEvents="none"
          className={cx('absolute bg-white', look.pill)}
          style={[{ boxShadow: look.shadow }, pillStyle]}
        />
      )}
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testID && `${testID}-${option.value}`}
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
            className={cx('items-center', look.segment)}
          >
            <Text
              className={cx(
                'font-sans',
                look.text,
                selected ? 'text-ink' : look.muted,
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
