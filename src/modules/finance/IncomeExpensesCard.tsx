import { useMemo, useState, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';

import { CashflowArea } from '@/components/charts/CashflowArea';
import { StrandsFlow } from '@/components/charts/StrandsFlow';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { Segmented } from '@/components/ui/Segmented';
import { useTransactions } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import { useUiStore, type CashFlowView } from '@/stores/uiStore';
import {
  cashFlowSeries,
  savingsRate,
  type MonthTotals,
} from '@/utils/derive/cashflow';
import {
  formatMonthLong,
  formatMonthShort,
  monthKey,
  type MonthKey,
} from '@/utils/format/date';
import {
  formatMoney,
  formatPercent,
  formatSignedMoney,
  MINUS,
} from '@/utils/format/money';

const VIEWS = [
  { value: 'savings', label: 'Savings' },
  { value: 'cashflow', label: 'Cash flow' },
] as const;

const RANGES = [
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
] as const;
type Range = (typeof RANGES)[number]['value'];

/**
 * The green card, in two views (the UI store's `cashFlowView`). Savings: this
 * month's savings rate against last month's, the strands splitting into Saved
 * and Spent by that rate, and income, expenses and net in glass tiles. Cash
 * flow: income against expenses over 6 or 12 months, the hovered month (else
 * this one) headlining. Every figure comes from one monthly series over the
 * ledger, so this month's matches the rest of the page.
 */
export function IncomeExpensesCard() {
  const view = useUiStore(s => s.cashFlowView);
  const setUi = useUiStore(s => s.set);
  const [range, setRange] = useState<Range>('12');
  const txns = useTransactions().data;
  const month = monthKey(today());
  // Twelve months ending this one: the longest range, and last month for the comparison.
  const series = useMemo(
    () => (txns ? cashFlowSeries(txns, month, 12) : null),
    [txns, month],
  );
  const compact = Platform.OS === 'ios';

  const views = (
    <Tray>
      <Segmented
        testID="flow-view"
        size="onGradient"
        options={VIEWS}
        value={view}
        onChange={v => setUi({ cashFlowView: v as CashFlowView })}
      />
    </Tray>
  );
  const ranges = (
    <Tray>
      <Segmented
        testID="flow-range"
        size="onGradient"
        options={RANGES}
        value={range}
        onChange={setRange}
      />
    </Tray>
  );

  return (
    <GradientCard
      testID="flow-card"
      gradient="netWorthHistory"
      className="flex-1 ios:min-h-[300px]"
    >
      <View className="flex-row flex-wrap items-center justify-between gap-[10px] ios:gap-[8px]">
        <View className="flex-row items-center gap-x-[12px]">
          <Text className="font-sans text-[13px] text-white">
            Income vs expenses
          </Text>
          {!compact && views}
        </View>
        {compact ? (
          views
        ) : view === 'savings' ? (
          <Text className="font-sans text-[11px] text-white opacity-85">
            {formatMonthShort(month, { year: true })}
          </Text>
        ) : (
          ranges
        )}
      </View>
      {series &&
        (view === 'savings' ? (
          <SavingsView series={series} compact={compact} />
        ) : (
          <CashFlowChart
            // A new range starts on the latest month.
            key={range}
            series={series.slice(-Number(range))}
            ranges={compact ? ranges : null}
            compact={compact}
          />
        ))}
    </GradientCard>
  );
}

type Series = (MonthTotals & { month: MonthKey })[];

function SavingsView({
  series,
  compact,
}: {
  series: Series;
  compact: boolean;
}) {
  const now = series[series.length - 1]!;
  const before = series[series.length - 2];
  const rate = savingsRate(now);
  const change = before && (rate - savingsRate(before)) * 100;
  const vs =
    change === undefined
      ? null
      : `${change < 0 ? MINUS : '+'}${Math.abs(change).toFixed(
          1,
        )} pts vs ${formatMonthLong(before!.month)}`;
  const rateText = (
    <Text
      testID="flow-rate"
      className="font-sans text-[48px] font-light leading-[48px] tracking-[-0.03em] text-white ios:text-[44px] ios:leading-[44px]"
    >
      {formatPercent(rate * 100)}
    </Text>
  );
  const vsText = vs && (
    <Text
      testID="flow-rate-vs"
      className="font-sans text-[11px] text-white opacity-85"
    >
      {vs}
    </Text>
  );

  return (
    <View className="flex-1">
      {compact ? (
        <>
          <View className="mt-[14px] flex-row items-baseline gap-x-[10px]">
            {rateText}
            <View className="gap-y-[2px]">
              <Text className="font-sans text-[13px] text-white">
                Savings rate · {formatMonthShort(now.month, { year: true })}
              </Text>
              {vsText}
            </View>
          </View>
          <View className="mb-[6px] ml-[4px] mt-[18px] h-[120px]">
            <StrandsFlow rate={rate} compact />
          </View>
        </>
      ) : (
        <View className="mt-[10px] min-h-0 flex-1 flex-row gap-x-[18px]">
          <View className="justify-center gap-y-[4px]">
            {rateText}
            <Text className="font-sans text-[13px] text-white">
              Savings rate
            </Text>
            {vsText}
          </View>
          <View className="my-[6px] min-w-0 flex-1">
            <StrandsFlow rate={rate} />
          </View>
        </View>
      )}
      <View className="mt-[12px] flex-row gap-x-[4px]">
        <Tile
          label="Income"
          value={formatMoney(now.inCents)}
          testID="flow-income"
        />
        <Tile
          label="Expenses"
          value={formatMoney(now.outCents)}
          testID="flow-expenses"
        />
        <Tile
          label={compact ? 'Net flow' : 'Net cash flow'}
          value={formatSignedMoney(now.netCents)}
          testID="flow-net"
        />
      </View>
    </View>
  );
}

function CashFlowChart({
  series,
  ranges,
  compact,
}: {
  series: Series;
  /** Mobile's range toggle, beside the figure. */
  ranges: ReactNode;
  compact: boolean;
}) {
  // The hovered month, else the latest. Kept here: only this card listens.
  const [hover, setHover] = useState<number | null>(null);
  const sel = series[hover ?? series.length - 1]!;
  const income = series.map(m => m.inCents);
  const expense = series.map(m => m.outCents);
  const max = Math.max(1, ...income, ...expense) * 1.07;

  const figure = (
    <Text
      testID="flow-month-net"
      numberOfLines={1}
      className="font-sans text-[34px] font-light leading-[34px] tracking-[-0.02em] text-white ios:text-[32px] ios:leading-[32px]"
    >
      {formatSignedMoney(sel.netCents)}
    </Text>
  );
  const legend = (
    <View className="gap-y-[3px] ios:gap-y-[4px]">
      <Text
        testID="flow-month"
        numberOfLines={1}
        className="font-sans text-[13px] text-white"
      >
        Net cash flow · {formatMonthShort(sel.month, { year: true })}
      </Text>
      <View className="flex-row gap-x-[12px]">
        <View className="flex-row items-center gap-x-[5px]">
          <View className="h-[1.5px] w-[12px] bg-white" />
          <Text className="font-sans text-[11px] text-white">
            In {formatMoney(sel.inCents)}
          </Text>
        </View>
        <View className="flex-row items-center gap-x-[5px]">
          <View className="w-[12px] border-t-[1.5px] border-dashed border-white/80" />
          <Text className="font-sans text-[11px] text-white">
            Out {formatMoney(sel.outCents)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="min-h-0 flex-1">
      {compact ? (
        <>
          <View className="mt-[14px] flex-row items-center justify-between gap-x-[8px]">
            {figure}
            {ranges}
          </View>
          <View className="mt-[8px]">{legend}</View>
        </>
      ) : (
        <View className="mt-[12px] flex-row items-center gap-x-[16px]">
          {figure}
          {legend}
        </View>
      )}
      <View className="mt-[12px] min-h-[30px] flex-1 ios:mt-[14px] ios:h-[151px] ios:flex-none">
        <CashflowArea
          income={income}
          expense={expense}
          labels={series.map(m => formatMonthShort(m.month))}
          max={max}
          onHover={setHover}
          compact={compact}
        />
      </View>
    </View>
  );
}

/** A toggle's glass tray on the gradient: 6px corners, 8px on mobile. */
function Tray({ children }: { children: ReactNode }) {
  return (
    <Glass recipe="onGradientTray" radius={Platform.OS === 'ios' ? 8 : 6}>
      {children}
    </Glass>
  );
}

function Tile({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}) {
  return (
    <Glass
      testID={testID}
      recipe="onGradient"
      radius={8}
      fill="bg-white/[.12]"
      className="min-w-0 flex-1 basis-0 gap-y-[2px] px-[12px] py-[8px] ios:px-[10px]"
    >
      <Text className="font-sans text-[11px] text-white opacity-85">
        {label}
      </Text>
      <Text
        testID={`${testID}-value`}
        numberOfLines={1}
        className="font-sans text-[17px] font-light text-white ios:text-[15px]"
      >
        {value}
      </Text>
    </Glass>
  );
}
