import { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { addMonths, startOfMonth } from 'date-fns';

import { Icon } from '@/components/icons/Icon';
import { categoryIcon } from '@/components/icons/registry';
import { ChipRow, type ChipOption } from '@/components/ui/ChipRow';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { Input, noFocusRing } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import {
  useDeleteRecurringCharge,
  useUpsertRecurringCharge,
} from '@/hooks/useRecurringCharges';
import { now } from '@/lib/today';
import {
  CUSTOM_UNITS,
  FREQUENCIES,
  isOneOf,
  type CustomUnit,
  type Frequency,
  type RecurringChargeRow,
} from '@/types/domain';
import {
  monthlyEquivalentCents,
  nextDue,
  type Schedule,
} from '@/utils/derive/recurrence';
import { toIsoDate } from '@/utils/format/date';
import {
  centsToInput,
  formatMoney,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';
import { scheduleOf } from './payments';

/** The recurring-charge categories, in the design's order. */
const CATEGORY_SET = [
  'Subscriptions',
  'Bills',
  'Insurance',
  'Housing',
  'Health',
  'Services',
  'Other',
];

const capitalise = (w: string) => w[0]!.toUpperCase() + w.slice(1);
const INTERVALS = FREQUENCIES.map(f => ({ value: f, label: capitalise(f) }));
const UNITS = CUSTOM_UNITS.map(u => ({ value: u, label: capitalise(u) }));

const chip = (id: number, label: string): ChipOption<string> => ({
  value: String(id),
  label,
});

/** A category chip's icon, at the chip's text colour and size. */
const chipIcon = (path: string) => (color: string, size: number) =>
  <Icon path={path} color={color} size={size} strokeWidth={1.2} />;

/**
 * The recurring-charge form in the Sheet: name and amount, category, the
 * account it is paid from, the interval (with an Every N days / weeks / months
 * row for Custom), the next due date, and a live `≈ S$X per month` from the
 * recurrence derive. Editing adds Delete; its past payments stay in the
 * ledger. Mount it only while open, so each opening starts from `charge`.
 */
export function RecurringChargeSheet({
  charge,
  onClose,
}: {
  /** The charge to edit, or null for a new one. */
  charge: RecurringChargeRow | null;
  onClose: () => void;
}) {
  const expense = useCategories('expense').data ?? [];
  const accounts = (useAccounts().data ?? []).filter(
    a => a.is_active && (a.type === 'Savings' || a.type === 'Credit card'),
  );
  const upsert = useUpsertRecurringCharge();
  const remove = useDeleteRecurringCharge();
  const mobile = Platform.OS === 'ios';

  const schedule = charge && scheduleOf(charge);
  const [name, setName] = useState(charge?.name ?? '');
  const [amount, setAmount] = useState(
    charge ? centsToInput(charge.amount_cents) : '',
  );
  const [categoryId, setCategoryId] = useState(charge?.category_id ?? null);
  const [accountId, setAccountId] = useState(charge?.account_id ?? null);
  const [frequency, setFrequency] = useState<Frequency>(
    schedule?.frequency ?? 'monthly',
  );
  const [every, setEvery] = useState(String(charge?.custom_every ?? 2));
  const [unit, setUnit] = useState<CustomUnit>(
    isOneOf(CUSTOM_UNITS, charge?.custom_unit) ? charge.custom_unit : 'weeks',
  );
  // An existing charge opens on its next due date; a new one on the 1st of next month.
  const [date, setDate] = useState(
    () =>
      (schedule && nextDue(schedule)) ??
      charge?.start_date ??
      toIsoDate(startOfMonth(addMonths(now(), 1))),
  );

  const categories = expense
    .filter(c => CATEGORY_SET.includes(c.name) || c.id === charge?.category_id)
    .sort((a, b) => rank(CATEGORY_SET, a.name) - rank(CATEGORY_SET, b.name));
  const category = categoryId ?? categories[0]?.id ?? null;
  const account =
    accountId ??
    (accounts.find(a => a.type === 'Savings') ?? accounts[0])?.id ??
    null;

  const cents = inputToCents(amount) ?? 0;
  const everyN = Number(every);
  const custom = frequency === 'custom';
  const validEvery = !custom || (Number.isInteger(everyN) && everyN >= 1);
  const draft: Schedule = {
    frequency,
    custom_every: custom ? everyN : null,
    custom_unit: custom ? unit : null,
    start_date: date,
  };
  const valid = name.trim() !== '' && cents > 0 && validEvery;

  const save = () => {
    if (!valid) {
      return;
    }
    const fields = {
      name: name.trim(),
      amount_cents: cents,
      category_id: category,
      account_id: account,
      frequency,
      custom_every: draft.custom_every,
      custom_unit: draft.custom_unit,
      start_date: date,
    };
    upsert.mutate(charge ? { id: charge.id, ...fields } : fields, {
      onSuccess: onClose,
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={charge ? 'Edit recurring charge' : 'New recurring charge'}
      width="narrow"
      note={
        cents > 0 && validEvery
          ? `≈ ${formatMoney(monthlyEquivalentCents(cents, draft), {
              decimals: 2,
            })} per month`
          : undefined
      }
      actions={{
        primary: {
          label: charge ? 'Save changes' : 'Add charge',
          onPress: save,
          disabled: !valid || upsert.isPending,
        },
        danger: charge
          ? {
              label: mobile ? 'Delete charge' : 'Delete',
              onPress: () => remove.mutate(charge.id, { onSuccess: onClose }),
              disabled: remove.isPending,
            }
          : undefined,
      }}
    >
      <View className="flex-row gap-[10px] ios:flex-col ios:gap-sheet-gap">
        <Input
          testID="rf-name"
          label="Name"
          placeholder="e.g. Disney+"
          value={name}
          onChangeText={setName}
          className="flex-[1.4] ios:flex-none"
        />
        <Input
          testID="rf-amount"
          label="Amount"
          prefix="S$"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={t => setAmount(sanitizeAmountInput(t))}
          className="flex-1 ios:flex-none"
        />
      </View>
      <FormField label="Category">
        <ChipRow
          testID="rf-category"
          options={categories.map(c => ({
            ...chip(c.id, c.name),
            icon: chipIcon(categoryIcon('expense', c.icon)),
          }))}
          value={category === null ? null : String(category)}
          onChange={v => setCategoryId(Number(v))}
        />
      </FormField>
      <FormField label="Paid from">
        <ChipRow
          testID="rf-account"
          options={accounts.map(a => chip(a.id, a.name))}
          value={account === null ? null : String(account)}
          onChange={v => setAccountId(Number(v))}
        />
      </FormField>
      <FormField label="Interval">
        {mobile ? (
          <ChipRow
            testID="rf-interval"
            options={INTERVALS}
            value={frequency}
            onChange={setFrequency}
          />
        ) : (
          <Segmented
            testID="rf-interval"
            options={INTERVALS}
            value={frequency}
            onChange={setFrequency}
          />
        )}
        {custom && (
          <View
            testID="rf-custom"
            className="flex-row items-center gap-x-[8px]"
          >
            <Text className="font-sans text-[13px] text-muted">Every</Text>
            <TextInput
              testID="rf-every"
              accessibilityLabel="Every"
              value={every}
              onChangeText={t => setEvery(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              {...noFocusRing}
              className="h-[32px] w-[44px] rounded-6 border border-input-border bg-white p-0 text-center font-sans text-[13px] text-ink ios:h-[40px] ios:w-[52px] ios:rounded-8 ios:text-[14px]"
            />
            <Segmented
              testID="rf-unit"
              size="compact"
              options={UNITS}
              value={unit}
              onChange={setUnit}
            />
          </View>
        )}
      </FormField>
      <DatePicker label="Next due" value={date} onChange={setDate} />
      {(upsert.isError || remove.isError) && (
        <Text testID="rf-error" className="font-sans text-[12px] text-danger">
          Couldn’t save the charge. Try again.
        </Text>
      )}
    </Sheet>
  );
}

function rank(order: readonly string[], name: string) {
  const i = order.indexOf(name);
  return i === -1 ? order.length : i;
}
