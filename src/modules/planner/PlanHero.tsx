import { useCallback, useMemo, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';

import { EmptyDial } from '@/components/charts/EmptyDial';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cardChrome';
import { Glass } from '@/components/ui/Glass';
import { GradientFill } from '@/components/ui/GradientFill';
import { noFocusRing } from '@/components/ui/Input';
import { useUpsertIncomeSource } from '@/hooks/useIncomeSources';
import { useUpdateSettings } from '@/hooks/useSettings';
import { DEFAULT_PAYDAY } from '@/modules/settings/income';
import { today } from '@/lib/today';
import { usePlanStore, type Plan } from '@/stores/planStore';
import { gradients } from '@/theme/gradients';
import { tokens } from '@/theme/tokens';
import { leftLabel } from '@/utils/derive/plan';
import { formatMonthShort } from '@/utils/format/date';
import {
  formatAmount,
  formatMoney,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';
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
 *
 * With no income there is nothing to allocate: the design's empty hero, which
 * asks for the gross monthly income to start from.
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
  if (planner.grossCents === 0) {
    return <EmptyPlanHero />;
  }
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

/**
 * No income yet: S$0 to allocate, dashed rows where the sliders will be, and a
 * field for the gross monthly income. Start plan saves it as a monthly salary
 * stream (as Settings' Fixed variables would), and the plan takes over.
 */
function EmptyPlanHero() {
  const [draft, setDraft] = useState('');
  const upsert = useUpsertIncomeSource();
  const mobile = Platform.OS === 'ios';
  const cents = inputToCents(draft) ?? 0;
  const start = () => {
    if (cents <= 0) return;
    upsert.mutate({
      type: 'salary',
      name: 'Salary',
      base_income_cents: cents,
      frequency: 'monthly',
      custom_every: null,
      custom_unit: null,
      payday: DEFAULT_PAYDAY,
      start_date: today(),
    });
  };
  const heading = (
    <View className="gap-y-[12px] ios:gap-y-[10px]">
      <View className="flex-row items-center gap-x-[12px] ios:gap-x-[10px]">
        <Text className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]">
          Monthly plan
        </Text>
        <Glass recipe="chip" radius={6} className="px-[10px] py-[6px]">
          <Text className="font-sans text-[12px] text-muted">
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
          className="font-sans text-[68px] font-light leading-[65px] tracking-[-0.035em] text-ink ios:text-[56px] ios:leading-[53px]"
        >
          0
        </Text>
        <Text className="mb-[6px] ml-[6px] self-end font-sans text-[15px] text-muted ios:mb-[5px] ios:ml-[4px] ios:text-[14px]">
          to allocate
        </Text>
      </View>
      <Text testID="plan-sub" className="font-sans text-[14px] text-muted">
        Enter your gross monthly income. CPF and fixed costs come off the top
        first.
      </Text>
    </View>
  );
  const ghosts = (
    <View testID="plan-ghost-sliders" className="gap-y-[2px]">
      {[0, 1, 2].map(i => (
        <View
          key={i}
          testID="plan-ghost-slider"
          className="flex-row items-center gap-x-[18px] py-[5px] ios:gap-x-[12px]"
        >
          <View className="w-[150px] gap-y-[6px] ios:w-[96px]">
            <View className="h-[7px] w-[70%] rounded-full bg-ink/[.08]" />
            <View className="h-[5px] w-[40%] rounded-full bg-ink/[.05]" />
          </View>
          <View className="h-[28px] min-w-0 flex-1 justify-center">
            <View className="border-t border-dashed border-ink/20" />
            <View className="absolute -left-[5px] size-[10px] rounded-full border border-ink/25 bg-canvas" />
          </View>
          <View className="h-[34px] w-[124px] rounded-6 border border-dashed border-ink/[.16] ios:w-[88px]" />
        </View>
      ))}
    </View>
  );
  const income = (
    <View className="flex-row flex-wrap items-center gap-[10px] pt-[4px]">
      <View className="size-[16px] items-center justify-center rounded-full bg-lime/30">
        <View className="size-[6px] rounded-full bg-lime" />
      </View>
      <Text className="font-sans text-[13px] text-ink">
        Gross monthly income
      </Text>
      <View className="h-[34px] w-[150px] flex-row items-center gap-x-[4px] rounded-6 border border-ink/[.12] bg-white px-[10px] ios:h-[42px] ios:flex-1 ios:rounded-10">
        <Text className="font-sans text-[13px] text-muted">S$</Text>
        <TextInput
          testID="plan-income-input"
          accessibilityLabel="Gross monthly income"
          value={draft}
          onChangeText={t => setDraft(sanitizeAmountInput(t))}
          onSubmitEditing={start}
          placeholder="0"
          keyboardType="decimal-pad"
          placeholderTextColor={tokens.colors.muted2}
          {...noFocusRing}
          className="min-w-0 flex-1 p-0 text-right font-sans text-[15px] text-ink"
        />
      </View>
      <Button
        testID="plan-start"
        variant="primary"
        size={mobile ? 'touch' : 'md'}
        label="Start plan"
        onPress={start}
        disabled={cents <= 0 || upsert.isPending}
        className="ml-auto px-[16px] py-[8px] ios:ml-0 ios:w-full"
      />
    </View>
  );
  const dial = (
    <View
      pointerEvents="none"
      className={cx(
        'aspect-square items-center justify-center',
        mobile ? 'w-full max-w-[300px] self-center' : 'mr-[44px] h-full',
      )}
    >
      <View className="absolute aspect-square w-[70%]">
        <GradientFill gradient={gradients.heroGlowDial} />
      </View>
      <EmptyDial count={40} filled={0} mark={-1} big="S$0" small="allocated" />
    </View>
  );

  if (mobile) {
    return (
      <>
        <View className="px-[4px]">{heading}</View>
        {dial}
        <Glass
          recipe="chip"
          radius={8}
          className="gap-y-[10px] px-[14px] pb-[14px] pt-[10px]"
        >
          {ghosts}
          <View className="border-t border-ink/[.08] pt-[10px]">{income}</View>
        </Glass>
      </>
    );
  }
  return (
    <View testID="plan-hero" className="flex-1 flex-row gap-x-[40px]">
      <View className="min-w-0 flex-1 gap-y-[12px] pl-[6px] pt-[6px]">
        {heading}
        <View className="mt-auto border-t border-ink/[.08] pt-[10px]">
          {ghosts}
        </View>
        {income}
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
