import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';
import { useSlidingPill } from './useSlidingPill';

export type SegmentOption<T extends string> = { value: T; label: string };

/**
 * field: a form field's full-width switch (an interval, a drawer field). It
 *   takes its parent's width, so it belongs in a column, not a row.
 * type: the transaction form's Expense / Deposit / Transfer switch, a field
 *   a step larger on desktop (13px labels, 8px padding).
 * compact: the in-card switches sized to their labels (List/Categories, the
 * transaction filter). Mobile's are larger touch targets on a darker tray.
 * mode: Trading's Growth / Position switch, compact on the darker tray. It
 *   takes the row's alignment, so it centres beside the heading and picker.
 * range: Trading's 1M–1Y toggle, a step smaller, centred in its row too; on
 *   mobile it spans the page.
 * tabs: Trading's Positions / Watchlist / Portfolio, a step larger; on mobile
 *   it spans the panel.
 * nav: the desktop header's tab pill. Its tray is clear, since the header sets
 *   it in navPill glass; muted labels darken on hover.
 * onGradient: white on a gradient card (the history card's range toggle). Its
 *   tray is clear too, set in onGradientTray glass; the pill is a white wash.
 *   Mobile's segments are larger touch targets.
 */
export type SegmentedSize =
  | 'field'
  | 'type'
  | 'compact'
  | 'mode'
  | 'range'
  | 'tabs'
  | 'nav'
  | 'onGradient';

const { selectedShadow, navShadow } = tokens.controls.segmented;

/**
 * The tray (with its padding), each segment, the pill (rounded like a segment,
 * inset like the tray's padding, and its fill), its shadow, and the label
 * selected and at rest.
 */
const sized: Record<
  SegmentedSize,
  {
    tray: string;
    segment: string;
    pill: string;
    shadow: string | null;
    text: string;
    selected: string;
    muted: string;
  }
> = {
  field: {
    tray: 'self-stretch rounded-8 bg-segment-tray p-[3px] ios:rounded-10',
    segment: 'flex-1 rounded-6 py-[7px] ios:rounded-8 ios:py-[11px]',
    pill: 'bottom-[3px] top-[3px] rounded-6 bg-white ios:rounded-8',
    shadow: selectedShadow,
    text: 'text-[12px] ios:text-[13px]',
    selected: 'text-ink',
    muted: 'text-muted',
  },
  type: {
    tray: 'self-stretch rounded-8 bg-segment-tray p-[3px] ios:rounded-10',
    segment: 'flex-1 rounded-6 py-[8px] ios:rounded-8 ios:py-[11px]',
    pill: 'bottom-[3px] top-[3px] rounded-6 bg-white ios:rounded-8',
    shadow: selectedShadow,
    text: 'text-[13px]',
    selected: 'text-ink',
    muted: 'text-muted',
  },
  compact: {
    tray: 'self-start rounded-6 bg-segment-tray-soft p-[3px] ios:rounded-8 ios:bg-segment-tray',
    segment:
      'rounded-4 px-[10px] py-[4px] ios:rounded-6 ios:px-[11px] ios:py-[8px]',
    pill: 'bottom-[3px] top-[3px] rounded-4 bg-white ios:rounded-6',
    shadow: selectedShadow,
    text: 'text-[12px]',
    selected: 'text-ink',
    muted: 'text-muted',
  },
  mode: {
    tray: 'rounded-6 bg-segment-tray p-[3px] ios:rounded-8',
    segment:
      'rounded-4 px-[10px] py-[4px] ios:rounded-6 ios:px-[11px] ios:py-[8px]',
    pill: 'bottom-[3px] top-[3px] rounded-4 bg-white ios:rounded-6',
    shadow: selectedShadow,
    text: 'text-[12px]',
    selected: 'text-ink',
    muted: 'text-muted',
  },
  range: {
    tray: 'rounded-6 bg-segment-tray p-[3px] ios:self-stretch ios:rounded-8',
    segment:
      'rounded-4 px-[9px] py-[4px] ios:flex-1 ios:rounded-6 ios:px-[11px] ios:py-[8px]',
    pill: 'bottom-[3px] top-[3px] rounded-4 bg-white ios:rounded-6',
    shadow: selectedShadow,
    text: 'text-[11px] ios:text-[12px]',
    selected: 'text-ink',
    muted: 'text-muted',
  },
  tabs: {
    tray: 'self-start rounded-6 bg-segment-tray-soft p-[3px] ios:self-stretch ios:rounded-8 ios:bg-segment-tray',
    segment:
      'rounded-4 px-[12px] py-[5px] ios:flex-1 ios:rounded-6 ios:px-[11px] ios:py-[8px]',
    pill: 'bottom-[3px] top-[3px] rounded-4 bg-white ios:rounded-6',
    shadow: selectedShadow,
    text: 'text-[13px] ios:text-[12px]',
    selected: 'text-ink',
    muted: 'text-muted',
  },
  nav: {
    tray: 'p-[4px]',
    segment: 'group rounded-6 px-[16px] py-[7px]',
    pill: 'bottom-[4px] top-[4px] rounded-6 bg-white',
    shadow: navShadow,
    text: 'text-[13px]',
    selected: 'text-ink',
    muted: 'text-muted group-hover:text-ink',
  },
  onGradient: {
    tray: 'p-[3px]',
    segment:
      'rounded-4 px-[9px] py-[4px] ios:rounded-6 ios:px-[11px] ios:py-[7px]',
    pill: 'bottom-[3px] top-[3px] rounded-4 bg-white/[.34] ios:rounded-6',
    shadow: null,
    text: 'text-[11px] ios:text-[12px]',
    selected: 'text-white',
    muted: 'text-white',
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
  const pill = useSlidingPill(value);

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
      {pill.ready && (
        <Animated.View
          testID="segment-pill"
          pointerEvents="none"
          className={cx('absolute', look.pill)}
          style={[look.shadow && { boxShadow: look.shadow }, pill.style]}
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
            onLayout={pill.measure(option.value)}
            className={cx('items-center', look.segment)}
          >
            <Text
              className={cx(
                'font-sans',
                look.text,
                selected ? look.selected : look.muted,
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
