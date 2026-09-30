import { useState } from 'react';
import { Text } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import {
  useDeleteIncomeSource,
  useUpsertIncomeSource,
} from '@/hooks/useIncomeSources';
import { today } from '@/lib/today';
import {
  INCOME_TYPES,
  isOneOf,
  type IncomeSourceRow,
  type IncomeType,
} from '@/types/domain';
import {
  centsToInput,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';
import { DEFAULT_PAYDAY, INCOME_LABELS } from './income';

const TYPES = INCOME_TYPES.map(t => ({ value: t, label: INCOME_LABELS[t] }));
const FREQS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
] as const;
type Freq = (typeof FREQS)[number]['value'];
const UNITS = [
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
] as const;
type Unit = (typeof UNITS)[number]['value'];

const SOURCE_PLACEHOLDER: Record<IncomeType, string> = {
  salary: 'e.g. Employer name',
  freelance: 'e.g. Client or platform',
  other: 'e.g. Rental income',
};

/**
 * A stream's schedule as the drawer offers it. Weekly, which the drawer has
 * no button for, opens as Custom every 1 week.
 */
function formSchedule(source: IncomeSourceRow | null): {
  freq: Freq;
  every: string;
  unit: Unit;
} {
  if (!source) {
    return { freq: 'monthly', every: '1', unit: 'months' };
  }
  if (source.frequency === 'weekly') {
    return { freq: 'custom', every: '1', unit: 'weeks' };
  }
  return {
    freq: isOneOf(
      FREQS.map(f => f.value),
      source.frequency,
    )
      ? source.frequency
      : 'monthly',
    every: String(source.custom_every ?? 1),
    unit: source.custom_unit === 'weeks' ? 'weeks' : 'months',
  };
}

/**
 * The income drawer: the type, the source, the amount — per month, or per
 * payment for a stream that is not monthly — then a salary's pay day, or
 * another stream's frequency, with Repeats every N weeks or months for
 * Custom. Editing adds Remove income stream, which asks first; its past
 * payments stay. Mount it only while open.
 */
export function IncomeSheet({
  source,
  onClose,
}: {
  /** The stream to edit, or null for a new one. */
  source: IncomeSourceRow | null;
  onClose: () => void;
}) {
  const upsert = useUpsertIncomeSource();
  const remove = useDeleteIncomeSource();
  const [confirming, setConfirming] = useState(false);
  const initial = formSchedule(source);

  const [type, setType] = useState<IncomeType>(
    isOneOf(INCOME_TYPES, source?.type) ? source.type : 'salary',
  );
  const [name, setName] = useState(source?.name ?? '');
  const [amount, setAmount] = useState(
    source ? centsToInput(source.base_income_cents) : '',
  );
  const [payday, setPayday] = useState(source?.payday ?? DEFAULT_PAYDAY);
  const [freq, setFreq] = useState<Freq>(initial.freq);
  const [every, setEvery] = useState(initial.every);
  const [unit, setUnit] = useState<Unit>(initial.unit);

  const salary = type === 'salary';
  const custom = !salary && freq === 'custom';
  const cents = inputToCents(amount) ?? 0;
  const everyN = Number(every);
  const valid =
    name.trim() !== '' &&
    cents > 0 &&
    (!custom || (Number.isInteger(everyN) && everyN > 0));

  const save = () => {
    if (!valid) {
      return;
    }
    const fields = {
      type,
      name: name.trim(),
      base_income_cents: cents,
      // Salary is paid monthly, on its pay day.
      frequency: salary ? 'monthly' : freq,
      custom_every: custom ? everyN : null,
      custom_unit: custom ? unit : null,
      payday: salary ? payday.trim() || DEFAULT_PAYDAY : null,
      start_date: source?.start_date ?? today(),
    };
    upsert.mutate(source ? { id: source.id, ...fields } : fields, {
      onSuccess: onClose,
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={source ? 'Edit income stream' : 'New income stream'}
      actions={{
        primary: {
          label: source ? 'Save changes' : 'Add',
          onPress: save,
          disabled: !valid || upsert.isPending,
        },
        danger: source
          ? {
              label: 'Remove income stream',
              onPress: () => setConfirming(true),
              disabled: remove.isPending,
            }
          : undefined,
      }}
    >
      <FormField label="Type">
        <Segmented
          testID="income-type"
          options={TYPES}
          value={type}
          onChange={setType}
        />
      </FormField>
      <Input
        testID="income-name"
        label="Source"
        placeholder={SOURCE_PLACEHOLDER[type]}
        value={name}
        onChangeText={setName}
      />
      <Input
        testID="income-amount"
        label={
          salary || freq === 'monthly' ? 'Monthly amount' : 'Amount per payment'
        }
        prefix="S$"
        placeholder="0"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={t => setAmount(sanitizeAmountInput(t))}
      />
      {salary ? (
        <Input
          testID="income-payday"
          label="Pay day"
          placeholder="e.g. 25th of month"
          value={payday}
          onChangeText={setPayday}
        />
      ) : (
        <FormField label="Frequency">
          <Segmented
            testID="income-frequency"
            options={FREQS}
            value={freq}
            onChange={setFreq}
          />
        </FormField>
      )}
      {custom && (
        <>
          <Input
            testID="income-every"
            label="Repeats every"
            placeholder="e.g. 6"
            keyboardType="number-pad"
            value={every}
            onChangeText={t => setEvery(t.replace(/[^0-9]/g, ''))}
          />
          <FormField label="Interval">
            <Segmented
              testID="income-unit"
              options={UNITS}
              value={unit}
              onChange={setUnit}
            />
          </FormField>
        </>
      )}
      <Text testID="income-hint" className="font-sans text-[12px] text-muted">
        {salary
          ? 'Salary is subject to CPF contributions.'
          : 'Not subject to CPF. Converted to a monthly equivalent for planning.'}
      </Text>
      {(upsert.isError || remove.isError) && (
        <Text className="font-sans text-[12px] text-danger">
          Couldn’t save the income stream. Try again.
        </Text>
      )}
      {source && (
        <ConfirmDialog
          open={confirming}
          name={source.name}
          detail="It stops counting toward your income. Its past payments stay in your transactions."
          confirmLabel="Remove income stream"
          onConfirm={() =>
            remove.mutate(source.id, {
              onSuccess: onClose,
              onError: () => setConfirming(false),
            })
          }
          onCancel={() => setConfirming(false)}
          pending={remove.isPending}
        />
      )}
    </Sheet>
  );
}
