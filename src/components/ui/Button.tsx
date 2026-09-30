import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { tokens, type ColorName } from '@/theme/tokens';
import { cx } from './cardChrome';

export type ButtonVariant =
  | 'primary'
  | 'ghost'
  | 'danger'
  | 'destructive'
  | 'outline'
  | 'soft'
  | 'light';

/**
 * md: a modal's actions (Save, Cancel, Delete). sm: a card's actions (Add
 * transaction, New goal) and Trading's row actions; on mobile a card's action
 * is a 38px touch target with a 13px label. touch: the mobile sheet's 48px
 * footer.
 */
export type ButtonSize = 'md' | 'sm' | 'touch';

type Props = {
  variant: ButtonVariant;
  size?: ButtonSize;
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
  {
    rest: string | null;
    hover: string;
    text: string;
    /** The label's hover, through the Pressable's `group`. */
    textHover?: string;
    icon: ColorName;
  }
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
  // The delete confirmation's Delete: filled with the danger colour.
  destructive: {
    rest: 'bg-danger',
    hover: 'hover:bg-destructive-hover',
    text: 'text-white',
    icon: 'white',
  },
  // Trading's Sell: fills with ink on hover, its label turning white.
  outline: {
    rest: 'border border-outline-border',
    hover: 'hover:border-ink hover:bg-ink',
    text: 'text-ink',
    textHover: 'group-hover:text-white',
    icon: 'ink',
  },
  // A panel's secondary action; the mobile sheet's Cancel.
  soft: {
    rest: 'bg-soft',
    hover: 'hover:bg-soft-hover',
    text: 'text-ink',
    icon: 'ink',
  },
  // White on a gradient card: an empty card's action (Add an account).
  light: {
    rest: 'bg-white',
    hover: 'hover:bg-light-hover',
    text: 'text-ink',
    icon: 'ink',
  },
};

/** Each size's corners and label size. */
const sized: Record<ButtonSize, { box: string; text: string }> = {
  md: { box: 'rounded-8', text: 'text-[13px]' },
  sm: {
    box: 'rounded-6 ios:h-[38px] ios:rounded-9',
    text: 'text-[12px] ios:text-[13px]',
  },
  touch: { box: 'h-action rounded-12 px-[16px]', text: 'text-[14px]' },
};

/** The design's padding differs by variant as well as size. */
const padding: Record<ButtonSize, Partial<Record<ButtonVariant, string>>> = {
  md: {
    primary: 'px-[18px] py-[10px]',
    ghost: 'px-[16px] py-[10px]',
    danger: 'px-[14px] py-[10px]',
    destructive: 'px-[18px] py-[10px]',
    outline: 'px-[16px] py-[10px]',
    soft: 'px-[16px] py-[10px]',
    light: 'px-[16px] py-[10px]',
  },
  sm: {
    primary: 'px-[12px] py-[8px] ios:px-[13px] ios:py-0',
    ghost: 'px-[12px] py-[8px]',
    danger: 'px-[12px] py-[8px]',
    destructive: 'px-[12px] py-[8px]',
    outline: 'h-[28px] px-[14px]',
    soft: 'px-[12px] py-[7px]',
    light: 'px-[13px] py-[8px] ios:py-0',
  },
  touch: {},
};

/**
 * Primary (ink, white text, lime icon), ghost (a 5% ink wash on hover),
 * danger text, destructive (danger fill, white text), outline (a hairline border that fills with ink on hover) and
 * soft (a faint ink fill) and light (white, on a gradient card). Disabled fades and neither presses nor hovers,
 * which the Ask Finny button relies on.
 */
export function Button({
  variant,
  size = 'md',
  label,
  onPress,
  icon,
  disabled = false,
  className,
  testID,
}: Props) {
  const { rest, hover, text, textHover, icon: iconColor } = look[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cx(
        'group flex-row items-center justify-center gap-[7px] self-start',
        sized[size].box,
        padding[size][variant],
        rest,
        // Left off when disabled, so a disabled button never lights up.
        disabled ? 'opacity-disabled' : hover,
        className,
      )}
    >
      {icon?.(tokens.colors[iconColor])}
      <Text
        className={cx(
          'font-sans',
          sized[size].text,
          text,
          !disabled && textHover,
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
