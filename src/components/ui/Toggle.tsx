import { useEffect } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';
import { touchSlop } from './touch';

const { knobShadow, durationMs, ...desktop } = tokens.controls.toggle;

/** The knob's left offset: 2px in from whichever end it rests at. */
export function knobLeft(on: boolean, mobile = false): number {
  const { width, height, knob } = mobile ? desktop.mobile : desktop;
  const inset = (height - knob) / 2;
  return on ? width - knob - inset : inset;
}

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

/**
 * The 34×20 switch (40×24 on mobile): ink with a lime knob when on, 14% ink with a white knob when
 * off. The knob slides on its left offset.
 */
export function Toggle({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  className,
  testID,
}: Props) {
  const mobile = Platform.OS === 'ios';
  const left = useSharedValue(knobLeft(value, mobile));
  useEffect(() => {
    left.value = withTiming(knobLeft(value, mobile), { duration: durationMs });
  }, [left, value, mobile]);
  const knobStyle = useAnimatedStyle(() => ({ left: left.value }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={touchSlop(24, 40)}
      className={cx(
        'h-toggle-h w-toggle-w rounded-full ios:h-toggle-h-mobile ios:w-toggle-w-mobile',
        value ? 'bg-ink' : 'bg-toggle-off',
        disabled && 'opacity-disabled',
        className,
      )}
    >
      <Animated.View
        testID="toggle-knob"
        className={cx(
          'absolute top-[2px] size-toggle-knob rounded-full ios:size-toggle-knob-mobile',
          value ? 'bg-lime' : 'bg-white',
        )}
        style={[{ boxShadow: knobShadow }, knobStyle]}
      />
    </Pressable>
  );
}
