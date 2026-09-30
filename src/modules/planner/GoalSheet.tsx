import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { Input, noFocusRing } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { useAddGoal } from '@/hooks/useGoals';
import { tokens } from '@/theme/tokens';
import type { GoalSource } from '@/types/domain';
import {
  contributionCents,
  goalProgress,
  goalShare,
  potCents,
  reachDate,
} from '@/utils/derive/goals';
import { formatMonthShort } from '@/utils/format/date';
import {
  formatMoney,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';
import { POT_WORDS, type Planner } from './usePlanner';

/**
 * The New goal form: a name, the target, what is saved so far, the target
 * date and the pot it is funded from, each pot showing its monthly amount. A
 * live line under it gives the monthly contribution, its share of the pot and
 * when the goal would be reached, from the same goals derive the goal will
 * show once added. Add goal waits for a name and a target.
 */
export function GoalSheet({
  planner,
  onClose,
}: {
  planner: Planner;
  onClose: () => void;
}) {
  const add = useAddGoal();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [src, setSrc] = useState<GoalSource>('savings');

  const goal = {
    target_amount_cents: inputToCents(target) ?? 0,
    current_amount_cents: inputToCents(saved) ?? 0,
    target_date: date,
  };
  const pot = potCents(src, planner.plan);
  const contribution = contributionCents(goal, pot);
  const reach = reachDate(goal, contribution);
  const preview =
    goalProgress(goal).remainingCents > 0 && contribution > 0 && reach
      ? `${formatMoney(contribution)}/mo · ${Math.round(
          goalShare(goal, pot) * 100,
        )}% of ${POT_WORDS[src]} · reached ${formatMonthShort(reach, {
          year: true,
        })}`
      : 'Enter a target and date to see the timeline.';
  const valid = name.trim() !== '' && goal.target_amount_cents > 0;

  const save = () =>
    add.mutate(
      {
        name: name.trim(),
        ...goal,
        src,
        sort_order:
          Math.max(0, ...planner.goals.map(g => g.goal.sort_order)) + 1,
      },
      { onSuccess: onClose },
    );

  return (
    <Sheet
      open
      onClose={onClose}
      title="New goal"
      actions={{
        primary: {
          label: 'Add goal',
          onPress: save,
          disabled: !valid || add.isPending,
        },
      }}
      note={preview}
    >
      <Input
        testID="goal-name"
        label="Name"
        placeholder="e.g. New car"
        value={name}
        onChangeText={setName}
      />
      <FormField label="Target amount">
        <View className="flex-row items-center gap-[8px] px-[4px]">
          <Text className="font-sans text-[28px] font-light text-muted ios:text-[26px]">
            S$
          </Text>
          <TextInput
            testID="goal-target"
            accessibilityLabel="Target amount"
            value={target}
            onChangeText={t => setTarget(sanitizeAmountInput(t))}
            placeholder="0"
            placeholderTextColor={tokens.colors.muted2}
            keyboardType="decimal-pad"
            {...noFocusRing}
            className="min-w-0 flex-1 p-0 font-sans text-[52px] font-light tracking-[-0.03em] text-ink ios:h-[58px] ios:text-[48px]"
          />
        </View>
      </FormField>
      {/* Side by side on desktop; on iOS the date gets its own row, since
          its calendar opens inline under it and needs the sheet's width. */}
      <View
        testID="goal-when"
        className="flex-row gap-[10px] ios:flex-col ios:gap-sheet-gap"
      >
        <Input
          testID="goal-saved"
          label="Saved so far"
          prefix="S$"
          placeholder="0"
          keyboardType="decimal-pad"
          value={saved}
          onChangeText={t => setSaved(sanitizeAmountInput(t))}
          className="flex-1 ios:flex-none"
        />
        <DatePicker
          label="Target date"
          value={date}
          onChange={setDate}
          className="flex-1 ios:flex-none"
        />
      </View>
      <FormField label="Funded from">
        <Segmented
          testID="goal-source"
          size="type"
          options={[
            {
              value: 'savings',
              label: `Savings · ${formatMoney(planner.plan.savingsCents)}/mo`,
            },
            {
              value: 'investment',
              label: `Investments · ${formatMoney(
                planner.plan.investmentCents,
              )}/mo`,
            },
          ]}
          value={src}
          onChange={v => setSrc(v as GoalSource)}
        />
      </FormField>
      {add.isError && (
        <Text testID="goal-error" className="font-sans text-[12px] text-danger">
          Couldn’t save the goal. Try again.
        </Text>
      )}
    </Sheet>
  );
}
