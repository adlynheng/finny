import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { calendarTiles, calendarWeeks } from '@/components/ui/calendarGrid';
import { cx } from '@/components/ui/cardChrome';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { MonthStepper } from '@/components/ui/MonthStepper';
import { useRecurringCharges } from '@/hooks/useRecurringCharges';
import { today as currentDay } from '@/lib/today';
import { useUiStore } from '@/stores/uiStore';
import { tokens } from '@/theme/tokens';
import {
  formatDayMonth,
  formatMonthLong,
  formatMonthShort,
  formatWeekdayShort,
  monthKey,
  shiftMonth,
} from '@/utils/format/date';
import { formatMoneyExact } from '@/utils/format/money';
import {
  chargesByDay,
  dateOf,
  defaultDay,
  isPastDay,
  tileAmount,
  upcomingDays,
} from './payments';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The calendar looks ahead: this month and the three after it, as the design allows. */
const MONTHS_AHEAD = 3;

/** A day tile's fill: brighter selected, then with charges; today is clear. */
function tileFill(selected: boolean, charged: boolean, isToday: boolean) {
  if (selected) return 'bg-white/[.32]';
  if (charged) return 'bg-white/[.18]';
  return isToday ? null : 'bg-white/[.08]';
}

/** Today's outline wins over the selected day's. */
function tileBorder(selected: boolean, isToday: boolean) {
  if (isToday) return 'border-white/75';
  return selected ? 'border-white/45' : 'border-white/10';
}

/**
 * The brown card: the recurring charges on a month's calendar. A day whose
 * charges have been paid shows a lime check; one still to come shows the
 * amount (a lime dot on mobile); today is outlined, the selected day brighter,
 * and past days with nothing dimmed. Only charge days press. The strip below
 * names the selected day's charges and their total; it opens on the next one.
 * The month (the UI store's `calendarMonth`) steps from this month to three
 * ahead.
 *
 * With no recurring charges it is the design's empty card: nothing
 * scheduled, this month alone (no stepping), and a strip saying what will
 * appear.
 */
