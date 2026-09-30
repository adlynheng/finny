import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { categoryIcon } from '@/components/icons/registry';
import { AddButton, EmptyNote, GhostRows } from '@/components/ui/Empty';
import { Glass } from '@/components/ui/Glass';
import { GradientCard } from '@/components/ui/GradientCard';
import { useCategories } from '@/hooks/useCategories';
import { useRecurringCharges } from '@/hooks/useRecurringCharges';
import { tokens } from '@/theme/tokens';
import type { CategoryRow, RecurringChargeRow } from '@/types/domain';
import {
  intervalLabel,
  monthlyEquivalentCents,
  nextDue,
  periodSuffix,
  scheduleOf,
} from '@/utils/derive/recurrence';
import { formatDayMonth } from '@/utils/format/date';
import { formatMoney, formatMoneyExact } from '@/utils/format/money';
import { RecurringChargeSheet } from './RecurringChargeSheet';

/** A hovered row: raised 2px, with a shadow under it. */
const LIFTED = {
  boxShadow: '0 10px 22px rgba(46,34,28,.22)',
  transform: [{ translateY: -2 }],
};

/**
 * The recurring charges: their total as a monthly equivalent, then each
 * charge largest first, with its category, interval and next due date. Add
 * and a row press open the charge form; saving or deleting there refreshes
 * this list and the payments calendar together. With none yet it is the
 * design's empty card: dashed rows where charges will go, and a note on what
 * adding one does.
 */
