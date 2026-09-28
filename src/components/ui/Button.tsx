import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { tokens, type ColorName } from '@/theme/tokens';
import { cx } from './cardChrome';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

type Props = {
  variant: ButtonVariant;
  label: string;
  onPress: () => void;
  /** A leading icon, drawn in the colour the variant gives it. */
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

/**
 * Each variant's fill at rest and on hover (NativeWind's `hover:`, from the
 * pointer on macOS and an iPad), its text, and its icon colour.
 */
const look: Record<
  ButtonVariant,
  { rest: string | null; hover: string; text: string; icon: ColorName }
> = {
  primary: {
    rest: 'bg-ink',
    hover: 'hover:bg-ink-hover',
    text: 'text-white',
    icon: 'lime',
  },
  ghost: {
    rest: null,
    hover: 'hover:bg-ghost-hover',
    text: 'text-ink',
    icon: 'ink',
  },
  // The Delete actions.
  danger: {
    rest: null,
    hover: 'hover:bg-danger-hover',
    text: 'text-danger',
    icon: 'danger',
  },
};

/**
 * Primary (ink, white text, lime icon), ghost (transparent, a 5% ink wash on
 * hover) and danger text buttons. Disabled fades and neither presses nor
 * hovers, which the Ask Finny button relies on.
 */
export function Button({
  variant,
  label,
  onPress,
  icon,
  disabled = false,
  className,
  testID,
}: Props) {
  const { rest, hover, text, icon: iconColor } = look[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cx(
        'flex-row items-center justify-center gap-[6px] self-start rounded-8 px-[14px] py-[8px]',
        rest,
        // Left off when disabled, so a disabled button never lights up.
        disabled ? 'opacity-disabled' : hover,
        className,
      )}
    >
      {icon?.(tokens.colors[iconColor])}
      <Text className={cx('font-sans text-[13px] font-medium', text)}>
        {label}
      </Text>
    </Pressable>
  );
}
