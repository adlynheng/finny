import { useState } from 'react';
import { Text } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { useUpdateSettings } from '@/hooks/useSettings';
import type { SettingsRow } from '@/types/domain';
import { ratePercent } from './income';

/** A rate typed as a percentage, or null unless it is a number from 0 to 100. */
export function percentToRate(text: string): number | null {
  const value = Number(text);
  return text.trim() !== '' && value >= 0 && value <= 100 ? value / 100 : null;
}

const toPercent = (rate: number) => ratePercent(rate).slice(0, -1);
const sanitize = (text: string) =>
  text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

/**
 * The CPF drawer: only the employee and employer rates, which apply to
 * salary alone and feed Personal Finance and the Planner. Mount it only while
 * open.
 */
export function CpfSheet({
  settings,
  onClose,
}: {
  settings: SettingsRow;
  onClose: () => void;
}) {
  const update = useUpdateSettings();
  const [employee, setEmployee] = useState(
    toPercent(settings.cpf_employee_rate),
  );
  const [employer, setEmployer] = useState(
    toPercent(settings.cpf_employer_rate),
  );
  const ee = percentToRate(employee);
  const er = percentToRate(employer);
  const valid = ee !== null && er !== null;

  const save = () => {
    if (ee === null || er === null) {
      return;
    }
    update.mutate(
      { cpf_employee_rate: ee, cpf_employer_rate: er },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="CPF contributions"
      actions={{
        primary: {
          label: 'Save changes',
          onPress: save,
          disabled: !valid || update.isPending,
        },
      }}
    >
      <Input
        testID="cpf-employee"
        label="Employee CPF rate"
        suffix="%"
        keyboardType="decimal-pad"
        value={employee}
        onChangeText={t => setEmployee(sanitize(t))}
      />
      <Input
        testID="cpf-employer"
        label="Employer CPF rate"
        suffix="%"
        keyboardType="decimal-pad"
        value={employer}
        onChangeText={t => setEmployer(sanitize(t))}
      />
      <Text className="font-sans text-[12px] text-muted">
        CPF rates apply to Salary income only. Used by Personal Finance and the
        Goals planner.
      </Text>
      {update.isError && (
        <Text className="font-sans text-[12px] text-danger">
          Couldn’t save the rates. Try again.
        </Text>
      )}
    </Sheet>
  );
}
