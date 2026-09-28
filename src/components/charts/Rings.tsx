/**
 * Trading's portfolio health, from the design's `rings()`: one progress arc
 * per health metric at decreasing radii, each over a faint full track and
 * ending in a cap dot (lime on the outermost, white on the rest), a dashed
 * outer ring turning once every 90 s, and the overall score over "of 100".
 *
 * White throughout: it sits on the portfolioHealth gradient. The spinning
 * ring is its own layer (ringParts), so only its view animates.
 */

import { View } from 'react-native';
import { Circle, Path, Text as SvgText } from 'react-native-svg';
import { motion } from '@/theme/motion';
import { tokens } from '@/theme/tokens';
import { arcPath, polar } from './geometry';
import { Layer, SpinRing } from './ringParts';

const look = tokens.rings;
const { white, lime } = tokens.colors;
const FONT = tokens.type.family;
const HALF = look.half;

/** The arc stops just short of the top: a closed arc draws nothing. */
const FULL_SWEEP = 359.9;

type Props = {
  /** Each metric's score out of 100, outermost ring first. */
  scores: readonly number[];
  /** False draws the resting frame: for tests and screenshots. */
  animate?: boolean;
  testID?: string;
};

const clampScore = (s: number) => Math.max(0, Math.min(100, s));

/** The overall score: the metrics' average, rounded. */
export function overallScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((n, s) => n + clampScore(s), 0);
  return Math.round(sum / scores.length);
}

export function Rings({ scores, animate = true, testID = 'rings' }: Props) {
  const c = look.centre;
  return (
    <View testID={testID} className="aspect-square w-full">
      <SpinRing
        half={HALF}
        radius={look.spinRing.radius}
        animate={animate}
        testID={`${testID}-spin-ring`}
        color={white}
        stroke={look.spinRing}
        spec={motion.fnSpinPortfolioHealth}
      />
      <Layer half={HALF} testID={`${testID}-body`}>
        {scores.map((score, i) => {
          const r = look.radius - i * look.step;
          const end = -90 + (clampScore(score) / 100) * FULL_SWEEP;
          const [ex, ey] = polar(r, end);
          return (
            <Ring key={i} i={i} r={r} end={end} cap={[ex, ey]} id={testID} />
          );
        })}
        <SvgText
          testID={`${testID}-score`}
          x={0}
          y={c.scoreY}
          textAnchor="middle"
          fontSize={c.scoreSize}
          fontWeight="300"
          letterSpacing={-0.02 * c.scoreSize}
          fontFamily={FONT}
          fill={white}
        >
          {String(overallScore(scores))}
        </SvgText>
        <SvgText
          testID={`${testID}-of`}
          x={0}
          y={c.labelY}
          textAnchor="middle"
          fontSize={c.labelSize}
          fontFamily={FONT}
          fill={white}
          fillOpacity={c.labelOpacity}
        >
          of 100
        </SvgText>
      </Layer>
    </View>
  );
}

function Ring({
  i,
  r,
  end,
  cap,
  id,
}: {
  i: number;
  r: number;
  end: number;
  cap: [number, number];
  id: string;
}) {
  return (
    <>
      <Circle
        testID={`${id}-track-${i}`}
        r={r}
        fill="none"
        stroke={white}
        strokeOpacity={look.track.opacity}
        strokeWidth={look.track.width}
      />
      <Path
        testID={`${id}-arc-${i}`}
        d={arcPath(r, -90, end)}
        fill="none"
        stroke={white}
        strokeWidth={look.arc.width}
        strokeLinecap="round"
      />
      <Circle
        testID={`${id}-cap-${i}`}
        cx={cap[0]}
        cy={cap[1]}
        r={look.cap.radius}
        fill={i === 0 ? lime : white}
      />
    </>
  );
}
