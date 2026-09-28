/**
 * The Overview hero: net worth as a wireframe sphere, from the design's
 * `sphere()` in FinnyOverview.dc.html. Ten meridians turn on staggered loops,
 * thirteen latitudes take the colour of the asset class their height falls
 * in, and a ring of ticks outside shares 96 ticks between the classes. A
 * dashed circle compares the oldest net worth with today's by area.
 *
 * Layered per the Phase A spike rules (report §3): react-native-svg repaints a
 * whole <Svg> when any child changes, so everything that moves on its own —
 * the spinning ring, the pulse, each four-tick entrance layer — is its own
 * <Svg> inside an Animated.View, and only the view animates.
 */

import {
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
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
import Svg, {
  Circle,
  Ellipse,
  Path,
  Text as SvgText,
  type EllipseProps,
} from 'react-native-svg';
import { HoverSurface } from '@/components/ui/HoverSurface';
import type { HoverPoint } from '@/components/ui/hoverTypes';
import { motion, type MotionSpec } from '@/theme/motion';
import { tokens } from '@/theme/tokens';
import { formatMonthShort, type MonthKey } from '@/utils/format/date';
import { formatKMoney } from '@/utils/format/money';
import {
  SPHERE,
  classAt,
  referenceRadius,
  sphereGeometry,
  type Latitude,
  type SphereClass,
  type TickChunk,
  type TickGroup,
} from './sphereLayout';
import { useEased } from './useEased';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const look = tokens.sphere;
const { ink, muted, lime } = tokens.colors;
const FONT = tokens.type.family;
const R = SPHERE.radius;
const pct = (fraction: number): `${number}%` => `${fraction * 100}%`;

const easing = (spec: MotionSpec) =>
  spec.easing === 'linear' ? Easing.linear : Easing.bezier(...spec.easing);

type Props = {
  /** Asset classes in the order they run round the ring from the top. */
  classes: readonly SphereClass[];
  /** The oldest snapshot: the dashed circle and its label. */
  oldest: { month: MonthKey; cents: number };
  newestCents: number;
  /** The highlighted class's key: hovered here, or picked elsewhere. */
  selected: string | null;
  /** macOS: the class under the pointer as it moves, null as it leaves. */
  onSelect?: (key: string | null) => void;
  /** Class labels round the outside (desktop); mobile shows chips instead. */
  labels?: boolean;
  /** False draws the resting frame: for tests and screenshots. */
  animate?: boolean;
  testID?: string;
};

type Emphasis = { on: boolean; hot: boolean };

const emphasis = (key: string, selected: string | null): Emphasis => ({
  on: !selected || selected === key,
  hot: selected === key,
});

/** A full-size layer over the sphere, never taking touches. */
function Layer({
  half,
  style,
  children,
  testID,
}: {
  half: number;
  style?: ComponentProps<typeof Animated.View>['style'];
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      className="absolute inset-0"
      style={style}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
      >
        {children}
      </Svg>
    </Animated.View>
  );
}

// fnMeridian: scaleX 1 → −1 and back, each meridian a tenth of a cycle ahead.
// One clock runs 0 → 2 (out and back) for all ten.
const MERIDIAN_LEAD =
  -motion.fnMeridian.staggerMs / motion.fnMeridian.durationMs;
const meridianEase =
  motion.fnMeridian.easing === 'linear'
    ? Easing.linear
    : Easing.bezierFn(...motion.fnMeridian.easing);

/** Meridian `i`'s horizontal scale when the shared clock reads `clock`. */
export function meridianScaleX(clock: number, i: number): number {
  'worklet';
  const t = (clock + i * MERIDIAN_LEAD) % 2;
  const q = t < 1 ? t : 2 - t;
  return 1 - 2 * meridianEase(q);
}

function Meridian({
  i,
  clock,
  opacity,
}: {
  i: number;
  clock: SharedValue<number> | null;
  opacity: number;
}) {
  const props = useAnimatedProps<EllipseProps>(() => ({
    transform: [{ scaleX: meridianScaleX(clock?.value ?? 0, i) }],
  }));
  const common = {
    testID: `sphere-meridian-${i}`,
    cx: 0,
    cy: 0,
    rx: R,
    ry: R,
    fill: 'none',
    stroke: ink,
    strokeOpacity: opacity,
    strokeWidth: look.meridian.width,
  };
  // At rest, the design's frame: scaleX(cos(i/10 · π)).
  return clock ? (
    <AnimatedEllipse {...common} animatedProps={props} />
  ) : (
    <Ellipse
      {...common}
      transform={`scale(${Math.cos((i / SPHERE.meridians) * Math.PI).toFixed(
        3,
      )}, 1)`}
    />
  );
}

function LatitudeRing({
  j,
  lat,
  selected,
}: {
  j: number;
  lat: Latitude;
  selected: string | null;
}) {
  const { hot } = emphasis(lat.key, selected);
  const st = !selected
    ? look.latitude.rest
    : hot
    ? look.latitude.hot
    : look.latitude.dim;
  const opacity = useEased(st.opacity, look.latitude.transitionMs);
  const props = useAnimatedProps(() => ({ strokeOpacity: opacity.value }));
  return (
    <AnimatedEllipse
      testID={`sphere-latitude-${j}`}
      cx={0}
      cy={lat.y}
      rx={lat.rx}
      ry={lat.ry}
      fill="none"
      stroke={ink}
      strokeWidth={st.width}
      animatedProps={props}
    />
  );
}

function ClassLabel({
  group,
  selected,
}: {
  group: TickGroup;
  selected: string | null;
}) {
  const { on } = emphasis(group.key, selected);
  const L = SPHERE.label;
  const opacity = useEased(
    on ? 1 : look.valueDimOpacity,
    look.tick.transitionMs,
  );
  const props = useAnimatedProps(() => ({ fillOpacity: opacity.value }));
  const label = group.labelAt;
  return (
    <>
      <SvgText
        testID={`sphere-name-${group.key}`}
        x={label.x}
        y={label.nameY}
        textAnchor={label.anchor}
        fontSize={L.nameSize}
        fontFamily={FONT}
        fill={muted}
      >
        {group.label}
      </SvgText>
      {/* Value and share as two single-span texts from measured widths: a
          nested TSpan breaks middle and end anchors (spike report §3). */}
      <AnimatedSvgText
        testID={`sphere-value-${group.key}`}
        x={label.valueX}
        y={label.valueY}
        fontSize={L.valueSize}
        fontWeight="300"
        fontFamily={FONT}
        fill={ink}
        animatedProps={props}
      >
        {group.value}
      </AnimatedSvgText>
      <AnimatedSvgText
        testID={`sphere-percent-${group.key}`}
        x={label.percentX}
        y={label.valueY}
        fontSize={L.percentSize}
        fontFamily={FONT}
        fill={muted}
        animatedProps={props}
      >
        {group.percent}
      </AnimatedSvgText>
    </>
  );
}

// fnGrow: each layer scales .6 → 1 about the sphere's centre and fades in,
// staggered 12 ms per tick by its first tick.
function TickLayer({
  groupKey,
  index,
  chunk,
  half,
  animate,
  centre,
  side,
  hot,
}: {
  groupKey: string;
  index: number;
  chunk: TickChunk;
  half: number;
  animate: boolean;
  centre: SharedValue<number>;
  side: SharedValue<number>;
  hot: boolean;
}) {
  const spec = motion.fnGrow;
  const grow = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    grow.value = withDelay(
      chunk.firstIndex * spec.staggerMs,
      withTiming(1, { duration: spec.durationMs, easing: easing(spec) }),
    );
  }, [animate, chunk.firstIndex, grow, spec]);
  const from = spec.from.scale!;
  const style = useAnimatedStyle(() => ({
    opacity: grow.value,
    transform: [{ scale: from + (1 - from) * grow.value }],
  }));
  const sideProps = useAnimatedProps(() => ({ strokeOpacity: side.value }));
  const centreProps = useAnimatedProps(() => ({ strokeOpacity: centre.value }));
  const t = look.tick;
  return (
    <Layer
      half={half}
      style={style}
      testID={`sphere-ticks-${groupKey}-${index}`}
    >
      <AnimatedPath
        testID={`sphere-sides-${groupKey}-${index}`}
        d={chunk.sides}
        fill="none"
        stroke={ink}
        strokeWidth={t.side.width}
        strokeLinecap="round"
        animatedProps={sideProps}
      />
      <AnimatedPath
        testID={`sphere-centres-${groupKey}-${index}`}
        d={chunk.centre}
        fill="none"
        stroke={ink}
        strokeWidth={hot ? t.centre.hotWidth : t.centre.width}
        strokeLinecap="round"
        animatedProps={centreProps}
      />
    </Layer>
  );
}

