/**
 * The moving parts the sphere, the radial dials and the rings share, layered per the
 * Phase A spike rules (report §3): react-native-svg repaints a whole <Svg>
 * when any child changes, so everything that moves on its own is its own <Svg>
 * inside an Animated.View, and only the view animates.
 *
 * Every layer fills a square chart whose viewBox runs from −half to half.
 */

import { useEffect, type ComponentProps, type ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { motion, type MotionSpec } from '@/theme/motion';
import { tokens } from '@/theme/tokens';
import type { TickChunk } from './geometry';
import { useEased } from './useEased';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { ink, lime } = tokens.colors;
const look = tokens.sphere;

export const easing = (spec: MotionSpec) =>
  spec.easing === 'linear' ? Easing.linear : Easing.bezier(...spec.easing);

/** A fraction as a percentage for a style. */
export const pct = (fraction: number): `${number}%` => `${fraction * 100}%`;

/**
 * A full-size layer over the chart, never taking touches. With `bleed`, the
 * layer reaches that fraction of the chart's size past each edge, for
 * drawing that overhangs the chart (outside labels): iOS clips an <Svg> to
 * its box.
 */
export function Layer({
  half,
  bleed = 0,
  style,
  children,
  testID,
}: {
  half: number;
  bleed?: number;
  style?: ComponentProps<typeof Animated.View>['style'];
  children: ReactNode;
  testID?: string;
}) {
  const h = half * (1 + 2 * bleed);
  // Percentages of the parent's width all round; the chart is square.
  const out = bleed > 0 ? pct(-bleed) : undefined;
  const box = out && { top: out, left: out, right: out, bottom: out };
  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      className="absolute inset-0"
      style={box ? [box, style] : style}
    >
      <Svg width="100%" height="100%" viewBox={`${-h} ${-h} ${h * 2} ${h * 2}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** A run of ticks: its centre and side strokes as two paths. */
export type TickRun = { centre: string; sides: string };

/**
 * fnGrow: a run of ticks scales .6 → 1 about the chart's centre and fades in,
 * after `delayMs`. Stroke opacities come in as shared values so a highlight
 * can ease them.
 */
export function TickLayer({
  run,
  half,
  animate,
  delayMs,
  centre,
  side,
  centreWidth,
  idPrefix,
  idKey,
}: {
  run: TickRun;
  half: number;
  animate: boolean;
  delayMs: number;
  centre: SharedValue<number>;
  side: SharedValue<number>;
  centreWidth: number;
  /** Test ids: `<prefix>-ticks-<key>`, and `-centres-`/`-sides-` for its paths. */
  idPrefix: string;
  idKey: string;
}) {
  const spec = motion.fnGrow;
  const grow = useSharedValue(animate ? 0 : 1);
  // The entrance plays once, on mount: a layer that stays mounted while its
  // ticks move (a dial re-dealt by a slider) keeps them drawn.
  useEffect(() => {
    if (!animate) return;
    grow.value = withDelay(
      delayMs,
      withTiming(1, { duration: spec.durationMs, easing: easing(spec) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const from = spec.from.scale!;
  const style = useAnimatedStyle(() => ({
    opacity: grow.value,
    transform: [{ scale: from + (1 - from) * grow.value }],
  }));
  const sideProps = useAnimatedProps(() => ({ strokeOpacity: side.value }));
  const centreProps = useAnimatedProps(() => ({ strokeOpacity: centre.value }));
  const t = look.tick;
  return (
    <Layer half={half} style={style} testID={`${idPrefix}-ticks-${idKey}`}>
      <AnimatedPath
        testID={`${idPrefix}-sides-${idKey}`}
        d={run.sides}
        fill="none"
        stroke={ink}
        strokeWidth={t.side.width}
        strokeLinecap="round"
        animatedProps={sideProps}
      />
      <AnimatedPath
        testID={`${idPrefix}-centres-${idKey}`}
        d={run.centre}
        fill="none"
        stroke={ink}
        strokeWidth={centreWidth}
        strokeLinecap="round"
        animatedProps={centreProps}
      />
    </Layer>
  );
}

/**
 * A group's standing when one may be highlighted: `on` unless another group
 * is, `hot` when it is the one.
 */
export const emphasis = (key: string, selected: string | null) => ({
  on: !selected || selected === key,
  hot: selected === key,
});

/**
 * One group's ticks round a ring, as the sphere and the portfolio mix draw
 * them: the highlighted group's strokes darker and heavier, everyone else's at
 * `dim` of rest, easing between. Each run grows in on fnGrow, staggered 12 ms
 * a tick round the ring.
 */
export function RingTicks({
  groupKey,
  chunks,
  selected,
  dim,
  half,
  animate,
  idPrefix,
}: {
  groupKey: string;
  chunks: readonly TickChunk[];
  selected: string | null;
  /** Other groups' strokes, as a multiplier of rest. */
  dim: number;
  half: number;
  animate: boolean;
  idPrefix: string;
}) {
  const { on, hot } = emphasis(groupKey, selected);
  const t = look.tick;
  const k = on ? 1 : dim;
  const centre = useEased(
    (hot ? t.centre.hotOpacity : t.centre.opacity) * k,
    t.transitionMs,
  );
  const side = useEased(
    (hot ? t.side.hotOpacity : t.side.opacity) * k,
    t.transitionMs,
  );
  return (
    <>
      {chunks.map((chunk, index) => (
        <TickLayer
          key={chunk.firstIndex}
          run={chunk}
          half={half}
          animate={animate}
          delayMs={chunk.firstIndex * motion.fnGrow.staggerMs}
          centre={centre}
          side={side}
          centreWidth={hot ? t.centre.hotWidth : t.centre.width}
          idPrefix={idPrefix}
          idKey={`${groupKey}-${index}`}
        />
      ))}
    </>
  );
}

type RingStroke = { opacity: number; width: number; dash: string };

/**
 * fnSpin: a dashed ring that turns once every two minutes, in the sphere's
 * ink stroke unless given another colour, stroke and spin.
 */
export function SpinRing({
  half,
  radius,
  animate,
  testID,
  color = ink,
  stroke = look.spinRing,
  spec = motion.fnSpin,
}: {
  half: number;
  radius: number;
  animate: boolean;
  testID: string;
  color?: string;
  stroke?: RingStroke;
  spec?: MotionSpec;
}) {
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    turn.value = withRepeat(
      withTiming(spec.to.rotateDeg!, {
        duration: spec.durationMs,
        easing: easing(spec),
      }),
      spec.repeat,
      spec.reverse,
    );
  }, [animate, turn, spec]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  return (
    <Layer half={half} style={style} testID={testID}>
      <Circle
        r={radius}
        fill="none"
        stroke={color}
        strokeOpacity={stroke.opacity}
        strokeWidth={stroke.width}
        strokeDasharray={stroke.dash}
      />
    </Layer>
  );
}

/**
 * fnPulse: a lime dot at (x, y) that swells to 1.7× and fades, then returns,
 * 2.8 s a cycle; at rest, a faint halo.
 *
 * It is a square just big enough for the dot, centred on its point, so the
 * default origin (its own centre) is the point. A transformOrigin on a
 * full-size layer is ignored on macOS, where the dot then drifted as it grew.
 * Yoga takes percentage margins from the parent's width; the chart is square.
 */
export function Pulse({
  half,
  x,
  y,
  radius,
  animate,
  testID,
}: {
  half: number;
  x: number;
  y: number;
  radius: number;
  animate: boolean;
  testID: string;
}) {
  const spec = motion.fnPulse;
  const p = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    // The keyframes run 0% → 50% → 100% back to the start, easing each half.
    p.value = withRepeat(
      withTiming(1, { duration: spec.durationMs / 2, easing: easing(spec) }),
      -1,
      true,
    );
  }, [animate, p, spec]);
  const { from, to } = spec;
  const style = useAnimatedStyle(() =>
    animate
      ? {
          opacity: from.opacity! + (to.opacity! - from.opacity!) * p.value,
          transform: [
            { scale: from.scale! + (to.scale! - from.scale!) * p.value },
          ],
        }
      : { opacity: look.pole.pulseRestOpacity },
  );
  const side = half * 2;
  const d = radius * 2;
  const box = {
    left: pct((x + half) / side),
    top: pct((y + half) / side),
    width: pct(d / side),
    marginLeft: pct(-radius / side),
    marginTop: pct(-radius / side),
  } as const;
  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      className="absolute aspect-square"
      style={[box, style]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${-radius} ${-radius} ${d} ${d}`}
      >
        <Circle r={radius} fill={lime} />
      </Svg>
    </Animated.View>
  );
}
