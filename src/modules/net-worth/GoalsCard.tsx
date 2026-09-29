import { Text, View } from 'react-native';

import { GradientCard } from '@/components/ui/GradientCard';
import { useGoals } from '@/hooks/useGoals';
import { useSettings } from '@/hooks/useSettings';
import { isOneOf, GOAL_SOURCES, type GoalRow } from '@/types/domain';
import {
  contributionCents,
  goalProgress,
  potCents,
  reachDate,
} from '@/utils/derive/goals';
import { formatMonthShort } from '@/utils/format/date';
import { formatMoney } from '@/utils/format/money';

/**
 * The four-stop card: each goal's progress along a hairline track, with its
 * ETA and monthly contribution from the goals derive, paced against the
 * savings or investment pot in the settings row.
 */
export function GoalsCard() {
  const goals = useGoals().data;
  const settings = useSettings().data;
  const plan = settings && {
    savingsCents: settings.monthly_savings_cents,
    investmentCents: settings.monthly_investment_cents,
  };
  const active = goals?.filter(g => goalProgress(g).fraction < 1) ?? [];
  const savedCents = (goals ?? []).reduce(
    (sum, g) => sum + g.current_amount_cents,
    0,
  );

  return (
    <GradientCard
      testID="goals-card"
      gradient="goals"
      className="flex-1 justify-between gap-y-[12px] py-[16px] ios:gap-y-[16px] ios:py-[18px]"
    >
      <View className="flex-row items-baseline justify-between gap-x-[8px]">
        <Text className="font-sans text-[13px] text-white">Savings goals</Text>
        {goals && goals.length > 0 && (
          <Text
            testID="goals-summary"
            className="font-sans text-[11px] text-white opacity-85"
          >
            {active.length} active · {formatMoney(savedCents)} saved
          </Text>
        )}
      </View>
      {goals?.length === 0 && (
        <Text
          testID="goals-empty"
          className="flex-1 font-sans text-[13px] text-white opacity-85"
        >
          No goals yet. Set one up in Goals & Planner.
        </Text>
      )}
      {plan &&
        goals?.map(g => (
          <GoalRow
            key={g.id}
            goal={g}
            pot={isOneOf(GOAL_SOURCES, g.src) ? potCents(g.src, plan) : 0}
          />
        ))}
    </GradientCard>
  );
}

function GoalRow({ goal, pot }: { goal: GoalRow; pot: number }) {
  const { fraction, savedCents, targetCents } = goalProgress(goal);
  const contribution = contributionCents(goal, pot);
  const reach = reachDate(goal, contribution);
  // The track's filled length and the knob's place: data, so not a class.
  const at = { width: `${fraction * 100}%` } as const;
  const eta =
    fraction >= 1
      ? 'Reached'
      : reach === null
      ? 'No contribution'
      : `${formatMonthShort(reach, { year: true })} · ${formatMoney(
          contribution,
        )}/mo`;

  return (
    <View testID={`goal-${goal.id}`} className="gap-y-[5px] ios:gap-y-[6px]">
      <View className="flex-row items-baseline justify-between gap-x-[8px]">
        <Text
          numberOfLines={1}
          className="shrink font-sans text-[13px] text-white ios:text-[14px]"
        >
          {goal.name}
        </Text>
        <Text className="font-sans text-[12px] text-white">
          {Math.round(fraction * 100)}%
        </Text>
      </View>
      <View className="h-[12px]">
        <View className="absolute inset-x-0 top-[6px] h-px bg-white/35" />
        <View
          testID={`goal-${goal.id}-fill`}
          className="absolute left-0 top-[5.5px] h-[2px] bg-white"
          style={at}
        />
        {/* The knob hangs from the fill's end, centred on it. */}
        <View className="absolute inset-y-0 left-0" style={at}>
          <View className="absolute -right-[6px] top-0 size-[12px] items-center justify-center rounded-full bg-lime/30">
            <View className="size-[6px] rounded-full bg-lime" />
          </View>
        </View>
        <View className="absolute right-0 top-[3px] h-[7px] w-px bg-white/70" />
      </View>
      <View className="flex-row items-baseline justify-between gap-x-[8px]">
        <Text className="font-sans text-[11px] text-white">
          {formatMoney(savedCents)}{' '}
          <Text className="opacity-80">/ {formatMoney(targetCents)}</Text>
        </Text>
        <Text
          testID={`goal-${goal.id}-eta`}
          numberOfLines={1}
          className="font-sans text-[11px] text-white opacity-85"
        >
          {eta}
        </Text>
      </View>
    </View>
  );
}
