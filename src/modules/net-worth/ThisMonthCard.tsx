import { Platform, Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button } from '@/components/ui/Button';
import { GradientCard } from '@/components/ui/GradientCard';
import { useTransactions } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import { useUiStore } from '@/stores/uiStore';
import { monthTotals } from '@/utils/derive/cashflow';
import { formatMonthShort, monthKey } from '@/utils/format/date';
import { formatMoney, formatSignedMoney } from '@/utils/format/money';

/**
 * The brown-olive card: this month's money in and out, transfers left out by
 * the month totals, with a bar splitting the two: solid white is money in's
 * share, the faint track the rest, money out. So the bar is full with no
 * spending and empty with no income. Mobile's button just says Add.
 */
export function ThisMonthCard() {
  const month = monthKey(today());
  const txns = useTransactions(month).data;
  const setUi = useUiStore(s => s.set);
  const { inCents, outCents, netCents } = monthTotals(txns ?? []);
  const spent = inCents > 0 ? outCents / inCents : null;
  const moved = inCents + outCents;
  const inShare = moved > 0 ? inCents / moved : 0;
  const none = txns != null && monthTxnCount(txns) === 0;

  return (
    <GradientCard
      testID="month-card"
      gradient="thisMonth"
      className="flex-1 justify-between gap-y-[14px]"
    >
      <View className="flex-row items-start justify-between gap-x-[8px]">
        <View className="gap-y-[2px]">
          <Text className="font-sans text-[13px] text-white">This month</Text>
          <Text className="font-sans text-[11px] text-white opacity-85">
            {formatMonthShort(month, { year: true })} · transfers excluded
          </Text>
        </View>
        <Button
          testID="month-add"
          variant="primary"
          size="sm"
          label={Platform.OS === 'ios' ? 'Add' : 'Add transaction'}
          icon={plus}
          onPress={() => setUi({ newTransactionOpen: true })}
        />
      </View>
      <View className="flex-row gap-x-[14px]">
        <Figure label="Money in" cents={inCents} testID="month-in" filled />
        <Figure label="Money out" cents={outCents} testID="month-out" />
      </View>
      <View className="h-[4px] rounded-[2px] bg-white/[.22]">
        <View
          testID="month-bar"
          className="absolute inset-y-0 left-0 rounded-[2px] bg-white"
          // Money in's share of the track: data, so not a class.
          style={{ width: `${inShare * 100}%` }}
        />
      </View>
      <View className="flex-row justify-between gap-x-[8px]">
        <Text
          testID="month-spent"
          className="font-sans text-[12px] text-white opacity-90"
        >
          {none
            ? 'No transactions yet'
            : spent === null
            ? 'No income yet'
            : `${Math.round(spent * 100)}% of income spent`}
        </Text>
        <Text testID="month-net" className="font-sans text-[12px] text-white">
          Net {none ? formatMoney(0) : formatSignedMoney(netCents)}
        </Text>
      </View>
    </GradientCard>
  );
}

/** The month's rows the card counts: transfers are left out, as in its totals. */
const monthTxnCount = (txns: readonly { kind: string }[]) =>
  txns.filter(t => t.kind !== 'transfer').length;

const plus = (color: string) => (
  <PlusIcon size={10} color={color} strokeWidth={1.4} />
);

/** A legend (a lime dot for in, a white ring for out) over the figure. */
function Figure({
  label,
  cents,
  filled = false,
  testID,
}: {
  label: string;
  cents: number;
  filled?: boolean;
  testID: string;
}) {
  return (
    <View className="min-w-0 flex-1 gap-y-[6px]">
      <View className="flex-row items-center gap-x-[7px]">
        <View
          className={
            filled
              ? 'size-[8px] rounded-full bg-lime'
              : 'size-[8px] rounded-full border-[1.5px] border-white'
          }
        />
        <Text className="font-sans text-[12px] text-white">{label}</Text>
      </View>
      <Text
        testID={testID}
        numberOfLines={1}
        className="font-sans text-[32px] font-light leading-[32px] tracking-[-0.02em] text-white ios:text-[30px] ios:leading-[30px]"
      >
        {formatMoney(cents)}
      </Text>
    </View>
  );
}
