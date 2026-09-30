import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { cx } from '@/components/ui/cardChrome';
import { AddButton } from '@/components/ui/Empty';
import { Glass } from '@/components/ui/Glass';
import { noFocusRing } from '@/components/ui/Input';
import { useUpdateSettings } from '@/hooks/useSettings';
import { tokens } from '@/theme/tokens';
import { formatMonthShort } from '@/utils/format/date';
import {
  centsToInput,
  formatAmount,
  formatMoney,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';
import type { Budget } from './useBudget';

/**
 * The budget hero's text: the heading, what is left to spend (or how far
 * over, in the danger colour), and the limit with the days to go. Edit limit
 * swaps that line in place for a Monthly limit field with Save and Cancel —
 * inline, not a modal — and Save writes `settings.monthly_expenditure_cents`.
 *
 * With no limit set it is the design's empty hero: this month beside the
 * heading, S$0 with "no limit set", and a Set limit button that opens the
 * same field.
 */
export function BudgetSummary({ budget }: { budget: Budget | null }) {
  const [draft, setDraft] = useState<string | null>(null);
  const update = useUpdateSettings();
  const over = budget !== null && budget.leftCents < 0;
  const unset = budget !== null && budget.limitCents === 0;

  const save = () => {
    const cents = inputToCents(draft ?? '');
    if (cents !== null && cents > 0) {
      update.mutate({ monthly_expenditure_cents: cents });
    }
    setDraft(null);
  };

  return (
    <View testID="budget-summary" className="gap-y-[12px] ios:gap-y-[10px]">
      <View className="flex-row items-center gap-x-[12px] ios:gap-x-[10px]">
        <Text
          role="heading"
          className="font-sans text-[40px] font-normal leading-[40px] tracking-[-0.02em] text-ink ios:text-[32px] ios:leading-[32px]"
        >
          Budget
        </Text>
        {unset && (
          <Glass
            testID="budget-month"
            recipe="chip"
            radius={6}
            className="px-[10px] py-[6px]"
          >
            <Text className="font-sans text-[12px] text-muted">
              {formatMonthShort(budget.month, { year: true })}
            </Text>
          </Glass>
        )}
      </View>
      {budget && (
        <>
          <View className="flex-row flex-wrap items-start gap-x-[6px] ios:gap-x-[5px]">
            <Text className="mt-[10px] font-sans text-[22px] font-light text-muted ios:mt-[8px] ios:text-[20px]">
              S$
            </Text>
            <Text
              testID="budget-left"
              className={cx(
                'font-sans text-[68px] font-light leading-[65px] tracking-[-0.035em] ios:text-[56px] ios:leading-[53px]',
                over ? 'text-danger' : 'text-ink',
              )}
            >
              {formatAmount(unset ? 0 : budget.leftCents)}
            </Text>
            <Text
              testID="budget-left-label"
              className={cx(
                'mb-[6px] ml-[6px] self-end font-sans text-[15px] ios:mb-[5px] ios:ml-[4px] ios:text-[14px]',
                over ? 'text-danger' : 'text-muted',
              )}
            >
              {unset ? 'no limit set' : over ? 'over limit' : 'left to spend'}
            </Text>
          </View>
          <View className="min-h-[32px] flex-row flex-wrap items-center gap-[10px] ios:min-h-[40px] ios:gap-[8px]">
            {draft === null && unset ? (
              <>
                <Text
                  testID="budget-limit"
                  className="font-sans text-[14px] text-muted ios:text-[13px]"
                >
                  Set a monthly limit to track what's safe to spend
                </Text>
                <AddButton
                  testID="budget-edit"
                  label="Set limit"
                  onPress={() => setDraft('')}
                />
              </>
            ) : draft === null ? (
              <>
                <Text
                  testID="budget-limit"
                  className="font-sans text-[14px] text-muted ios:text-[13px]"
                >
                  of {formatMoney(budget.limitCents)} monthly limit ·{' '}
                  {budget.daysLeft} {budget.daysLeft === 1 ? 'day' : 'days'} to
                  go
                </Text>
                <Pressable
                  testID="budget-edit"
                  accessibilityRole="button"
                  onPress={() => setDraft(centsToInput(budget.limitCents))}
                >
                  <Glass
                    recipe="chip"
                    radius={6}
                    className="px-[10px] py-[6px] ios:h-[34px] ios:justify-center"
                  >
                    <Text className="font-sans text-[12px] text-ink">
                      Edit limit
                    </Text>
                  </Glass>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="font-sans text-[14px] text-muted ios:hidden">
                  Monthly limit
                </Text>
                <View className="h-[32px] flex-row items-center gap-x-[4px] rounded-6 border border-ink/[.12] bg-white px-[10px] ios:h-[40px] ios:min-w-0 ios:flex-1 ios:gap-x-[6px] ios:rounded-10 ios:border-input-border ios:px-[12px]">
                  <Text className="font-sans text-[13px] text-muted">S$</Text>
                  <TextInput
                    testID="budget-limit-input"
                    accessibilityLabel="Monthly limit"
                    autoFocus
                    value={draft}
                    onChangeText={t => setDraft(sanitizeAmountInput(t))}
                    onSubmitEditing={save}
                    placeholder="3,000"
                    keyboardType="decimal-pad"
                    placeholderTextColor={tokens.colors.muted2}
                    {...noFocusRing}
                    className="w-[80px] p-0 font-sans text-[14px] text-ink ios:w-auto ios:min-w-0 ios:flex-1 ios:text-[15px]"
                  />
                </View>
                <Pressable
                  testID="budget-save"
                  accessibilityRole="button"
                  onPress={save}
                  className="rounded-6 bg-ink px-[12px] py-[7px] hover:bg-ink-hover ios:h-[40px] ios:justify-center ios:rounded-10 ios:px-[16px] ios:py-0"
                >
                  <Text className="font-sans text-[12px] text-white ios:text-[13px]">
                    Save
                  </Text>
                </Pressable>
                <Pressable
                  testID="budget-cancel"
                  accessibilityRole="button"
                  onPress={() => setDraft(null)}
                  className="px-[10px] py-[7px] ios:h-[40px] ios:justify-center ios:px-[8px] ios:py-0"
                >
                  <Text className="font-sans text-[12px] text-muted ios:text-[13px]">
                    Cancel
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
