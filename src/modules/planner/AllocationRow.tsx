import { memo, useCallback, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { cx } from '@/components/ui/cardChrome';
import { noFocusRing } from '@/components/ui/Input';
import { tokens } from '@/theme/tokens';
import { typedAllocation } from '@/utils/derive/plan';
import { formatAmount } from '@/utils/format/money';
import { AllocationTrack } from './AllocationTrack';

/**
 * One allocation: its name and share of gross, the drag track, and a typed
 * amount. The two stay coupled: dragging sets the amount (and drops anything
 * half-typed); typing sets it at once, clamped to gross income and five
 * digits, and blurring (or Enter) commits and shows it formatted again.
 * Hovering or focusing the row tints it and highlights its part of the dial.
 *
 * Desktop lays the three out in a row; mobile puts the name beside the field
 * with a taller track under them.
 */
export const AllocationRow = memo(function AllocationRow({
  id,
  name,
  cents,
  grossCents,
  highlighted,
  onHighlight,
  onChange,
}: {
  /** The dial group it highlights; also its testIDs' stem. */
  id: string;
  name: string;
  cents: number;
  grossCents: number;
  highlighted: boolean;
  onHighlight: (on: boolean) => void;
  onChange: (cents: number) => void;
}) {
  // What is typed while the field has focus; null shows the amount formatted.
  const [draft, setDraft] = useState<string | null>(null);
  const mobile = Platform.OS === 'ios';
  const percent = grossCents > 0 ? Math.round((cents / grossCents) * 100) : 0;

  const label = (
    <View className="min-w-0 gap-y-[1px] ios:flex-1">
      <Text
        numberOfLines={1}
        className="font-sans text-[14px] text-ink ios:text-[15px]"
      >
        {name}
      </Text>
      <Text
        testID={`plan-${id}-percent`}
        className="font-sans text-[11px] text-muted"
      >
        {percent}% of gross
      </Text>
    </View>
  );
  const field = (
    <View className="h-[34px] w-[124px] flex-row items-center gap-x-[4px] rounded-6 border border-ink/[.12] bg-white px-[10px] ios:h-[42px] ios:rounded-10 ios:px-[12px]">
      <Text className="font-sans text-[13px] text-muted">S$</Text>
      <TextInput
        testID={`plan-${id}-amount`}
        accessibilityLabel={`${name} amount`}
        value={
          // Once the amount moves on (Reset, a drag), what was typed no longer shows.
          draft !== null && typedAllocation(draft, grossCents).cents === cents
            ? draft
            : formatAmount(cents)
        }
        onFocus={() => {
          setDraft(String(Math.round(cents / 100)));
          onHighlight(true);
        }}
        onChangeText={text => {
          const typed = typedAllocation(text, grossCents);
          setDraft(typed.text);
          onChange(typed.cents);
        }}
        onBlur={() => {
          setDraft(null);
          onHighlight(false);
        }}
        keyboardType="number-pad"
        returnKeyType="done"
        {...noFocusRing}
        className="min-w-0 flex-1 p-0 text-right font-sans text-[15px] tabular-nums text-ink"
        placeholderTextColor={tokens.colors.muted2}
      />
    </View>
  );
  const onDrag = useCallback(
    (value: number) => {
      setDraft(null);
      onChange(value);
    },
    [onChange],
  );
  const track = (
    <View className="min-w-0 flex-1 ios:flex-none">
      <AllocationTrack
        testID={`plan-${id}-track`}
        label={name}
        cents={cents}
        onChange={onDrag}
      />
    </View>
  );

  return (
    <Pressable
      testID={`plan-${id}`}
      // Hover only: the row's controls take the presses.
      accessible={false}
      onHoverIn={() => onHighlight(true)}
      onHoverOut={() => onHighlight(false)}
      className={cx(
        '-mx-[8px] rounded-8 px-[8px]',
        mobile
          ? 'gap-y-[2px] pb-[4px] pt-[8px]'
          : 'flex-row items-center gap-x-[18px] py-[5px]',
        highlighted && 'bg-white/55',
      )}
    >
      {mobile ? (
        <View className="flex-row items-center gap-x-[12px]">
          {label}
          {field}
        </View>
      ) : (
        <>
          <View className="w-[150px]">{label}</View>
          {track}
          {field}
        </>
      )}
      {mobile && track}
    </Pressable>
  );
});
