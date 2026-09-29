/**
 * The pieces both DatePicker implementations share: their props, and the
 * field that opens the calendar. Only where the calendar appears differs by
 * platform.
 */

import type { Ref } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { formatFullDate } from '@/utils/format/date';
import { cx } from './cardChrome';

export type DatePickerProps = {
  /** Shown above the field, and read out as its name. */
  label?: string;
  /** `YYYY-MM-DD`, or null when nothing is chosen yet. */
  value: string | null;
  onChange: (date: string) => void;
  className?: string;
};

const iconSize = Platform.OS === 'ios' ? 14 : 13;

/** The label above the field, as an Input has. */
export function DateFieldLabel({ label }: { label: string }) {
  return <Text className="font-sans text-[12px] text-muted">{label}</Text>;
}

/**
 * A white, hairline-outlined box the size of a text Input, showing the date
 * in full (`Thu, 24 Sep 2026`) beside a calendar icon. Its border darkens
 * while the calendar is open.
 */
export function DateFieldButton({
  ref,
  label,
  value,
  open,
  onPress,
}: {
  ref?: Ref<View>;
  label: string;
  value: string | null;
  open: boolean;
  onPress: () => void;
}) {
  const text = value ? formatFullDate(value) : 'Pick a date';
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text }}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      className={cx(
        'h-input flex-row items-center justify-between gap-[8px] rounded-8 border bg-white px-[12px] ios:h-input-touch ios:rounded-10',
        open ? 'border-input-open-border' : 'border-input-border',
      )}
    >
      <Text
        numberOfLines={1}
        className="shrink font-sans text-[14px] text-ink ios:text-[15px]"
      >
        {text}
      </Text>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none">
        <Rect
          x={2.5}
          y={3.5}
          width={11}
          height={10}
          rx={2}
          stroke={tokens.colors.muted}
          strokeWidth={1.2}
        />
        <Path
          d="M2.5 6.5h11M5.5 2v3M10.5 2v3"
          stroke={tokens.colors.muted}
          strokeWidth={1.2}
        />
      </Svg>
    </Pressable>
  );
}
