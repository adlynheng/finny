import { useCallback, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cardChrome';
import { Glass } from '@/components/ui/Glass';
import { useUpdateSettings } from '@/hooks/useSettings';
import { today } from '@/lib/today';
import { usePlanStore, type Plan } from '@/stores/planStore';
import { leftLabel } from '@/utils/derive/plan';
import { formatMonthShort } from '@/utils/format/date';
import { formatAmount, formatMoney } from '@/utils/format/money';
import { AllocationRow } from './AllocationRow';
import { ALLOCATIONS, PlanDial, type AllocationId } from './PlanDial';
import type { Planner } from './usePlanner';

const TONE = { ink: 'text-ink', muted: 'text-muted', danger: 'text-danger' };

/**
 * The plan: what is left to allocate, the three allocation sliders, how many
 * goals the plan keeps on track, Reset / Save plan, and the dial. The row
 * being hovered or focused is held here, so only the hero re-renders with it.
 *
 * A drag re-renders only what reads out the amount (the row, the figure left
 * and the status line) in step with the pointer, like a chart's hover. The
 * dial, like the goals below, draws from `settled`, a throttled copy of the
 * planner, so it follows a dozen times a second rather than every frame.
 *
 * Desktop sets the dial beside the rest; mobile stacks the summary, the dial,
 * then the sliders and status in a glass panel.
 */
export function PlanHero({
  planner,
  settled,
}: {
  planner: Planner;
  /** The planner as the dial shows it: `planner`, throttled. */
  settled: Planner;
}) {
  const [highlighted, setHighlighted] = useState<AllocationId | null>(null);
  const mobile = Platform.OS === 'ios';
  const onHighlight = useCallback(
    (id: AllocationId, on: boolean) =>
      setHighlighted(h => (on ? id : h === id ? null : h)),
    [],
  );
  const dial = (
    <PlanDial
      planner={settled}
      highlighted={highlighted}
      className={
        mobile ? 'w-full max-w-[300px] self-center' : 'mr-[44px] h-full'
      }
    />
  );
  const sliders = (
    <Sliders
      planner={planner}
      highlighted={highlighted}
      onHighlight={onHighlight}
    />
  );

  if (mobile) {
    return (
      <>
        <View className="px-[4px]">
          <Summary planner={planner} />
        </View>
        {dial}
        <Glass
          recipe="chip"
          radius={8}
          className="gap-y-[4px] px-[14px] pb-[14px] pt-[10px]"
        >
          {sliders}
          <Status planner={planner} />
        </Glass>
      </>
    );
  }
  return (
    <View testID="plan-hero" className="flex-1 flex-row gap-x-[40px]">
      <View className="min-w-0 flex-1 gap-y-[12px] pl-[6px] pt-[6px]">
        <Summary planner={planner} />
        <View className="mt-auto gap-y-[2px] border-t border-ink/[.08] pt-[10px]">
          {sliders}
        </View>
        <Status planner={planner} />
      </View>
      {dial}
    </View>
  );
}

/** "Monthly plan", the month, what is left to allocate and where gross goes first. */
function Summary({ planner }: { planner: Planner }) {
  const { grossCents, cpfCents, fixedCents, leftCents } = planner;
  const label = leftLabel(leftCents);
  return (
    <View className="gap-y-[12px] ios:gap-y-[10px]">
      <View className="flex-row items-center gap-x-[12px] ios:gap-x-[10px]">
        <Text className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]">
          Monthly plan
        </Text>
        <Glass recipe="chip" radius={6} className="px-[10px] py-[6px]">
          <Text
            testID="plan-month"
            className="font-sans text-[12px] text-muted"
          >
            {formatMonthShort(today(), { year: true })}
          </Text>
        </Glass>
      </View>
      <View className="flex-row flex-wrap items-start gap-x-[6px] ios:gap-x-[5px]">
        <Text className="mt-[10px] font-sans text-[22px] font-light text-muted ios:mt-[8px] ios:text-[20px]">
          S$
        </Text>
        <Text
          testID="plan-left"
          className="font-sans text-[68px] font-light leading-[65px] tracking-[-0.035em] tabular-nums text-ink ios:text-[56px] ios:leading-[53px]"
        >
          {formatAmount(leftCents)}
        </Text>
        <Text
          testID="plan-left-label"
          className={cx(
            'mb-[6px] ml-[6px] self-end font-sans text-[15px] ios:mb-[5px] ios:ml-[4px] ios:text-[14px]',
            TONE[label.tone],
          )}
        >
          {label.text}
        </Text>
      </View>
      <Text testID="plan-sub" className="font-sans text-[14px] text-muted">
        {`of ${formatMoney(grossCents)} gross · ${formatMoney(
          cpfCents + fixedCents,
        )} goes to CPF and fixed costs first`}
      </Text>
    </View>
  );
}

