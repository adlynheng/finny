/**
 * The Positions and Watchlist tables' building blocks. Every row lays its
 * cells out through the same column template, so the header, body, expanded
 * sub-rows and totals stay aligned. Desktop only: on mobile the tables become
 * cards.
 */

import { Children, useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';
import type { ColumnTemplate } from './tableColumns';

/** What every row shares: the column gap and the 8px in from each edge. */
const rowFrame = 'flex-row gap-col px-table-x';

/**
 * Wraps each cell in its column. Throws when the count does not match the
 * template, since a missing cell shifts every column after it.
 */
function Cells({
  columns,
  children,
  first,
}: {
  columns: ColumnTemplate;
  children: ReactNode;
  /** Extra classes for the first column's wrapper. */
  first?: string;
}) {
  const cells = Children.toArray(children);
  if (cells.length !== columns.length) {
    throw new Error(
      `Table row: expected ${columns.length} cells, got ${cells.length}`,
    );
  }
  return cells.map((cell, i) => {
    const column = columns[i]!;
    return (
      <View
        key={i}
        testID="table-cell"
        className={cx(
          'min-w-0 justify-center',
          column.className,
          column.align === 'right' && 'items-end',
          i === 0 && first,
        )}
      >
        {cell}
      </View>
    );
  });
}

type RowProps = {
  columns: ColumnTemplate;
  children: ReactNode;
  testID?: string;
};

/** Column labels in 11px muted text. An empty label leaves its column blank. */
export function TableHeader({
  columns,
  labels,
  testID,
}: Omit<RowProps, 'children'> & { labels: string[] }) {
  return (
    <View testID={testID} className={cx(rowFrame, 'pb-[6px] pt-[10px]')}>
      <Cells columns={columns}>
        {labels.map((label, i) => (
          <Text key={i} className="font-sans text-[11px] text-muted">
            {label}
          </Text>
        ))}
      </Cells>
    </View>
  );
}

/**
 * A 44px body row under a hairline. It washes on hover when pressable, and
 * holds a stronger wash when selected (the row the chart is showing).
 */
export function TableRow({
  columns,
  children,
  onPress,
  selected = false,
  accessibilityLabel,
  testID,
}: RowProps & {
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      className={cx(
        rowFrame,
        'min-h-row items-center border-t border-row-border',
        selected ? 'bg-row-selected' : onPress && 'hover:bg-row-hover',
      )}
    >
      <Cells columns={columns}>{children}</Cells>
    </Pressable>
  );
}

/**
 * A body row that opens onto sub-rows (a holding's lots and sales). It draws
 * the chevron in the first column itself, so `children` holds one cell fewer
 * than the template. The chevron turns 90° as it opens, and the sub-rows sit
 * in a faintly tinted area under the row.
 */
export function ExpandableRow({
  columns,
  children,
  open,
  onToggle,
  subRows,
  selected = false,
  accessibilityLabel,
  testID,
}: RowProps & {
  open: boolean;
  onToggle: () => void;
  subRows: ReactNode;
  selected?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <View className="border-t border-row-border">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        className={cx(
          rowFrame,
          'min-h-row items-center',
          selected ? 'bg-row-selected' : 'hover:bg-row-hover',
        )}
      >
        <Cells columns={columns}>
          <Chevron open={open} />
          {children}
        </Cells>
      </Pressable>
      {open && (
        <View
          testID={testID && `${testID}-sub-area`}
          className="bg-sub-area pb-[6px]"
        >
          {subRows}
        </View>
      )}
    </View>
  );
}

/** The expand chevron in its small tray, turning 90° as its row opens. Mobile's is 22px. */
export function Chevron({ open }: { open: boolean }) {
  const angle = useSharedValue(open ? 90 : 0);
  useEffect(() => {
    angle.value = withTiming(open ? 90 : 0, {
      duration: tokens.table.expandMs,
    });
  }, [open, angle]);
  const turn = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  return (
    <View
      testID="row-chevron-box"
      className="size-chevron items-center justify-center rounded-5 bg-chevron-tray ios:size-[22px] ios:rounded-6"
    >
      <Animated.View testID="row-chevron" style={turn}>
        <Svg width={9} height={9} viewBox="0 0 10 10">
          <Path
            d="M3.5 2l3 3-3 3"
            stroke={tokens.colors.ink}
            strokeWidth={1.3}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * A 38px row inside an expanded row. The first column carries a vertical
 * connector line, so `children` holds one cell fewer than the template.
 */
export function SubRow({ columns, children, testID }: RowProps) {
  return (
    <View
      testID={testID}
      className={cx(rowFrame, 'min-h-sub-row items-center')}
    >
      <Cells columns={columns} first="self-stretch items-center">
        <View testID="sub-row-connector" className="w-px flex-1 bg-connector" />
        {children}
      </Cells>
    </View>
  );
}

/** The totals under the body, below a darker rule. */
export function TotalsRow({ columns, children, testID }: RowProps) {
  return (
    <View
      testID={testID}
      className={cx(
        rowFrame,
        'items-center border-t border-totals-border pb-[2px] pt-[8px]',
      )}
    >
      <Cells columns={columns}>{children}</Cells>
    </View>
  );
}

const numericSizes = {
  row: { primary: 'text-[13px]', secondary: 'text-[11px]' },
  sub: { primary: 'text-[12px]', secondary: 'text-[10px]' },
} as const;

const tones = {
  ink: 'text-ink',
  danger: 'text-danger',
  muted: 'text-muted',
  gain: 'text-gain',
} as const;

/**
 * A right-aligned money cell: the primary value (US$) over a muted secondary
 * (`(S$ …)`), in tabular figures. `note` is a percentage beside the primary,
 * muted unless `noteTone` says otherwise, and `lead` a mark before it (the
 * P&L column's lime dot).
 */
export function NumericCell({
  primary,
  secondary,
  note,
  lead,
  tone = 'ink',
  noteTone = 'muted',
  size = 'row',
}: {
  primary: string;
  secondary?: string;
  note?: string;
  lead?: ReactNode;
  tone?: keyof typeof tones;
  noteTone?: keyof typeof tones;
  size?: keyof typeof numericSizes;
}) {
  const sized = numericSizes[size];
  return (
    <View testID="numeric-cell" className="items-end gap-[1px]">
      <View
        testID="numeric-cell-line"
        className="flex-row items-center gap-[6px]"
      >
        {lead}
        <Text
          numberOfLines={1}
          className={cx('font-sans tabular-nums', sized.primary, tones[tone])}
        >
          {primary}
        </Text>
        {note && (
          <Text
            numberOfLines={1}
            className={cx('font-sans', sized.secondary, tones[noteTone])}
          >
            {note}
          </Text>
        )}
      </View>
      {secondary && (
        <Text
          numberOfLines={1}
          className={cx('font-sans tabular-nums text-muted', sized.secondary)}
        >
          {secondary}
        </Text>
      )}
    </View>
  );
}
