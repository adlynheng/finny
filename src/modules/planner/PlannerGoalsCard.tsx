import { memo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cx } from '@/components/ui/cardChrome';
import { useDeleteGoal } from '@/hooks/useGoals';
import { tokens } from '@/theme/tokens';
import { goalProgress } from '@/utils/derive/goals';
import { formatMonthShort } from '@/utils/format/date';
import { formatMoney } from '@/utils/format/money';
import { GoalSheet } from './GoalSheet';
import {
  isOnTrack,
  POT_WORDS,
  SOURCE_NAMES,
  type Planner,
  type PlannerGoal,
} from './usePlanner';

/** `Savings`, `Investments`: the pot a goal is funded from. */

/**
 * The goals, each paced against its pot as the plan now stands: moving a
 * slider re-derives every share, status and ETA here. New goal opens the
 * form; each goal's × asks before deleting it. Two columns on desktop, one on mobile.
 */
export const PlannerGoalsCard = memo(function PlannerGoalsCard({
  planner,
}: {
  planner: Planner;
}) {
  const [adding, setAdding] = useState(false);
  const { goals, onTrack } = planner;
  const mobile = Platform.OS === 'ios';
  const summary = `${onTrack} of ${goals.length} on track · funded from your savings and investments allocation`;
  // Desktop pairs the goals into rows of two.
  const rows = mobile
    ? goals.map(g => [g])
    : goals.flatMap((g, i) => (i % 2 ? [] : [goals.slice(i, i + 2)]));

  return (
    <Card
      testID="plan-goals"
      className="flex-1 pb-[8px] pt-[16px] ios:p-[16px]"
    >
      <View className="flex-row items-center justify-between gap-x-[8px]">
        <View className="min-w-0 shrink flex-row items-baseline gap-x-[10px] ios:flex-col ios:items-start ios:gap-y-[2px]">
          <Text className="font-sans text-[13px] text-ink">Goals</Text>
          {goals.length > 0 && (
            <Text
              testID="plan-goals-summary"
              numberOfLines={mobile ? undefined : 1}
              className="shrink font-sans text-[12px] text-muted"
            >
              {summary}
            </Text>
          )}
        </View>
        <Button
          testID="plan-goal-new"
          variant="primary"
          size="sm"
          label="New goal"
          icon={plus}
          onPress={() => setAdding(true)}
          className="px-[13px] ios:h-[40px] ios:rounded-10 ios:px-[14px]"
        />
      </View>
      {goals.length === 0 ? (
        <Text
          testID="plan-goals-empty"
          className="mt-[14px] font-sans text-[13px] text-muted"
        >
          No goals yet. Add one and the plan paces it from your savings or
          investments.
        </Text>
      ) : (
        <ScrollView
          testID="plan-goals-list"
          className="mt-[10px] min-h-0 flex-1 ios:flex-none"
          contentContainerClassName="grow"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!mobile}
        >
          {rows.map(pair => (
            <View
              key={pair[0]!.goal.id}
              className="min-h-[150px] flex-1 flex-row gap-x-[36px] ios:min-h-0 ios:flex-none"
            >
              {pair.map(g => (
                <GoalBlock key={g.goal.id} item={g} />
              ))}
              {pair.length === 1 && !mobile && <View className="flex-1" />}
            </View>
          ))}
        </ScrollView>
      )}
      {adding && (
        <GoalSheet planner={planner} onClose={() => setAdding(false)} />
      )}
    </Card>
  );
});

const plus = (color: string) => (
  <PlusIcon
    size={Platform.OS === 'ios' ? 10 : 11}
    color={color}
    strokeWidth={1.4}
  />
);