function Sliders({
  planner,
  highlighted,
  onHighlight,
}: {
  planner: Planner;
  highlighted: AllocationId | null;
  onHighlight: (id: AllocationId, on: boolean) => void;
}) {
  const patchDraft = usePlanStore(s => s.patchDraft);
  const { saved } = planner;
  // Each row's own handlers, kept across renders so an unmoved row skips.
  const handlers = useMemo(
    () =>
      ALLOCATIONS.map(a => ({
        highlight: (on: boolean) => onHighlight(a.id, on),
        change: (cents: number) =>
          patchDraft(saved, { [a.field]: cents } as Partial<Plan>),
      })),
    [onHighlight, patchDraft, saved],
  );
  return ALLOCATIONS.map((a, i) => (
    <AllocationRow
      key={a.id}
      id={a.id}
      name={a.name}
      cents={planner.plan[a.field]}
      grossCents={planner.grossCents}
      highlighted={highlighted === a.id}
      onHighlight={handlers[i]!.highlight}
      onChange={handlers[i]!.change}
    />
  ));
}

/** How many goals the plan keeps on track, whether it is saved, and Reset / Save plan. */
function Status({ planner }: { planner: Planner }) {
  const resetDraft = usePlanStore(s => s.resetDraft);
  const update = useUpdateSettings();
  const { dirty, plan, goals, onTrack } = planner;
  const mobile = Platform.OS === 'ios';
  const save = () =>
    update.mutate(
      {
        monthly_investment_cents: plan.investmentCents,
        monthly_savings_cents: plan.savingsCents,
        monthly_expenditure_cents: plan.expenditureCents,
      },
      { onSuccess: resetDraft },
    );
  const impact = (
    <Text testID="plan-impact" className="font-sans text-[13px] text-ink">
      {onTrack} of {goals.length} goals on track
    </Text>
  );
  const saved = (
    <Text
      testID="plan-saved"
      className="font-sans text-[13px] text-muted ios:text-[12px]"
    >
      {dirty ? '· unsaved changes' : '· matches saved plan'}
    </Text>
  );
  const dot = (
    <View className="size-[16px] items-center justify-center rounded-full bg-lime/30">
      <View className="size-[6px] rounded-full bg-lime" />
    </View>
  );
  const clean = !dirty || update.isPending;

  if (mobile) {
    return (
      <>
        <View className="flex-row items-center gap-x-[8px] border-t border-ink/[.08] pt-[10px]">
          {dot}
          <View className="min-w-0 gap-y-[1px]">
            {impact}
            {saved}
          </View>
        </View>
        <View className="mt-[6px] flex-row gap-x-[8px]">
          <Button
            testID="plan-reset"
            variant="soft"
            size="touch"
            label="Reset"
            onPress={resetDraft}
            disabled={clean}
            className="flex-1"
          />
          <Button
            testID="plan-save"
            variant="primary"
            size="touch"
            label="Save plan"
            onPress={save}
            disabled={clean}
            className="flex-2"
          />
        </View>
      </>
    );
  }
  return (
    <View className="flex-row items-center gap-x-[10px] pt-[4px]">
      {dot}
      {impact}
      {saved}
      <View className="ml-auto flex-row gap-x-[6px]">
        <Button
          testID="plan-reset"
          variant="ghost"
          label="Reset"
          onPress={resetDraft}
          disabled={clean}
          className="px-[14px] py-[8px]"
        />
        <Button
          testID="plan-save"
          variant="primary"
          label="Save plan"
          onPress={save}
          disabled={clean}
          className="px-[16px] py-[8px]"
        />
      </View>
    </View>
  );
}
