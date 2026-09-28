import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';

const { width, height, knob, durationMs } = tokens.controls.toggle;
const inset = (height - knob) / 2;

/** The knob's left offset: 2px in from whichever end it rests at. */
export function knobLeft(on: boolean): number {
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
 * The 34×20 switch: ink with a lime knob when on, 14% ink with a white knob when
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
  const left = useSharedValue(knobLeft(value));
  useEffect(() => {
    left.value = withTiming(knobLeft(value), { duration: durationMs });
  }, [left, value]);
  const knobStyle = useAnimatedStyle(() => ({ left: left.value }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      className={cx(
        'h-toggle-h w-toggle-w rounded-full',
        value ? 'bg-ink' : 'bg-toggle-off',
        disabled && 'opacity-disabled',
        className,
      )}
    >
      <Animated.View
        testID="toggle-knob"
        className={cx(
          'absolute top-[2px] size-toggle-knob rounded-full',
          value ? 'bg-lime' : 'bg-white',
        )}
        style={knobStyle}
      />
    </Pressable>
  );
}