function GoalBlock({ item }: { item: PlannerGoal }) {
  const remove = useDeleteGoal();
  const [confirming, setConfirming] = useState(false);
  const { goal, share, contributionCents, reach, status } = item;
  const { fraction, savedCents, targetCents, remainingCents } =
    goalProgress(goal);
  const source =
    SOURCE_NAMES[goal.src as keyof typeof SOURCE_NAMES] ?? goal.src;
  const contribution = `${formatMoney(contributionCents)}/mo${
    reach === null
      ? ' · no contribution'
      : remainingCents > 0
      ? ` · reached ${formatMonthShort(reach, { year: true })}`
      : ''
  }`;
  // The track's filled length and the knob's place: data, so not a class.
  const at = { width: `${fraction * 100}%` } as const;
  const id = `plan-goal-${goal.id}`;

  return (
    <View
      testID={id}
      className="min-w-0 flex-1 justify-center gap-y-[10px] border-t border-ink/[.07] py-[12px] ios:py-[14px]"
    >
      <View className="flex-row items-center justify-between gap-x-[10px]">
        <View className="min-w-0 shrink flex-row flex-wrap items-baseline gap-x-[8px]">
          <Text numberOfLines={1} className="font-sans text-[15px] text-ink">
            {goal.name}
          </Text>
          <View className="rounded-4 bg-ink/[.045] px-[7px] py-[2px]">
            <Text
              testID={`${id}-source`}
              className="font-sans text-[11px] text-muted"
            >
              {`${source} · ${Math.round(share * 100)}%`}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-x-[6px] ios:gap-x-[4px]">
          <Text
            testID={`${id}-status`}
            numberOfLines={1}
            className={cx(
              'font-sans text-[12px]',
              status.kind === 'short'
                ? 'text-danger'
                : isOnTrack(status)
                ? 'text-ink'
                : 'text-muted',
            )}
          >
            {status.label}
          </Text>
          <Pressable
            testID={`${id}-remove`}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${goal.name}`}
            onPress={() => setConfirming(true)}
            className="size-[24px] items-center justify-center rounded-5 opacity-55 hover:bg-ink/[.06] hover:opacity-100 ios:size-[32px] ios:rounded-8"
          >
            <Svg width={9} height={9} viewBox="0 0 10 10" fill="none">
              <Path
                d="M2 2l6 6M8 2L2 8"
                stroke={tokens.colors.ink}
                strokeWidth={1.3}
              />
            </Svg>
          </Pressable>
        </View>
      </View>
      <View className="flex-row items-baseline gap-x-[6px]">
        <Text className="font-sans text-[30px] font-light leading-[30px] tracking-[-0.02em] text-ink ios:text-[28px] ios:leading-[28px]">
          {formatMoney(savedCents)}
        </Text>
        <Text className="font-sans text-[13px] text-muted">
          of {formatMoney(targetCents)}
        </Text>
        <Text
          testID={`${id}-percent`}
          className="ml-auto font-sans text-[13px] tabular-nums text-ink"
        >
          {Math.round(fraction * 100)}%
        </Text>
      </View>
      <View className="h-[16px]">
        <View className="absolute inset-x-0 top-[8px] h-px bg-ink/[.14]" />
        <View
          testID={`${id}-fill`}
          className="absolute left-0 top-[7.5px] h-[2px] bg-ink"
          style={at}
        />
        {/* The knob hangs from the fill's end, centred on it. */}
        <View className="absolute inset-y-0 left-0" style={at}>
          <View className="absolute -right-[8px] top-0 size-[16px] items-center justify-center rounded-full bg-lime/35">
            <View className="size-[7px] rounded-full bg-lime" />
          </View>
        </View>
        <View className="absolute right-0 top-[4px] h-[9px] w-px bg-ink/35" />
      </View>
      <View className="flex-row justify-between gap-x-[8px]">
        <Text
          testID={`${id}-contribution`}
          numberOfLines={1}
          className="shrink font-sans text-[12px] text-muted"
        >
          {contribution}
        </Text>
        <Text className="font-sans text-[12px] text-muted">
          {goal.target_date
            ? `Target ${formatMonthShort(goal.target_date, { year: true })}`
            : 'No target date'}
        </Text>
      </View>
      <ConfirmDialog
        open={confirming}
        name={goal.name}
        detail={`${formatMoney(savedCents)} saved toward ${formatMoney(
          targetCents,
        )}.${
          contributionCents > 0
            ? ` The ${formatMoney(
                contributionCents,
              )} a month it takes stays in your ${
                POT_WORDS[goal.src as keyof typeof POT_WORDS] ?? goal.src
              }, free for your other goals.`
            : ''
        }`}
        confirmLabel="Delete goal"
        onConfirm={() =>
          remove.mutate(goal.id, { onError: () => setConfirming(false) })
        }
        onCancel={() => setConfirming(false)}
        pending={remove.isPending}
      />
    </View>
  );
}
