import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';

type Props = Omit<TextInputProps, 'style' | 'editable'> & {
  /** Shown above the field, and read out as the field's name. */
  label: string;
  /** Muted text before the value, e.g. `S$`. */
  prefix?: string;
  /** Muted text after the value, e.g. `%`. */
  suffix?: string;
  disabled?: boolean;
  className?: string;
};

// macOS draws a focus ring around a focused TextInput; the design has none.
// The prop is react-native-macos's own, so it is not in the iOS types.
const noFocusRing = { enableFocusRing: false } as object;

/**
 * The form text field: a white, hairline-outlined box, 40px tall with 8px
 * corners on desktop and 44px with 10px on mobile, under a small muted label.
 */
export function Input({
  label,
  prefix,
  suffix,
  disabled = false,
  className,
  ...rest
}: Props) {
  return (
    <View className={cx('gap-[6px]', className)}>
      <Text className="font-sans text-[12px] text-muted">{label}</Text>
      <View
        testID="input-box"
        className={cx(
          'h-input flex-row items-center gap-[6px] rounded-8 border border-input-border bg-white px-[12px] ios:h-input-touch ios:rounded-10',
          disabled && 'opacity-disabled',
        )}
      >
        {prefix && (
          <Text className="font-sans text-[13px] text-muted">{prefix}</Text>
        )}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={tokens.colors.muted2}
          editable={!disabled}
          {...noFocusRing}
          {...rest}
          className="min-w-0 flex-1 p-0 font-sans text-[14px] text-ink ios:text-[15px]"
        />
        {suffix && (
          <Text className="font-sans text-[13px] text-muted">{suffix}</Text>
        )}
      </View>
    </View>
  );
}
