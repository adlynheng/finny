import { useMemo } from 'react';
import { Platform, Text, View } from 'react-native';

import { MultiStrandLine } from '@/components/charts/MultiStrandLine';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { Segmented } from '@/components/ui/Segmented';
import { useSnapshots } from '@/hooks/useSnapshots';
import type { SnapshotWindow } from '@/lib/queryKeys';
import { useUiStore } from '@/stores/uiStore';
import { historySeries, rangeChange } from '@/utils/derive/networth';
import { formatMonthShort } from '@/utils/format/date';
import { formatSignedMoney } from '@/utils/format/money';

const RANGES = [
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
  { value: '24', label: '24M' },
] as const;

/**
 * The green card: net worth over the last 6, 12 or 24 months (the UI store's
 * `historyRange`), with its change over the range and the multi-strand chart.
 * A new range re-slices the snapshots and the chart forgets its hover. Before
 * there are two snapshots there is no line to draw, so the card says so and
 * the toggle waits.
 *
 * On mobile the chart is a fixed 170 points tall under a 52-point margin, where
 * its tooltip sits above the crosshair; a sideways drag scrubs it while a
 * vertical one scrolls the page.
 */
export function HistoryCard() {
  const range = useUiStore(s => s.historyRange);
  const setUi = useUiStore(s => s.set);
  const snapshots = useSnapshots(range).data;
  const points = useMemo(
    () => (snapshots ? historySeries(snapshots) : []),
    [snapshots],
  );
  const change = snapshots && rangeChange(snapshots);
  const first = points[0];
  const last = points[points.length - 1];
  const compact = Platform.OS === 'ios';

  return (
    <GradientCard
      testID="history-card"
      gradient="netWorthHistory"
      className="flex-1"
    >
      <View className="flex-row items-center justify-between gap-x-[8px]">
        <Text className="font-sans text-[13px] text-white">
          Net worth history
        </Text>
        <Glass recipe="onGradientTray" radius={compact ? 8 : 6}>
          <Segmented
            testID="history-range"
            size="onGradient"
            options={RANGES}
            value={String(range) as (typeof RANGES)[number]['value']}
            onChange={v => setUi({ historyRange: Number(v) as SnapshotWindow })}
            disabled={snapshots !== undefined && !change}
          />
        </Glass>
      </View>
      {change && first && last ? (
        <>
          <View className="mt-[12px] flex-row flex-wrap items-baseline gap-x-[8px]">
            <Text
              testID="history-change"
              className="font-sans text-[38px] font-light leading-[38px] tracking-[-0.02em] text-white ios:text-[34px] ios:leading-[34px]"
            >
              {formatSignedMoney(change.deltaCents)}
            </Text>
            <Text className="font-sans text-[13px] text-white opacity-85">
              since {formatMonthShort(change.since, { year: true })}
            </Text>
          </View>
          <View className="mb-[8px] mt-[18px] min-h-[50px] flex-1 ios:mt-[52px] ios:h-[170px] ios:flex-none">
            <MultiStrandLine points={points} compact={compact} />
          </View>
          <View className="mr-[50px] flex-row justify-between ios:mr-[56px]">
            <Text className="font-sans text-[11px] text-white opacity-85">
              {formatMonthShort(first.date, { year: true })}
            </Text>
            <Text className="font-sans text-[11px] text-white opacity-85">
              {formatMonthShort(last.date, { year: true })}
            </Text>
          </View>
        </>
      ) : (
        snapshots && (
          <Text
            testID="history-empty"
            className="mt-[12px] font-sans text-[13px] text-white opacity-85"
          >
            The history starts once there are two monthly snapshots.
          </Text>
        )
      )}
    </GradientCard>
  );
}
