import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import {
  formatMonthShort,
  shiftMonth,
  type MonthKey,
} from '@/utils/format/date';
import { cx } from './cardChrome';
import { Glass } from './Glass';

type Tone = 'plain' | 'onGradient';

type Props = {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
  /** The earliest and latest months it steps to; its arrows fade at each. */
  min: MonthKey;
  max: MonthKey;
  /** plain on a glass card (Transactions), onGradient on a gradient one (the calendar). */
  tone?: Tone;
  testID?: string;
};

const look: Record<Tone, { button: string; label: string; chevron: string }> = {
  plain: {
    button: 'h-[22px] w-[22px] hover:bg-white',
    label: 'min-w-[52px] px-[4px] text-ink',
    chevron: tokens.colors.ink,
  },
  onGradient: {
    button: 'h-[22px] w-[24px] hover:bg-white/20',
    label: 'min-w-[56px] px-[6px] text-white',
    chevron: tokens.colors.white,
  },
};

const chevronSize = Platform.OS === 'ios' ? 10 : 9;

/**
 * `‹ Sep 2026 ›` in a small tray: the Transactions card's month and the
 * payments calendar's. It steps a month at a time within `min` and `max`.
 * Mobile's arrows are 34 × 32, and reach past their edges to a 44-point
 * touch target.
 */
export function MonthStepper({
  month,
  onChange,
  min,
  max,
  tone = 'plain',
  testID = 'month-stepper',
}: Props) {
  const l = look[tone];
  const arrows = (
    <>
      <Arrow
        testID={`${testID}-prev`}
        label="Previous month"
        path="M6.5 2L3.5 5l3 3"
        disabled={month <= min}
        onPress={() => onChange(shiftMonth(month, -1))}
        className={l.button}
        color={l.chevron}
      />
      <Text
        testID={`${testID}-label`}
        className={cx(
          'text-center font-sans text-[11px] ios:min-w-[56px] ios:px-[4px] ios:text-[12px]',
          l.label,
        )}
      >
        {formatMonthShort(month, { year: true })}
      </Text>
      <Arrow
        testID={`${testID}-next`}
        label="Next month"
        path="M3.5 2l3 3-3 3"
        disabled={month >= max}
        onPress={() => onChange(shiftMonth(month, 1))}
        className={l.button}
        color={l.chevron}
      />
    </>
  );
  const tray = 'flex-row items-center gap-[2px] p-[3px]';
  return tone === 'onGradient' ? (
    <Glass
      testID={testID}
      recipe="onGradientTray"
      radius={Platform.OS === 'ios' ? 8 : 6}
      className={tray}
    >
      {arrows}
    </Glass>
  ) : (
    <View
      testID={testID}
      className={cx(
        tray,
        'rounded-6 bg-nav-tray ios:rounded-8 ios:bg-segment-tray',
      )}
    >
      {arrows}
    </View>
  );
}

function Arrow({
  label,
  path,
  disabled,
  onPress,
  className,
  color,
  testID,
}: {
  label: string;
  path: string;
  disabled: boolean;
  onPress: () => void;
  className: string;
  color: string;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Platform.OS === 'ios' ? 6 : undefined}
      className={cx(
        'items-center justify-center rounded-4 ios:h-[32px] ios:w-[34px] ios:rounded-6',
        className,
        disabled && 'opacity-dimmed',
      )}
    >
      <Svg width={chevronSize} height={chevronSize} viewBox="0 0 10 10">
        <Path d={path} stroke={color} strokeWidth={1.3} fill="none" />
      </Svg>
    </Pressable>
  );
}