export function PaymentsCalendarCard() {
  const storedMonth = useUiStore(s => s.calendarMonth);
  const setUi = useUiStore(s => s.set);
  const charges = useRecurringCharges().data ?? [];
  const today = currentDay();
  const thisMonth = monthKey(today);
  const none = !charges.some(c => c.is_active);
  // Nothing to step through: the empty card stays on this month.
  const month = none ? thisMonth : storedMonth;
  // The pressed day, for the month it was pressed in.
  const [picked, setPicked] = useState<{ month: string; day: number } | null>(
    null,
  );

  const byDay = chargesByDay(charges, month);
  const sel =
    picked?.month === month && byDay.has(picked.day)
      ? picked.day
      : defaultDay(byDay, month, today);
  const selCharges = sel === null ? [] : byDay.get(sel) ?? [];
  const sum = (days: number[]) =>
    days.reduce(
      (total, d) =>
        total + byDay.get(d)!.reduce((s, c) => s + c.amount_cents, 0),
      0,
    );
  const due = sum(upcomingDays(byDay, month, today));
  const weeks = calendarWeeks(calendarTiles(month, { selected: null, today }));

  return (
    <GradientCard
      testID="payments-card"
      gradient="upcomingPayments"
      className="flex-1"
    >
      <View className="flex-row items-start justify-between gap-x-[8px]">
        <View className="min-w-0 shrink gap-y-[2px]">
          <Text className="font-sans text-[13px] text-white">
            Upcoming payments
          </Text>
          <Text
            testID="payments-due"
            className="font-sans text-[11px] text-white opacity-90"
          >
            {none
              ? 'Nothing scheduled'
              : `${formatMoneyExact(due)} due ${
                  month === thisMonth
                    ? `for the rest of ${formatMonthLong(month)}`
                    : `in ${formatMonthLong(month)}`
                }`}
          </Text>
        </View>
        {none ? (
          <Glass
            testID="payments-month"
            recipe="onGradientTray"
            radius={6}
            className="px-[10px] py-[6px]"
          >
            <Text className="font-sans text-[11px] text-white">
              {formatMonthShort(month)}
            </Text>
          </Glass>
        ) : (
          <MonthStepper
            testID="payments-month"
            tone="onGradient"
            month={month}
            min={thisMonth}
            max={shiftMonth(thisMonth, MONTHS_AHEAD)}
            onChange={m => setUi({ calendarMonth: m })}
          />
        )}
      </View>
      <View className="mt-[10px] flex-row items-baseline gap-x-[10px] ios:mt-[12px]">
        <Text className="font-sans text-[34px] font-light leading-[34px] tracking-[-0.02em] text-white ios:text-[32px] ios:leading-[32px]">
          {month.slice(0, 4)}
        </Text>
        <Text className="font-sans text-[13px] text-white opacity-90">
          {formatMonthLong(month)}
        </Text>
      </View>
      <View className="mt-[12px] flex-row gap-x-[5px] ios:gap-x-[4px]">
        {WEEKDAYS.map(d => (
          <Text
            key={d}
            className="flex-1 text-center font-sans text-[10px] text-white opacity-80"
          >
            {d}
          </Text>
        ))}
      </View>
      <View className="mt-[6px] min-h-0 flex-1 gap-y-[5px] ios:flex-none ios:gap-y-[4px]">
        {weeks.map((week, i) => (
          <View
            key={i}
            className="min-h-0 flex-1 flex-row gap-x-[5px] ios:h-[46px] ios:flex-none ios:gap-x-[4px]"
          >
            {week.map(t => {
              if (t.kind === 'blank') {
                return <View key={t.key} className="flex-1" />;
              }
              // Each tile sits in a bare flex-1 cell: a tile's own padding and
              // border would add to its share, widening it past the blank
              // cells and the weekday labels.
              const items = byDay.get(t.day);
              const past = isPastDay(month, t.day, today);
              const isToday = t.date === today;
              const selected = t.day === sel;
              return (
                <View key={t.key} className="flex-1">
                  <Pressable
                    testID={`payments-day-${t.day}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                      disabled: !items,
                    }}
                    disabled={!items}
                    onPress={() => setPicked({ month, day: t.day })}
                    className={cx(
                      'min-h-0 flex-1 justify-between overflow-hidden rounded-10 border px-[6px] py-[5px] ios:rounded-9 ios:p-[5px]',
                      tileFill(selected, !!items, isToday),
                      tileBorder(selected, isToday),
                      past && !items && !isToday && 'opacity-60',
                    )}
                  >
                    <Text className="font-sans text-[12px] leading-[12px] text-white">
                      {t.day}
                    </Text>
                    {items &&
                      (past ? (
                        <PaidDisc testID={`payments-paid-${t.day}`} />
                      ) : (
                        <Due
                          testID={`payments-due-${t.day}`}
                          cents={items.reduce((s, c) => s + c.amount_cents, 0)}
                        />
                      ))}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <Glass
        testID="payments-strip"
        recipe="onGradient"
        radius={8}
        fill="bg-white/[.12]"
        className="mt-[10px] flex-row items-center gap-x-[10px] px-[12px] py-[9px] ios:py-[11px]"
      >
        {none ? (
          <>
            <View className="size-[14px] rounded-full border-[1.5px] border-white/70" />
            <Text
              testID="payments-strip-day"
              className="min-w-0 flex-1 font-sans text-[12px] text-white"
            >
              Recurring charges show up here on their due dates
            </Text>
          </>
        ) : (
          <>
            <View className="size-[14px] items-center justify-center rounded-full border-[1.5px] border-lime">
              <View className="size-[5px] rounded-full bg-lime" />
            </View>
            <View className="min-w-0 flex-1 flex-row items-center gap-x-[10px] ios:flex-col ios:items-start ios:gap-x-0 ios:gap-y-[1px]">
              <Text
                testID="payments-strip-day"
                className="font-sans text-[12px] text-white"
              >
                {sel === null
                  ? 'No charges'
                  : `${formatWeekdayShort(dateOf(month, sel))} ${formatDayMonth(
                      dateOf(month, sel),
                    )}`}
              </Text>
              <Text
                testID="payments-strip-names"
                numberOfLines={1}
                className="min-w-0 flex-1 font-sans text-[12px] text-white opacity-90 ios:flex-none ios:text-[11px]"
              >
                {selCharges.map(c => c.name).join(', ')}
              </Text>
            </View>
            {selCharges.length > 0 && (
              <Text
                testID="payments-strip-total"
                className="font-sans text-[13px] text-white ios:text-[14px]"
              >
                {formatMoneyExact(
                  selCharges.reduce((s, c) => s + c.amount_cents, 0),
                )}
              </Text>
            )}
          </>
        )}
      </Glass>
    </GradientCard>
  );
}

/** A paid day: a lime disc with an ink check. */
function PaidDisc({ testID }: { testID: string }) {
  return (
    <View
      testID={testID}
      className="size-[18px] items-center justify-center self-end rounded-full bg-lime ios:size-[16px]"
    >
      <Svg width={9} height={9} viewBox="0 0 10 10">
        <Path
          d="M2 5.2l2 2 4-4.4"
          stroke={tokens.colors.ink}
          strokeWidth={1.4}
          fill="none"
        />
      </Svg>
    </View>
  );
}

/** A day still to come: its amount on desktop, a lime dot on mobile. */
function Due({ cents, testID }: { cents: number; testID: string }) {
  return (
    <>
      <Text
        testID={testID}
        numberOfLines={1}
        className="self-end font-sans text-[10px] leading-[10px] text-white ios:hidden"
      >
        {tileAmount(cents)}
      </Text>
      <View className="hidden size-[12px] items-center justify-center self-end rounded-full bg-lime/30 ios:flex">
        <View className="size-[6px] rounded-full bg-lime" />
      </View>
    </>
  );
}
