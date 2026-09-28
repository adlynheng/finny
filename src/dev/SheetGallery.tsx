/**
 * Temporary: Task 33's Sheet, opened over the app, so the modal (macOS) and
 * bottom sheet (iOS) can be checked by eye. Mounted from SurfacesGallery until
 * the pages exist (Phase H); delete it then.
 */

import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';

const types = [
  { value: 'expense', label: 'Expense' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
] as const;

const accounts = [
  { value: 'dbs', label: 'DBS Multiplier' },
  { value: 'ocbc', label: 'OCBC 360' },
  { value: 'ibkr', label: 'IBKR' },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-y-[8px]">
      <Text className="font-sans text-[12px] font-medium text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** One form, with no platform checks: the Sheet decides how it is presented. */
function DemoForm({ tall }: { tall: boolean }) {
  const [type, setType] = useState<(typeof types)[number]['value']>('expense');
  const [account, setAccount] = useState('dbs');
  const [note, setNote] = useState('');
  return (
    <>
      <Segmented options={types} value={type} onChange={setType} />
      <Field label="Amount">
        <Text className="font-sans text-[52px] font-light text-ink">S$ 0</Text>
      </Field>
      <Field label="Paid from">
        <ChipRow options={accounts} value={account} onChange={setAccount} />
      </Field>
      <Input
        label="Description"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Kopitiam"
      />
      {tall &&
        Array.from({ length: 12 }, (_, i) => (
          <Input
            key={i}
            label={`Filler field ${i + 1}`}
            value=""
            onChangeText={() => {}}
          />
        ))}
    </>
  );
}

export function SheetGallery() {
  const [open, setOpen] = useState<'short' | 'tall' | null>(null);
  const close = () => setOpen(null);
  return (
    <View className="flex-row gap-3">
      <Button
        variant="primary"
        label="Open form"
        onPress={() => setOpen('short')}
      />
      <Button
        variant="ghost"
        label="Open tall form"
        onPress={() => setOpen('tall')}
      />
      <Sheet
        open={open !== null}
        onClose={close}
        title={open === 'tall' ? 'Edit recurring charge' : 'New transaction'}
        width={open === 'tall' ? 'narrow' : 'standard'}
        actions={{
          primary: { label: 'Save', onPress: close },
          danger:
            open === 'tall' ? { label: 'Delete', onPress: close } : undefined,
        }}
      >
        <DemoForm tall={open === 'tall'} />
      </Sheet>
    </View>
  );
}
