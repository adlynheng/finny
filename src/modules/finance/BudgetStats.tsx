import type { ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';

import { Glass } from '@/components/ui/Glass';
import { formatMoney } from '@/utils/format/money';
import type { Budget } from './useBudget';

/**
 * Spent so far with its pace, the daily average, and what is safe to spend
 * each remaining day. Desktop sets them under a hairline at the foot of the
 * hero, each with a lime bullet; mobile puts them in a glass panel under the
 * dial, without the bullets.
 *
 * Before there is anything to go on, the notes say what each figure waits
 * for: some spending, a few days of it, or a limit.
 */
export function BudgetStats({ budget }: { budget: Budget }) {
  const mobile = Platform.OS === 'ios';
  const unset = budget.limitCents === 0;
  const none = budget.spentCents === 0;
  const stats = (
    <>
      <Stat
        testID="budget-spent"
        label="Spent so far"
        value={formatMoney(budget.spentCents)}
        note={
          none
            ? 'Nothing logged yet'
            : unset
            ? 'No limit set'
            : budget.pace.label
        }
        mobile={mobile}
      />
      <Stat
        testID="budget-daily"
        label="Daily pace"
        value={formatMoney(budget.dailyAverageCents)}
        perDay
        mobile={mobile}
        note={
          none
            ? mobile
              ? 'Needs a few days'
              : 'Needs a few days of spending'
            : `${mobile ? 'Avg' : 'Average'} over ${budget.elapsed} ${
                budget.elapsed === 1 ? 'day' : 'days'
              }`
        }
      />
      <Stat
        testID="budget-safe"
        label="Safe to spend"
        value={formatMoney(unset ? 0 : budget.safeDailyCents)}
        perDay
        mobile={mobile}
        note={
          unset
            ? 'Set a limit first'
            : `${mobile ? '' : 'Per day · '}${budget.daysLeft} ${
                budget.daysLeft === 1 ? 'day' : 'days'
              } left`
        }
      />
    </>
  );
  return mobile ? (
    <Glass
      testID="budget-stats"
      recipe="chip"
      radius={8}
      className="flex-row gap-x-[12px] p-[14px]"
    >
      {stats}
    </Glass>
  ) : (
    <View
      testID="budget-stats"
      className="flex-row gap-x-[18px] border-t border-ink/[.08] pt-[14px]"
    >
      {stats}
    </View>
  );
}

function Stat({
  label,
  value,
  note,
  perDay = false,
  mobile,
  testID,
}: {
  label: string;
  value: string;
  note: string;
  perDay?: boolean;
  mobile: boolean;
  testID: string;
}) {
  return (
    <View testID={testID} className="min-w-0 flex-1 basis-0 gap-y-[4px]">
      {mobile ? (
        <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
          {label}
        </Text>
      ) : (
        <View className="flex-row items-center gap-x-[8px]">
          <Bullet />
          <Text numberOfLines={1} className="font-sans text-[13px] text-ink">
            {label}
          </Text>
        </View>
      )}
      <View className="flex-row items-baseline gap-x-[3px] ios:gap-x-[2px]">
        <Text
          testID={`${testID}-value`}
          numberOfLines={1}
          className="font-sans text-[26px] font-light leading-[26px] tracking-[-0.02em] text-ink ios:text-[21px] ios:leading-[21px]"
        >
          {value}
        </Text>
        {perDay && (
          <Text className="font-sans text-[13px] text-muted-2 ios:text-[11px]">
            /day
          </Text>
        )}
      </View>
      <Text
        testID={`${testID}-note`}
        numberOfLines={1}
        className="font-sans text-[11px] text-muted ios:text-[10px]"
      >
        {note}
      </Text>
    </View>
  );
}

/** A 6px lime dot in a 16px ring of 30% lime. */
function Bullet(): ReactNode {
  return (
    <View className="size-[16px] items-center justify-center rounded-full bg-lime/30">
      <View className="size-[6px] rounded-full bg-lime" />
    </View>
  );
}