function TickClass({
  group,
  selected,
  half,
  animate,
}: {
  group: TickGroup;
  selected: string | null;
  half: number;
  animate: boolean;
}) {
  const { on, hot } = emphasis(group.key, selected);
  const t = look.tick;
  const dim = on ? 1 : t.dim;
  const centre = useEased(
    (hot ? t.centre.hotOpacity : t.centre.opacity) * dim,
    t.transitionMs,
  );
  const side = useEased(
    (hot ? t.side.hotOpacity : t.side.opacity) * dim,
    t.transitionMs,
  );
  return (
    <>
      {group.chunks.map((chunk, index) => (
        <TickLayer
          key={chunk.firstIndex}
          groupKey={group.key}
          index={index}
          chunk={chunk}
          half={half}
          animate={animate}
          centre={centre}
          side={side}
          hot={hot}
        />
      ))}
    </>
  );
}

// fnSpin: the dashed ring turns once every two minutes.
function SpinRing({ half, animate }: { half: number; animate: boolean }) {
  const spec = motion.fnSpin;
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
  const r = look.spinRing;
  return (
    <Layer half={half} style={style} testID="sphere-spin-ring">
      <Circle
        r={SPHERE.spinRing}
        fill="none"
        stroke={ink}
        strokeOpacity={r.opacity}
        strokeWidth={r.width}
        strokeDasharray={r.dash}
      />
    </Layer>
  );
}

