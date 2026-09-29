/**
 * Personal Finance's savings-rate illustration, from the design's
 * `strands()`: 22 strands leave one point on the left and split to Saved (top
 * right, a lime marker) and Spent (bottom right, an outlined one), as many
 * going to Saved as the savings rate says, drawn brighter. A proportion made
 * physical rather than a chart: the rate is its only input.
 *
 * The strands fill the box, plus a right gutter for the Saved and Spent
 * labels (70 points on desktop, 54 on mobile, as the design's margins).
 */

import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { cx } from '@/components/ui/cardChrome';
import { tokens } from '@/theme/tokens';
import { STRANDS_BOX, strandPaths, type StrandPath } from './flowLayout';

const look = tokens.strands;
const { white } = tokens.colors;
const VIEWBOX = `0 0 ${STRANDS_BOX} ${STRANDS_BOX}`;

type Props = {
  /** The savings rate, 0 to 1. */
  rate: number;
  /** The mobile gutter. */
  compact?: boolean;
  testID?: string;
};

export function StrandsFlow({
  rate,
  compact = false,
  testID = 'strands',
}: Props) {
  const paths = useMemo(() => strandPaths(rate), [rate]);
  return (
    <View
      testID={testID}
      className={cx('flex-1', compact ? 'pr-[54px]' : 'pr-[70px]')}
    >
      <View className="relative flex-1">
        <Strands paths={paths} testID={testID} />
        <View
          testID={`${testID}-origin`}
          className="absolute left-0 top-1/2 -ml-[4.5px] -mt-[4.5px] size-[9px] rounded-full bg-white"
        />
        <View
          testID={`${testID}-saved`}
          className="absolute left-full top-[18%] -ml-[7px] -mt-[7px] size-[14px] items-center justify-center rounded-full bg-lime/35"
        >
          <View className="size-[7px] rounded-full bg-lime" />
        </View>
        <View
          testID={`${testID}-spent`}
          className="absolute left-full top-[82%] -ml-[4.5px] -mt-[4.5px] size-[9px] rounded-full border-[1.5px] border-white"
        />
        <Text className="absolute left-full top-[18%] -mt-[7px] ml-[14px] font-sans text-[11px] leading-[14px] text-white">
          Saved
        </Text>
        <Text className="absolute left-full top-[82%] -mt-[7px] ml-[14px] font-sans text-[11px] leading-[14px] text-white">
          Spent
        </Text>
      </View>
    </View>
  );
}

const Strands = memo(function Strands({
  paths,
  testID,
}: {
  paths: readonly StrandPath[];
  testID: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={VIEWBOX}
      preserveAspectRatio="none"
    >
      {paths.map((p, i) => (
        <Path
          key={i}
          testID={`${testID}-strand-${i}`}
          d={p.d}
          fill="none"
          stroke={white}
          strokeOpacity={p.saved ? look.saved.opacity : look.spent.opacity}
          strokeWidth={look.width}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </Svg>
  );
});
