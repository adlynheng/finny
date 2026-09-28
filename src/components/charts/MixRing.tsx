/**
 * Trading's Portfolio tab ring, from the design's `mixRing()`: radiating tick
 * groups by instrument type, a bead at each group's start, faint outer and
 * inner circles, a dashed ring turning once every two minutes, and a pulsing
 * lime head at the top. The centre reads the portfolio total, or the
 * highlighted type's share; the other types' ticks dim.
 *
 * The ticks, highlight and motion are the sphere's (ringParts). The design
 * highlights a type from its row in the list beside the ring, not from the
 * ring itself, so the ring only takes the selection.
 */

import { useMemo } from 'react';
import { View } from 'react-native';
import { Circle, Text as SvgText } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { MIX, mixCentre, mixGroups, type MixPart } from './mixLayout';
import { Layer, Pulse, RingTicks, SpinRing } from './ringParts';

const look = tokens.mix;
const { ink, muted, lime } = tokens.colors;
const FONT = tokens.type.family;
const HALF = MIX.half;

type Props = {
  /** Instrument types in the order they run round the ring from the top. */
  parts: readonly MixPart[];
  /** S$ per US$1 (USD/SGD); null until it loads, when the US$ line waits. */
  usdSgdRate: number | null;
  /** The highlighted type's key: a hovered row in the list. */
  selected?: string | null;
  /** False draws the resting frame: for tests and screenshots. */
  animate?: boolean;
  testID?: string;
};

export function MixRing({
  parts,
  usdSgdRate,
  selected = null,
  animate = true,
  testID = 'mix',
}: Props) {
  const groups = useMemo(() => mixGroups(parts), [parts]);
  const centre = mixCentre(parts, selected, usdSgdRate);
  const c = look.centre;

  return (
    <View testID={testID} className="aspect-square w-full">
      <Layer half={HALF} testID={`${testID}-body`}>
        <Circle
          testID={`${testID}-outer`}
          r={MIX.outerRing}
          fill="none"
          stroke={ink}
          strokeOpacity={look.outerRing.opacity}
          strokeWidth={look.outerRing.width}
        />
        <Circle
          testID={`${testID}-inner`}
          r={MIX.innerRing}
          fill="none"
          stroke={ink}
          strokeOpacity={look.innerRing.opacity}
          strokeWidth={look.innerRing.width}
        />
        {groups.map(g => (
          <Circle
            key={g.key}
            testID={`${testID}-bead-${g.key}`}
            cx={g.bead[0]}
            cy={g.bead[1]}
            r={tokens.sphere.bead.radius}
            fill={ink}
            fillOpacity={tokens.sphere.bead.opacity}
          />
        ))}
        <SvgText
          testID={`${testID}-primary`}
          x={0}
          y={c.primaryY}
          textAnchor="middle"
          fontSize={c.primarySize}
          fontWeight="300"
          letterSpacing={-0.02 * c.primarySize}
          fontFamily={FONT}
          fill={ink}
        >
          {centre.primary}
        </SvgText>
        {centre.secondary !== null && (
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
        )}
      </Layer>
      <SpinRing
        half={HALF}
        radius={MIX.spinRing}
        animate={animate}
        testID={`${testID}-spin-ring`}
        stroke={look.spinRing}
      />
      {groups.map(g => (
        <RingTicks
          key={g.key}
          groupKey={g.key}
          chunks={g.chunks}
          selected={selected}
          dim={look.tickDim}
          half={HALF}
          animate={animate}
          idPrefix={testID}
        />
      ))}
      <Pulse
        half={HALF}
        x={0}
        y={-MIX.bead}
        radius={look.head.pulseRadius}
        animate={animate}
        testID={`${testID}-pulse`}
      />
      <Layer half={HALF}>
        <Circle
          testID={`${testID}-head`}
          cx={0}
          cy={-MIX.bead}
          r={look.head.radius}
          fill={lime}
        />
      </Layer>
    </View>
  );
}
