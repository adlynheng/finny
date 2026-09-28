/**
 * The Overview's net-worth history, from the design's `hist()` in
 * FinnyOverview.dc.html (and FinnyMobile.html): four cumulative bands — cash,
 * + investments, + CPF, net — as smoothed white lines, with three echo strands
 * between each neighbouring pair, revealed left to right. Hovering (macOS) or
 * dragging (iOS) snaps a crosshair to the nearest month and shows its figures.
 *
 * The 1000 × 400 viewBox stretches to fill the chart's box, so strokes keep
 * their width with `non-scaling-stroke` (Phase A spike, rule 4), and anything
 * that must not stretch — the edge labels, the dots, the tooltip — is laid out
 * over the SVG by fraction of the box.
 *
 * The chart fills its parent, plus a right gutter for the edge labels (50
 * points on desktop, 56 on mobile, as the design's margins).
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Glass } from '@/components/ui/Glass';
import { ScrubSurface } from '@/components/ui/ScrubSurface';
import { cx } from '@/components/ui/cardChrome';
import type { HoverPoint } from '@/components/ui/hoverTypes';
import { tokens } from '@/theme/tokens';
import type { HistoryPoint } from '@/utils/derive/networth';
import {
  HISTORY,
  historyGeometry,
  historyTip,
  indexAt,
  type HistoryTip,
  type Strand,
} from './historyLayout';
import { Reveal } from './Reveal';

const look = tokens.history;
const { white } = tokens.colors;
const VIEWBOX = `0 0 ${HISTORY.width} ${HISTORY.height}`;
const pct = (fraction: number) => `${fraction * 100}%` as const;

type Props = {
  /** Oldest first: the months to plot. A new range (length) replays the reveal. */
  points: readonly HistoryPoint[];
  /** The mobile layout: tooltip above the chart, no class mix. */
  compact?: boolean;
  /** False draws the chart revealed: for tests and screenshots. */
  animate?: boolean;
  testID?: string;
};

export function MultiStrandLine({
  points,
  compact = false,
  animate = true,
  testID = 'history',
}: Props) {
  const geo = useMemo(() => historyGeometry(points), [points]);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  // A new range starts without a crosshair, as the design's range switch does.
  useEffect(() => setHover(null), [geo.n]);

  const onHover = useCallback(
    (p: HoverPoint | null) => setHover(p ? indexAt(p.x, p.width, geo.n) : null),
    [geo.n],
  );
  const tip = hover === null ? null : historyTip(points, geo, hover);

  return (
    <View
      testID={testID}
      className={cx('flex-1', compact ? 'pr-[56px]' : 'pr-[50px]')}
    >
      <View
        className="relative flex-1"
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        <Reveal
          key={geo.n}
          width={width}
          name="fnReveal"
          animate={animate}
          testID={`${testID}-reveal`}
        >
          <Strands strands={geo.strands} testID={testID} />
        </Reveal>
        {tip && <Crosshair left={tip.left} testID={`${testID}-crosshair`} />}
        {geo.labels.map(l => (
          <Text
            key={l.text}
            testID={`${testID}-label-${l.text}`}
            className="absolute left-full -mt-[7px] ml-[10px] font-sans text-[10px] leading-[14px] text-white"
            style={{ top: pct(l.top), opacity: l.opacity }}
          >
            {l.text}
          </Text>
        ))}
        <View
          testID={`${testID}-end`}
          pointerEvents="none"
          className="absolute left-full -ml-[7px] -mt-[7px] h-[14px] w-[14px] items-center justify-center rounded-full bg-lime/35"
          style={{ top: pct(geo.endTop) }}
        >
          <View className="h-[7px] w-[7px] rounded-full bg-lime" />
        </View>
        {tip && <Tooltip tip={tip} compact={compact} testID={testID} />}
        <ScrubSurface
          testID={`${testID}-scrub`}
          className="absolute -bottom-[10px] -top-[10px] left-0 right-0"
          onHover={onHover}
        />
      </View>
    </View>
  );
}

/**
 * The thirteen strands in one SVG, drawn once per series: hover never
 * repaints them.
 */
const Strands = memo(function Strands({
  strands,
  testID,
}: {
  strands: readonly Strand[];
  testID: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={VIEWBOX}
      preserveAspectRatio="none"
    >
      {strands.map((s, i) => (
        <Path
          key={i}
          testID={`${testID}-strand-${i}`}
          d={s.d}
          fill="none"
          stroke={white}
          strokeOpacity={s.opacity}
          strokeWidth={s.width}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </Svg>
  );
});

/** The dashed line at the hovered month, full height. */
function Crosshair({ left, testID }: { left: number; testID: string }) {
  const x = left * HISTORY.width;
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <Svg
        width="100%"
        height="100%"
        viewBox={VIEWBOX}
        preserveAspectRatio="none"
      >
        <Line
          testID={testID}
          x1={x}
          x2={x}
          y1={0}
          y2={HISTORY.height}
          stroke={white}
          strokeOpacity={look.crosshair.opacity}
          strokeDasharray={look.crosshair.dash}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </View>
  );
}

/**
 * The white dot on the net line and the glass tooltip, 12 points beside the
 * crosshair and flipping to its left past 60%: at the top of the chart on
 * desktop, above it on mobile. The tooltip hangs from a zero-width anchor at the crosshair
 * inside a wide box, so it sizes to its text wherever the crosshair is.
 */
function Tooltip({
  tip,
  compact,
  testID,
}: {
  tip: HistoryTip;
  compact: boolean;
  testID: string;
}) {
  return (
    <>
      <View
        testID={`${testID}-dot`}
        pointerEvents="none"
        className="absolute -ml-[4.5px] -mt-[4.5px] h-[9px] w-[9px] rounded-full bg-white"
        style={{ left: pct(tip.left), top: pct(tip.top) }}
      />
      <View
        pointerEvents="none"
        className="absolute bottom-0 top-0 w-0"
        style={{ left: pct(tip.left) }}
      >
        <View
          testID={`${testID}-tip-box`}
          className={cx(
            'absolute w-[400px]',
            compact ? 'bottom-full mb-[6px]' : 'top-0',
            tip.flip ? 'right-[12px] items-end' : 'left-[12px] items-start',
          )}
        >
          <Glass
            testID={`${testID}-tip`}
            recipe="tooltip"
            radius={6}
            className={cx(
              'px-[10px]',
              compact ? 'gap-y-[2px] py-[7px]' : 'gap-y-[3px] py-2',
            )}
          >
            <Text className="font-sans text-[11px] text-white opacity-85">
              {tip.month}
            </Text>
            <Text
              testID={`${testID}-tip-net`}
              className={cx(
                'font-sans text-white',
                compact ? 'text-[16px]' : 'text-[17px]',
              )}
            >
              {tip.net}
            </Text>
            {!compact && (
              <Text className="font-sans text-[11px] text-white opacity-85">
                {tip.mix}
              </Text>
            )}
          </Glass>
        </View>
      </View>
    </>
  );
}
