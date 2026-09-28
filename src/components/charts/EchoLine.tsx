/**
 * Trading's P&L chart, from the design's `chart()`: an ink line with six
 * offset copies fading downward behind it, a dashed zero line when the series
 * crosses zero, revealed left to right. Eight sample dots sit along the line;
 * hovering (macOS) or dragging (iOS) moves a crosshair and a lime halo to the
 * nearest day, and fills the sample dot there.
 *
 * The screen owns the scale (the value-to-y mapper, in the 100-unit viewBox);
 * the chart owns the drawing. The chart follows the pointer itself and tells
 * the screen the day at low priority (a transition), so the crosshair never
 * waits for the screen to re-render its headline and strip. The screen can
 * also point at a day (a hovered strip sample), shown while the pointer is
 * off the chart.
 *
 * On macOS the pointer is a crosshair over the chart, as in the design.
 */

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { ScrubSurface } from '@/components/ui/ScrubSurface';
import { cx } from '@/components/ui/cardChrome';
import type { HoverPoint } from '@/components/ui/hoverTypes';
import { tokens } from '@/theme/tokens';
import {
  ECHO_BOX,
  echoPaths,
  indexAt,
  sampleIndices,
  type EchoPaths,
  type YMapper,
} from './lineLayout';
import { xAt } from './historyLayout';
import { Reveal } from './Reveal';

const look = tokens.echo;
const { ink } = tokens.colors;
const VIEWBOX = `0 0 ${ECHO_BOX} ${ECHO_BOX}`;
const pct = (fraction: number) => `${fraction * 100}%` as const;
// NativeWind has no cursor classes; react-native-macos adds a cursor rect for
// this style (its Fabric view knows 'crosshair', though React Native's types
// only list 'auto' and 'pointer'). iOS has no pointer to style.
const CROSSHAIR = { cursor: 'crosshair' } as unknown as ViewStyle;

type Props = {
  /** Oldest first: the days to plot. */
  values: readonly number[];
  /** A value's y in the 100-unit viewBox, 0 at the top: the screen's scale. */
  y: YMapper;
  /**
   * A day the screen points at from elsewhere (a hovered strip sample), or
   * null. Not the day onHover reports: the chart already shows that.
   */
  hover?: number | null;
  /** The day under the pointer as it changes, null when it leaves. */
  onHover: (index: number | null) => void;
  /** A new key replays the reveal: the design's range, mode and symbol. */
  revealKey?: string;
  /** False draws the chart revealed: for tests and screenshots. */
  animate?: boolean;
  testID?: string;
};

export function EchoLine({
  values,
  y,
  hover = null,
  onHover,
  revealKey,
  animate = true,
  testID = 'echo',
}: Props) {
  const n = values.length;
  const paths = useMemo(() => echoPaths(values, y), [values, y]);
  const [width, setWidth] = useState(0);
  const [pointer, setPointer] = useState<number | null>(null);
  const reported = useRef<number | null>(null);
  const seriesKey = revealKey ?? String(n);

  // A new series starts without a pointer day, as the design's range switch.
  useEffect(() => {
    setPointer(null);
    reported.current = null;
  }, [seriesKey]);

  const onPoint = useCallback(
    (p: HoverPoint | null) => {
      const i = p ? indexAt(p.x, p.width, n) : null;
      setPointer(i);
      if (i === reported.current) return;
      reported.current = i;
      startTransition(() => onHover(i));
    },
    [n, onHover],
  );
  const day = pointer ?? hover;
  const hot = day !== null && day < n ? day : null;
  const at = (i: number) => ({
    left: pct(xAt(i, n)),
    top: pct(y(values[i]!) / ECHO_BOX),
  });

  return (
    <View
      testID={testID}
      className="relative flex-1"
      style={Platform.OS === 'macos' ? CROSSHAIR : undefined}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      <Reveal
        key={seriesKey}
        width={width}
        name="trReveal"
        animate={animate}
        testID={`${testID}-reveal`}
      >
        <Lines paths={paths} testID={testID} />
      </Reveal>
      {sampleIndices(n).map(i => (
        <View
          key={i}
          testID={`${testID}-sample-${i}`}
          pointerEvents="none"
          className={cx(
            'absolute rounded-full border border-ink',
            i === hot
              ? 'size-[9px] -ml-[4.5px] -mt-[4.5px] bg-lime'
              : 'size-[7px] -ml-[3.5px] -mt-[3.5px] bg-canvas',
          )}
          style={at(i)}
        />
      ))}
      {hot !== null && (
        <>
          <View
            testID={`${testID}-crosshair`}
            pointerEvents="none"
            className="absolute bottom-0 top-0 w-px bg-ink/25"
            style={{ left: at(hot).left }}
          />
          <View
            testID={`${testID}-halo`}
            pointerEvents="none"
            className="absolute size-[22px] -ml-[11px] -mt-[11px] items-center justify-center rounded-full bg-lime/45"
            style={at(hot)}
          >
            <View className="size-2 rounded-full bg-ink" />
          </View>
        </>
      )}
      <ScrubSurface
        testID={`${testID}-scrub`}
        className="absolute inset-0"
        onHover={onPoint}
      />
    </View>
  );
}

/** The line, its echoes and the zero line in one SVG: hover never repaints them. */
const Lines = memo(function Lines({
  paths,
  testID,
}: {
  paths: EchoPaths;
  testID: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={VIEWBOX}
      preserveAspectRatio="none"
    >
      {paths.zeroY !== null && (
        <Line
          testID={`${testID}-zero`}
          x1={0}
          x2={ECHO_BOX}
          y1={paths.zeroY}
          y2={paths.zeroY}
          stroke={ink}
          strokeOpacity={look.zeroLine.opacity}
          strokeWidth={look.zeroLine.width}
          strokeDasharray={look.zeroLine.dash}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {paths.echoes.map((e, k) => (
        <Path
          key={k}
          testID={`${testID}-echo-${k}`}
          d={e.d}
          fill="none"
          stroke={ink}
          strokeOpacity={e.opacity}
          strokeWidth={look.echoes.width}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <Path
        testID={`${testID}-line`}
        d={paths.line}
        fill="none"
        stroke={ink}
        strokeOpacity={look.line.opacity}
        strokeWidth={look.line.width}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
});
