/**
 * The Watchlist's 30-day micro-chart, from the Trading design's `spark`: one
 * line in a 48 × 22 box, scaled to its own min and max, ink when the day's
 * change is up (or flat) and danger when it is down. 96 points wide on
 * desktop, 64 on mobile.
 */

import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { cx } from '@/components/ui/cardChrome';
import { tokens } from '@/theme/tokens';
import { sparkPath } from './lineLayout';

const { box, width } = tokens.spark;
const { ink, danger } = tokens.colors;

type Props = {
  /** Oldest first: the last 30 days' prices. */
  values: readonly number[];
  /** Today's change: negative draws the line in danger. */
  dayChange: number;
  /** The mobile width. */
  compact?: boolean;
  testID?: string;
};

export function Sparkline({
  values,
  dayChange,
  compact = false,
  testID = 'spark',
}: Props) {
  const d = useMemo(() => sparkPath(values), [values]);
  return (
    <View testID={testID} className={cx('h-[22px]', compact ? 'w-16' : 'w-24')}>
      {values.length > 1 && (
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${box.width} ${box.height}`}
          preserveAspectRatio="none"
        >
          <Path
            testID={`${testID}-line`}
            d={d}
            fill="none"
            stroke={dayChange < 0 ? danger : ink}
            strokeWidth={width}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      )}
    </View>
  );
}
