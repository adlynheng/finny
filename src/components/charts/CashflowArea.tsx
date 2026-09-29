/**
 * Personal Finance's cash-flow view, from the design's `cashflow()`: a solid
 * income line and a dashed expense line over a faint band between them, a
 * drop line under each month, and the month labels below. The selected month
 * (the hovered column, else the latest) carries a lime dot on income and an
 * outlined dot on expenses. Hovering (macOS) or tapping and dragging (iOS)
 * over a column selects its month.
 *
 * The screen owns the scale (`max`, the value at the top of the box) and hears
 * the hovered month at low priority, for its headline figures; the chart moves
 * its markers itself. It fills its parent: the plot, then the labels.
 */

import { memo, useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { ScrubSurface } from '@/components/ui/ScrubSurface';
import { cx } from '@/components/ui/cardChrome';
import type { HoverPoint } from '@/components/ui/hoverTypes';
import { tokens } from '@/theme/tokens';
import {
  CASHFLOW,
  cashflowGeometry,
  columnAt,
  type CashflowGeometry,
} from './flowLayout';
import { crosshairCursor, usePointerIndex } from './usePointerIndex';

const look = tokens.cashflow;
const { white } = tokens.colors;
const VIEWBOX = `0 0 ${CASHFLOW.width} ${CASHFLOW.height}`;
const pct = (fraction: number) => `${fraction * 100}%` as const;

type Props = {
  /** Oldest first, a value per month, as `labels`. */
  income: readonly number[];
  expense: readonly number[];
  /** The months' short names, under their columns. */
  labels: readonly string[];
  /** The value at the top of the plot: the screen's scale. */
  max: number;
  /** The hovered month as it changes, null when the pointer leaves. */
  onHover?: (index: number | null) => void;
  /** The mobile labels (9 points against 10). */
  compact?: boolean;
  testID?: string;
};

export function CashflowArea({
  income,
  expense,
  labels,
  max,
  onHover,
  compact = false,
  testID = 'cashflow',
}: Props) {
  const geo = useMemo(
    () => cashflowGeometry(income, expense, max),
    [income, expense, max],
  );
  const { n } = geo;
  const toMonth = useCallback(
    (p: HoverPoint) => columnAt(p.x, p.width, n),
    [n],
  );
  // A new range starts on the latest month, as the design's range switch.
  const { index: hover, onHover: onPoint } = usePointerIndex(
    toMonth,
    onHover,
    String(n),
  );
  const hot = hover !== null && hover < n ? hover : null;
  const sel = hot ?? n - 1;

  return (
    <View testID={testID} className="flex-1">
      <View className="relative flex-1" style={crosshairCursor()}>
        <Drops geo={geo} hot={hot} testID={testID} />
        <Lines geo={geo} testID={testID} />
        {sel >= 0 && (
          <>
            <View
              testID={`${testID}-income-dot`}
              pointerEvents="none"
              className="absolute -ml-[4.5px] -mt-[4.5px] size-[9px] rounded-full bg-lime"
              style={{
                left: pct(geo.lefts[sel]!),
                top: pct(geo.incomeTops[sel]!),
              }}
            />
            <View
              testID={`${testID}-expense-dot`}
              pointerEvents="none"
              className="absolute -ml-1 -mt-1 size-2 rounded-full border-[1.5px] border-white"
              style={{
                left: pct(geo.lefts[sel]!),
                top: pct(geo.expenseTops[sel]!),
              }}
            />
          </>
        )}
        <ScrubSurface
          testID={`${testID}-scrub`}
          className="absolute inset-0"
          onHover={onPoint}
        />
      </View>
      <View className="mt-[6px] flex-row">
        {labels.map((l, i) => (
          <Text
            key={`${l}-${i}`}
            testID={`${testID}-label-${i}`}
            className={cx(
              'flex-1 text-center font-sans text-white',
              compact ? 'text-[9px]' : 'text-[10px]',
              i !== sel && 'opacity-75',
            )}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** The month drop lines, under the band: the hovered one brighter. */
function Drops({
  geo,
  hot,
  testID,
}: {
  geo: CashflowGeometry;
  hot: number | null;
  testID: string;
}) {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg
        width="100%"
        height="100%"
        viewBox={VIEWBOX}
        preserveAspectRatio="none"
      >
        {geo.drops.map(([x, y], i) => (
          <Line
            key={i}
            testID={`${testID}-drop-${i}`}
            x1={x}
            x2={x}
            y1={CASHFLOW.height}
            y2={y}
            stroke={white}
            strokeOpacity={i === hot ? look.drop.hotOpacity : look.drop.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </Svg>
    </View>
  );
}

/** The band and both lines, drawn once per series: hover never repaints them. */
const Lines = memo(function Lines({
  geo,
  testID,
}: {
  geo: CashflowGeometry;
  testID: string;
}) {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg
        width="100%"
        height="100%"
        viewBox={VIEWBOX}
        preserveAspectRatio="none"
      >
        <Path
          testID={`${testID}-band`}
          d={geo.band}
          fill={white}
          fillOpacity={look.band.opacity}
        />
        <Path
          testID={`${testID}-income`}
          d={geo.income}
          fill="none"
          stroke={white}
          strokeWidth={look.income.width}
          vectorEffect="non-scaling-stroke"
        />
        <Path
          testID={`${testID}-expense`}
          d={geo.expense}
          fill="none"
          stroke={white}
          strokeOpacity={look.expense.opacity}
          strokeWidth={look.expense.width}
          strokeDasharray={look.expense.dash}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </View>
  );
});
