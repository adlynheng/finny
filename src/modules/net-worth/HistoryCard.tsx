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
import { today } from '@/lib/today';
import { formatMonthShort } from '@/utils/format/date';
import { formatMoney, formatSignedMoney } from '@/utils/format/money';

const RANGES = [
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
  { value: '24', label: '24M' },
] as const;

/**
 * The green card: net worth over the last 6, 12 or 24 months (the UI store's
 * `historyRange`), with its change over the range and the multi-strand chart.
 * A new range re-slices the snapshots and the chart forgets its hover. Before
 * there are two snapshots there is no line to draw: the card is the design's
 * empty one, the latest figure (or S$0) over a dashed baseline ending in this
 * month's dot, and no range toggle.
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
        {(snapshots === undefined || change) && (
          <Glass recipe="onGradientTray" radius={compact ? 8 : 6}>
            <Segmented
              testID="history-range"
              size="onGradient"
              options={RANGES}
              value={String(range) as (typeof RANGES)[number]['value']}
              onChange={v =>
                setUi({ historyRange: Number(v) as SnapshotWindow })
              }
              disabled={snapshots === undefined}
            />
          </Glass>
        )}
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
        snapshots && <EmptyHistory cents={snapshots.at(-1)?.total_cents ?? 0} />
      )}
    </GradientCard>
  );
}

/**
 * No history yet: the latest figure, a dashed baseline ending in a lime dot
 * at this month, and a line on how the history fills in.
 */
function EmptyHistory({ cents }: { cents: number }) {
  return (
    <>
      <View className="mt-[12px] flex-row flex-wrap items-baseline gap-x-[8px]">
        <Text className="font-sans text-[38px] font-light leading-[38px] tracking-[-0.02em] text-white ios:text-[34px] ios:leading-[34px]">
          {formatMoney(cents)}
        </Text>
        <Text className="font-sans text-[13px] text-white opacity-85">
          no history yet
        </Text>
      </View>
      <View
        testID="history-empty"
        className="mb-[8px] mr-[50px] mt-[18px] min-h-[50px] flex-1 ios:h-[120px] ios:flex-none"
      >
        <Text className="absolute left-0 top-[18%] max-w-[250px] font-sans text-[12px] leading-[17px] text-white">
          Finny takes a snapshot at the end of each month, starting with your
          first balance.
        </Text>
        <View className="absolute inset-x-0 top-[78%] border-t border-dashed border-white/60" />
        <View className="absolute -right-[7px] top-[78%] -mt-[7px] size-[14px] items-center justify-center rounded-full bg-lime/35">
          <View className="size-[7px] rounded-full bg-lime" />
        </View>
      </View>
      <View className="mr-[50px] flex-row justify-between">
        <Text className="font-sans text-[11px] text-white opacity-85">
          Monthly
        </Text>
        <Text className="font-sans text-[11px] text-white opacity-85">
          {formatMonthShort(today(), { year: true })}
        </Text>
      </View>
    </>
  );
}
