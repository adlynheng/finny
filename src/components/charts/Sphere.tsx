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

import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Circle,
  Ellipse,
  Text as SvgText,
  type EllipseProps,
} from 'react-native-svg';
import { HoverSurface } from '@/components/ui/HoverSurface';
import type { HoverPoint } from '@/components/ui/hoverTypes';
import { motion } from '@/theme/motion';
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
  type TickGroup,
} from './sphereLayout';
import { Layer, Pulse, RingTicks, SpinRing, emphasis } from './ringParts';
import { useEased } from './useEased';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const look = tokens.sphere;
const { ink, muted, lime } = tokens.colors;
const FONT = tokens.type.family;
const R = SPHERE.radius;

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
      <SpinRing
        half={half}
        radius={SPHERE.spinRing}
        animate={animate}
        testID="sphere-spin-ring"
      />
      {/* fnPulse on the north pole. */}
      <Pulse
        half={half}
        x={0}
        y={-R}
        radius={look.pole.pulseRadius}
        animate={animate}
        testID="sphere-pulse"
      />
      <Layer half={half}>
        <Circle cx={0} cy={-R} r={look.pole.radius} fill={lime} />
      </Layer>
      {geo.groups.map(g => (
        <RingTicks
          key={g.key}
          groupKey={g.key}
          chunks={g.chunks}
          selected={selected}
          dim={look.tick.dim}
          half={half}
          animate={animate}
          idPrefix="sphere"
        />
      ))}
      <HoverSurface testID="sphere-hover" onHover={onHover} />
    </View>
  );
}
