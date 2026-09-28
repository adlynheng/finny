import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  /** A leading icon, drawn in the colour the chip's text takes. */
  icon?: (color: string) => ReactNode;
  /** Shown but not choosable, e.g. the transfer source among the destinations. */
  dimmed?: boolean;
};

type Props<T extends string> = {
  options: readonly ChipOption<T>[];
  /** The selected chip, or null for none. */
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

/**
 * A wrapping row of choice chips: accounts, destinations and categories in the
 * forms. The selected chip is ink with white text, the others white with ink.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
  testID,
}: Props<T>) {
  return (
    <View
      testID={testID}
      className={cx(
        'flex-row flex-wrap gap-[6px]',
        disabled && 'opacity-disabled',
        className,
      )}
    >
      {options.map(option => {
        const selected = option.value === value;
        const inactive = disabled || option.dimmed === true;
        const color = selected ? tokens.colors.white : tokens.colors.ink;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled: inactive }}
            disabled={inactive}
            onPress={() => onChange(option.value)}
            className={cx(
              'flex-row items-center gap-[6px] rounded-7 px-[11px] py-[7px]',
              selected ? 'bg-ink' : 'bg-white',
              option.dimmed && 'opacity-dimmed',
            )}
          >
            {option.icon?.(color)}
            <Text
              className={cx(
                'font-sans text-[12px] font-medium',
                selected ? 'text-white' : 'text-ink',
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