export function RecurringChargesCard() {
  const charges = (useRecurringCharges().data ?? []).filter(c => c.is_active);
  const categories = useCategories('expense').data ?? [];
  // Null: closed. 'new', or the charge being edited.
  const [editing, setEditing] = useState<RecurringChargeRow | 'new' | null>(
    null,
  );

  const rows = charges
    .map(c => ({ charge: c, schedule: scheduleOf(c) }))
    .filter(r => r.schedule !== null)
    .sort((a, b) => b.charge.amount_cents - a.charge.amount_cents);
  const totalCents = rows.reduce(
    (sum, r) =>
      sum + monthlyEquivalentCents(r.charge.amount_cents, r.schedule!),
    0,
  );
  const mobile = Platform.OS === 'ios';

  return (
    <GradientCard
      testID="recurring-card"
      gradient="commitments"
      className="flex-1"
    >
      <View className="flex-row items-start justify-between gap-x-[8px] ios:items-center">
        <Text className="font-sans text-[13px] text-white">
          Recurring charges
        </Text>
        <Pressable
          testID="recurring-add"
          accessibilityRole="button"
          accessibilityLabel="Add recurring charge"
          onPress={() => setEditing('new')}
          className="group"
        >
          <Glass
            recipe="onGradient"
            radius={mobile ? 9 : 6}
            fill="bg-white/[.16] group-hover:bg-white/30"
            className="flex-row items-center gap-x-[6px] px-[11px] py-[6px] ios:h-[36px] ios:px-[13px] ios:py-0"
          >
            <PlusIcon size={10} color={tokens.colors.white} strokeWidth={1.4} />
            <Text className="font-sans text-[12px] text-white ios:text-[13px]">
              Add
            </Text>
          </Glass>
        </Pressable>
      </View>
      <View className="mt-[10px] flex-row flex-wrap items-baseline gap-x-[8px]">
        <Text
          testID="recurring-total"
          className="font-sans text-[38px] font-light leading-[38px] tracking-[-0.02em] text-white ios:text-[36px] ios:leading-[36px]"
        >
          {formatMoney(totalCents)}
        </Text>
        <Text className="font-sans text-[13px] text-white opacity-90">
          per month · {rows.length} {rows.length === 1 ? 'charge' : 'charges'}
        </Text>
      </View>
      {/* The list reaches the card's edges, its padding inside the scroll (the
          design's 8px bottom plus the card's), so a hovered row's shadow
          fades out rather than being cut off. */}
      {rows.length === 0 ? (
        <View
          testID="recurring-empty"
          className="mt-[16px] min-h-0 flex-1 gap-y-[14px]"
        >
          <GhostRows count={3} tone="gradient" />
          <EmptyNote
            tone="gradient"
            className="mt-auto"
            title="No recurring charges"
            body="Add subscriptions, rent or insurance once. Finny puts each due date on the calendar and counts it in your budget."
            action={
              <AddButton
                testID="recurring-add-first"
                variant="light"
                label="Add recurring charge"
                onPress={() => setEditing('new')}
              />
            }
          />
        </View>
      ) : (
        <ScrollView
          className="-mx-card -mb-card mt-[12px] min-h-0 flex-1 ios:mx-0 ios:mb-0 ios:mt-[14px] ios:flex-none"
          contentContainerClassName="gap-y-[4px] px-card pb-[26px] pt-[4px] ios:px-0 ios:pb-0 ios:pt-0"
          showsVerticalScrollIndicator={false}
          // Mobile lists every charge in the page's own scroll.
          scrollEnabled={!mobile}
        >
          {rows.map(({ charge, schedule }) => (
            <ChargeRow
              key={charge.id}
              charge={charge}
              category={categories.find(c => c.id === charge.category_id)}
              interval={intervalLabel(schedule!)}
              per={periodSuffix(schedule!)}
              next={nextDue(schedule!)}
              onPress={() => setEditing(charge)}
            />
          ))}
        </ScrollView>
      )}
      {editing !== null && (
        <RecurringChargeSheet
          charge={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </GradientCard>
  );
}

function ChargeRow({
  charge,
  category,
  interval,
  per,
  next,
  onPress,
}: {
  charge: RecurringChargeRow;
  category: CategoryRow | undefined;
  interval: string;
  per: string;
  next: string | null;
  onPress: () => void;
}) {
  // Hover lifts the row: kept here, so only the hovered row re-renders.
  const [lifted, setLifted] = useState(false);
  const sub = [
    category?.name ?? 'Uncategorised',
    interval,
    ...(next ? [`next ${formatDayMonth(next)}`] : []),
  ].join(' · ');

  return (
    <Pressable
      testID={`recurring-row-${charge.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${charge.name}`}
      onPress={onPress}
      onHoverIn={() => setLifted(true)}
      onHoverOut={() => setLifted(false)}
      className="rounded-8"
      // The lift, as style rather than a class: NativeWind's translate classes
      // run on CSS variables, and adding one after the first render remounts
      // the row (and its dev warning crashes on the navigation context). The
      // shadow sits on the pressable, which clips nothing.
      style={lifted ? LIFTED : undefined}
    >
      <Glass
        recipe="onGradient"
        radius={8}
        fill={lifted ? 'bg-white/[.24]' : undefined}
        className="flex-row items-center gap-x-[12px] px-[12px] py-[9px] ios:min-h-[52px] ios:py-[10px]"
      >
        <View className="size-[30px] items-center justify-center rounded-8 bg-white/[.14]">
          <Icon
            path={categoryIcon('expense', category?.icon)}
            size={15}
            color={tokens.colors.white}
          />
        </View>
        <View className="min-w-0 flex-1 gap-y-[1px]">
          <Text
            numberOfLines={1}
            className="font-sans text-[13px] text-white ios:text-[14px]"
          >
            {charge.name}
          </Text>
          <Text
            testID={`recurring-row-${charge.id}-sub`}
            numberOfLines={1}
            className="font-sans text-[11px] text-white opacity-[.88]"
          >
            {sub}
          </Text>
        </View>
        <View className="items-end gap-y-[1px]">
          <Text
            testID={`recurring-row-${charge.id}-amount`}
            className="font-sans text-[14px] text-white"
          >
            {formatMoneyExact(charge.amount_cents)}
          </Text>
          <Text className="font-sans text-[10px] text-white opacity-85">
            {per}
          </Text>
        </View>
      </Glass>
    </Pressable>
  );
}
