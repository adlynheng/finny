import { Children, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { cx } from './cardChrome';

type Props = {
  /**
   * CSS `repeat(auto-fill, minmax(<min>px, 1fr))`: as many equal columns as
   * fit at this width. Ignored when `columns` is given.
   */
  minColumnWidth?: number;
  /** A fixed number of columns. */
  columns?: number;
  /** Between columns, in points, for counting how many fit: the rows' `gap-x-*` draws it. */
  columnGap: number;
  /** Each row's classes: its `gap-x-*`, and a height when rows are fixed. */
  rowClassName?: string;
  /** The grid's own classes: its gap between rows. */
  className?: string;
  testID?: string;
  children: ReactNode;
};

/**
 * A CSS grid's auto-fill columns, which React Native lacks: the children are
 * laid out row by row in equal-width cells, as many to a row as fit the
 * measured width. A short last row keeps its cells' width.
 */
export function ResponsiveGrid({
  minColumnWidth = 0,
  columns,
  columnGap,
  rowClassName,
  className,
  testID,
  children,
}: Props) {
  const [width, setWidth] = useState(0);
  const count =
    columns ??
    Math.max(1, Math.floor((width + columnGap) / (minColumnWidth + columnGap)));
  const cells = Children.toArray(children);
  const rows = Array.from({ length: Math.ceil(cells.length / count) }, (_, r) =>
    cells.slice(r * count, (r + 1) * count),
  );
  return (
    <View
      testID={testID}
      className={className}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      {rows.map((row, r) => (
        <View
          key={r}
          testID="grid-row"
          className={cx('flex-row', rowClassName)}
        >
          {row.map((cell, c) => (
            <View key={c} className="min-w-0 flex-1">
              {cell}
            </View>
          ))}
          {Array.from({ length: count - row.length }, (_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}
