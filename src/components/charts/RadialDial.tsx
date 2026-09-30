/**
 * The radial dial behind Personal Finance's budget and the Planner's monthly
 * plan (the designs' `dial()`s): a ring of tick groups, an arc, a pulsing
 * head, and a centre reading. `budgetDial` and `allocationDial` (dialConfigs)
 * build the two configurations.
 *
 * Layered like the sphere (ringParts): the static drawing is one <Svg>, and
 * the spinning ring, the pulse and each run of four ticks are layers of their
 * own, so only views animate. Once the ticks have grown in, each group's runs
 * merge into one layer: a dial redrawn as a slider moves (the Planner's) then
 * updates a handful of paths rather than some two dozen animated layers.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { Circle, Path, Text as SvgText } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import {
  dialGeometry,
  type DialConfig,
  type DialRun,
  type LaidGroup,
} from './dialLayout';
import { Layer, Pulse, SpinRing, TickLayer, emphasis } from './ringParts';
import { useEased } from './useEased';

const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const look = tokens.dial;
const tick = tokens.sphere.tick;
const { ink, muted, lime, white, danger } = tokens.colors;
const FONT = tokens.type.family;
const HALF = look.half;
/** Room past each edge for the outside labels, as a fraction of the dial. */
const LABEL_BLEED = 0.25;

type Props = DialConfig & {
  /** The highlighted group's key (a hovered plan row); the rest dim. */
  selected?: string | null;
  /** False draws the resting frame: for tests and screenshots. */
  animate?: boolean;
  testID?: string;
};

/** A group's runs as one: the paths simply join, each tick starting with its own move. */
function merged(runs: readonly DialRun[]): DialRun[] {
  return runs.length > 1
    ? [
        {
          firstIndex: runs[0]!.firstIndex,
          centre: runs.map(r => r.centre).join(''),
          sides: runs.map(r => r.sides).join(''),
        },
      ]
    : [...runs];
}

function TickGroup({
  group,
  selected,
  stagger,
  animate,
  entered,
  testID,
}: {
  group: LaidGroup;
  selected: string | null;
  stagger: DialConfig['stagger'];
  animate: boolean;
  /** Grown in: the runs draw as one layer. */
  entered: boolean;
  testID: string;
}) {
  const { on, hot } = emphasis(group.key, selected);
  const dim = on ? 1 : tick.dim;
  const centreOpacity = hot
    ? tick.centre.hotOpacity
    : group.today
    ? look.tick.todayOpacity
    : tick.centre.opacity;
  const centre = useEased(centreOpacity * dim, tick.transitionMs);
  const side = useEased(
    (hot ? tick.side.hotOpacity : tick.side.opacity) * dim,
    tick.transitionMs,
  );
  return (
    <>
      {(entered ? merged(group.runs) : group.runs).map((run, index) => (
        <TickLayer
          // By place in the group, not round the ring: the first layer stays
          // mounted through the merge, and a merged group through any redraw.
          key={index}
          run={run}
          half={HALF}
          animate={animate}
          delayMs={(run.firstIndex + stagger.from) * stagger.ms}
          centre={centre}
          side={side}
          centreWidth={hot ? tick.centre.hotWidth : tick.centre.width}
          idPrefix={testID}
          idKey={`${group.key}-${index}`}
        />
      ))}
    </>
  );
}

function GroupLabel({
  group,
  selected,
  testID,
}: {
  group: LaidGroup;
  selected: string | null;
  testID: string;
}) {
  const { on } = emphasis(group.key, selected);
  const opacity = useEased(
    on ? 1 : tokens.sphere.valueDimOpacity,
    tick.transitionMs,
  );
  const props = useAnimatedProps(() => ({ fillOpacity: opacity.value }));
  const label = group.label!;
  return (
    <>
      <SvgText
        testID={`${testID}-name-${group.key}`}
        x={label.x}
        y={label.nameY}
        textAnchor={label.anchor}
        fontSize={look.label.nameSize}
        fontFamily={FONT}
        fill={muted}
      >
        {label.name}
      </SvgText>
      <AnimatedSvgText
        testID={`${testID}-value-${group.key}`}
        x={label.x}
        y={label.valueY}
        textAnchor={label.anchor}
        fontSize={look.label.valueSize}
        fontFamily={FONT}
        fill={ink}
        animatedProps={props}
      >
        {label.value}
      </AnimatedSvgText>
    </>
  );
}