// fnPulse on the north pole: out to 1.7× and faded, then back, 2.8 s a cycle.
function Pulse({ half, animate }: { half: number; animate: boolean }) {
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
  // A square just big enough for the dot, centred on the pole, so the default
  // origin (its own centre) is the pole. A transformOrigin on a full-size
  // layer is ignored on macOS, where the dot then drifted as it grew. Yoga
  // takes percentage margins from the parent's width; the sphere is square.
  const d = look.pole.pulseRadius * 2;
  const box = {
    left: '50%',
    top: pct((half - R) / (half * 2)),
    width: pct(d / (half * 2)),
    marginLeft: pct(-d / 2 / (half * 2)),
    marginTop: pct(-d / 2 / (half * 2)),
  } as const;
  return (
    <Animated.View
      testID="sphere-pulse"
      pointerEvents="none"
      className="absolute aspect-square"
      style={[box, style]}
    >
      <Svg width="100%" height="100%" viewBox={`${-d / 2} ${-d / 2} ${d} ${d}`}>
        <Circle r={look.pole.pulseRadius} fill={lime} />
      </Svg>
    </Animated.View>
  );
}

export function Sphere({
  classes,
  oldest,
  newestCents,
  selected,
  onSelect,
  labels = true,
  animate = true,
  testID = 'sphere',
}: Props) {
  const geo = useMemo(
    () => sphereGeometry(classes, { labels }),
    [classes, labels],
  );
  const { half } = geo;
  const r0 = referenceRadius(oldest.cents, newestCents);

  const clock = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    clock.value = withRepeat(
      withTiming(2, {
        duration: motion.fnMeridian.durationMs * 2,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [animate, clock]);

  // Report the class under the pointer only when it changes.
  const hovered = useRef<string | null>(null);
  const onHover = (p: HoverPoint | null) => {
    const key =
      p && p.width > 0 && p.height > 0
        ? classAt(
            geo,
            (p.x / p.width) * half * 2 - half,
            (p.y / p.height) * half * 2 - half,
          )
        : null;
    if (key !== hovered.current) {
      hovered.current = key;
      onSelect?.(key);
    }
  };

  const meridianOpacity = selected
    ? look.meridian.dimOpacity
    : look.meridian.opacity;

  return (
    <View testID={testID} className="aspect-square w-full">
      <Layer half={half} testID="sphere-body">
        {r0 !== null && (
          <>
            <Circle
              testID="sphere-reference"
              r={r0}
              fill="none"
              stroke={ink}
              strokeOpacity={look.reference.opacity}
              strokeDasharray={look.reference.dash}
              strokeWidth={look.reference.width}
            />
            <SvgText
              testID="sphere-reference-label"
              x={0}
              y={r0 - 10}
              textAnchor="middle"
              fontSize={look.reference.labelSize}
              fontFamily={FONT}
              fill={muted}
            >
              {`${formatMonthShort(oldest.month, {
                year: true,
              })} · ${formatKMoney(oldest.cents)}`}
            </SvgText>
          </>
        )}
        {Array.from({ length: SPHERE.meridians }, (_, i) => (
          <Meridian
            key={i}
            i={i}
            clock={animate ? clock : null}
            opacity={meridianOpacity}
          />
        ))}
        {geo.latitudes.map((lat, j) => (
          <LatitudeRing key={j} j={j} lat={lat} selected={selected} />
        ))}
        <Circle
          r={SPHERE.outerRing}
          fill="none"
          stroke={ink}
          strokeOpacity={look.outerRing.opacity}
          strokeWidth={look.outerRing.width}
        />
        {geo.groups.map(g => (
          <Circle
            key={g.key}
            testID={`sphere-bead-${g.key}`}
            cx={g.bead[0]}
            cy={g.bead[1]}
            r={look.bead.radius}
            fill={ink}
            fillOpacity={look.bead.opacity}
          />
        ))}
        {labels &&
          geo.groups.map(g => (
            <ClassLabel key={g.key} group={g} selected={selected} />
          ))}
      </Layer>
      <SpinRing half={half} animate={animate} />
      <Pulse half={half} animate={animate} />
      <Layer half={half}>
        <Circle cx={0} cy={-R} r={look.pole.radius} fill={lime} />
      </Layer>
      {geo.groups.map(g => (
        <TickClass
          key={g.key}
          group={g}
          selected={selected}
          half={half}
          animate={animate}
        />
      ))}
      <HoverSurface testID="sphere-hover" onHover={onHover} />
    </View>
  );
}