export function RadialDial({
  selected = null,
  animate = true,
  testID = 'dial',
  ...config
}: Props) {
  // Cheap (at most ~100 ticks), and the builders make a new config each
  // render anyway.
  const geo = dialGeometry(config);
  const { centre } = config;
  // Merge once the last run has grown in; a group that gains ticks after
  // that is drawn at once.
  const lastRun = Math.max(
    0,
    ...geo.groups.flatMap(g => g.runs.map(r => r.firstIndex)),
  );
  const [entered, setEntered] = useState(!animate);
  useEffect(() => {
    if (entered) return;
    const t = setTimeout(
      () => setEntered(true),
      (lastRun + config.stagger.from) * config.stagger.ms +
        tokens.motion.fnGrow.durationMs,
    );
    return () => clearTimeout(t);
    // The entrance is timed once, from the first drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const c = look.centre;

  return (
    <View testID={testID} className="aspect-square w-full">
      <Layer half={HALF} testID={`${testID}-body`}>
        {look.rings.radii.map(r => (
          <Circle
            key={r}
            r={r}
            fill="none"
            stroke={ink}
            strokeOpacity={look.rings.opacity}
            strokeWidth={look.rings.width}
          />
        ))}
        {geo.groups.flatMap(g =>
          g.dots.map(([x, y], i) => (
            <Circle
              key={`${g.key}-${i}`}
              testID={`${testID}-dot-${g.key}-${i}`}
              cx={x}
              cy={y}
              r={look.dot.size}
              fill={ink}
              fillOpacity={look.dot.opacity}
            />
          )),
        )}
        {geo.groups.map(
          g =>
            g.bead && (
              <Circle
                key={g.key}
                testID={`${testID}-bead-${g.key}`}
                cx={g.bead[0]}
                cy={g.bead[1]}
                r={look.bead.radius}
                fill={ink}
                fillOpacity={look.bead.opacity}
              />
            ),
        )}
        {geo.arc && (
          <>
            <Path
              testID={`${testID}-arc`}
              d={geo.arc.d}
              fill="none"
              stroke={geo.arc.over ? danger : ink}
              strokeOpacity={look.arc.opacity}
              strokeWidth={look.arc.width}
            />
            {geo.arc.cap === 'dot' && (
              <Circle
                testID={`${testID}-arc-cap`}
                cx={geo.arc.end[0]}
                cy={geo.arc.end[1]}
                r={look.arc.capRadius}
                fill={ink}
              />
            )}
          </>
        )}
        {geo.pace && (
          <>
            <Circle
              testID={`${testID}-pace`}
              cx={geo.pace.at[0]}
              cy={geo.pace.at[1]}
              r={look.pace.radius}
              fill={white}
              stroke={ink}
              strokeWidth={look.pace.width}
            />
            <SvgText
              testID={`${testID}-pace-label`}
              x={geo.pace.labelAt[0]}
              y={geo.pace.labelAt[1] + 3}
              textAnchor="start"
              fontSize={look.pace.labelSize}
              fontFamily={FONT}
              fill={muted}
            >
              {geo.pace.label}
            </SvgText>
          </>
        )}
        <SvgText
          testID={`${testID}-primary`}
          x={0}
          y={c.primaryY}
          textAnchor="middle"
          fontSize={centre.primarySize}
          fontWeight="300"
          letterSpacing={-0.02 * centre.primarySize}
          fontFamily={FONT}
          fill={ink}
        >
          {centre.primary}
        </SvgText>
        <SvgText
          testID={`${testID}-secondary`}
          x={0}
          y={c.secondaryY}
          textAnchor="middle"
          fontSize={c.secondarySize}
          fontFamily={FONT}
          fill={muted}
        >
          {centre.secondary}
        </SvgText>
      </Layer>
      {/* Outside labels overhang the dial by up to ~60 units a side. */}
      <Layer half={HALF} bleed={LABEL_BLEED} testID={`${testID}-labels`}>
        {geo.groups.map(
          g =>
            g.label && (
              <GroupLabel
                key={g.key}
                group={g}
                selected={selected}
                testID={testID}
              />
            ),
        )}
      </Layer>
      <SpinRing
        half={HALF}
        radius={look.spinRing.radius}
        animate={animate}
        testID={`${testID}-spin-ring`}
      />
      {geo.groups.map(g => (
        <TickGroup
          key={g.key}
          group={g}
          selected={selected}
          stagger={config.stagger}
          animate={animate && !entered}
          entered={entered}
          testID={testID}
        />
      ))}
      {geo.head && (
        <>
          <Pulse
            half={HALF}
            x={geo.head[0]}
            y={geo.head[1]}
            radius={look.head.pulseRadius}
            animate={animate}
            testID={`${testID}-pulse`}
          />
          <Layer half={HALF}>
            <Circle
              testID={`${testID}-head`}
              cx={geo.head[0]}
              cy={geo.head[1]}
              r={look.head.radius}
              fill={lime}
            />
          </Layer>
        </>
      )}
    </View>
  );
}
