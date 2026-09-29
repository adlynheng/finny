import { useState, type ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icons/Icon';
import { categoryIcon } from '@/components/icons/registry';
import { ChipRow, type ChipOption } from '@/components/ui/ChipRow';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input, noFocusRing } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useAddTransaction } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import { tokens } from '@/theme/tokens';
import type { AccountRow, CategoryKind, TxnKind } from '@/types/domain';
import { inputToCents, sanitizeAmountInput } from '@/utils/format/money';

const TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
] as const;

/** What each type calls its account, and its description field. */
const WORDING: Record<
  TxnKind,
  { account: string; note: string; placeholder: string }
> = {
  expense: { account: 'Paid from', note: 'Description', placeholder: 'e.g. Kopitiam' },
  deposit: { account: 'Deposited to', note: 'Source', placeholder: 'e.g. Tax refund' },
  transfer: { account: 'From account', note: 'Note', placeholder: 'Optional' },
};

/** Expenses default to the first card, deposits and transfers to the first savings account. */
function defaultAccount(kind: TxnKind, accounts: AccountRow[]) {
  const type = kind === 'expense' ? 'Credit card' : 'Savings';
  return (accounts.find(a => a.type === type) ?? accounts[0])?.id ?? null;
}

/** A category chip's icon, at the chip's text colour and size. */
const chipIcon = (path: string) => (color: string, size: number) => (
  <Icon path={path} color={color} size={size} strokeWidth={1.2} />
);

const chip = (a: AccountRow): ChipOption<string> => ({
  value: String(a.id),
  label: a.name,
});

/**
 * The new-transaction form, in the Sheet: a centred modal on desktop, a bottom
 * sheet on mobile. The Overview card, Personal Finance and the mobile FAB all
 * open it. Mount it only while open, so each opening starts blank.
 *
 * A choice left untouched follows its default, so switching the type resets
 * the account and category just by clearing them. Transfers have no category
 * (the table's categories are expense or deposit), so theirs is not shown.
 */
export function NewTransactionSheet({ onClose }: { onClose: () => void }) {
  // CPF money cannot be spent or moved by hand, so the design leaves it out.
  const accounts = (useAccounts().data ?? []).filter(
    a => a.is_active && a.type !== 'CPF',
  );
  const categories = useCategories().data ?? [];
  const add = useAddTransaction();

  const [kind, setKind] = useState<TxnKind>('expense');
  const [amount, setAmount] = useState('');
  const [picked, setPicked] = useState<{
    from?: number;
    to?: number;
    category?: number;
  }>({});
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);

  const from = picked.from ?? defaultAccount(kind, accounts);
  const to = picked.to ?? accounts.find(a => a.id !== from)?.id ?? null;
  const kindCategories = categories.filter(c => c.kind === kind);
  const category =
    kindCategories.find(c => c.id === picked.category) ?? kindCategories[0];
  const cents = inputToCents(amount) ?? 0;
  const transfer = kind === 'transfer';
  const valid =
    cents > 0 && from !== null && (!transfer || (to !== null && to !== from));
  const words = WORDING[kind];

  const save = () => {
    if (!valid) {
      return;
    }
    const account = (id: number) => accounts.find(a => a.id === id)!;
    add.mutate(
      transfer
        ? {
            kind,
            amountCents: cents,
            date,
            from: account(from),
            to: account(to!),
            description: note,
          }
        : {
            kind,
            amountCents: cents,
            date,
            accountId: from,
            description: note.trim() || category?.name || '',
            categoryId: category?.id ?? null,
          },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="New transaction"
      actions={{
        primary: {
          label: `Add ${kind}`,
          onPress: save,
          disabled: !valid || add.isPending,
        },
      }}
    >
      <Segmented
        testID="tx-type"
        size="type"
        options={TYPES}
        value={kind}
        onChange={k => {
          setKind(k);
          setPicked({});
        }}
      />
      <View className="flex-row items-center gap-[8px] px-[4px]">
        <Text className="font-sans text-[28px] font-light text-muted ios:text-[26px]">
          S$
        </Text>
        <TextInput
          testID="tx-amount"
          accessibilityLabel="Amount"
          value={amount}
          onChangeText={t => setAmount(sanitizeAmountInput(t))}
          placeholder="0.00"
          placeholderTextColor={tokens.colors.muted2}
          keyboardType="decimal-pad"
          {...noFocusRing}
          className="min-w-0 flex-1 p-0 font-sans text-[52px] font-light tracking-[-0.03em] text-ink ios:text-[48px]"
        />
      </View>
      <Field label={words.account}>
        <ChipRow
          testID="tx-from"
          options={accounts.map(chip)}
          value={from === null ? null : String(from)}
          onChange={v => setPicked(p => ({ ...p, from: Number(v) }))}
        />
      </Field>
      {transfer && (
        <Field label="To account">
          <ChipRow
            testID="tx-to"
            options={accounts.map(a => ({ ...chip(a), dimmed: a.id === from }))}
            value={to === null ? null : String(to)}
            onChange={v => setPicked(p => ({ ...p, to: Number(v) }))}
          />
        </Field>
      )}
      {!transfer && (
        <Field label="Category">
          <ChipRow
            testID="tx-category"
            options={kindCategories.map(c => ({
              value: String(c.id),
              label: c.name,
              icon: chipIcon(categoryIcon(c.kind as CategoryKind, c.icon)),
            }))}
            value={category ? String(category.id) : null}
            onChange={v => setPicked(p => ({ ...p, category: Number(v) }))}
          />
        </Field>
      )}
      <View className="flex-row gap-[10px] ios:flex-col ios:gap-sheet-gap">
        <Input
          testID="tx-note"
          label={words.note}
          placeholder={words.placeholder}
          value={note}
          onChangeText={setNote}
          className="flex-[1.4] ios:flex-none"
        />
        <DatePicker
          value={date}
          onChange={setDate}
          className="flex-1 ios:flex-none"
        />
      </View>
      {add.isError && (
        <Text testID="tx-error" className="font-sans text-[12px] text-danger">
          Couldn’t save the transaction. Try again.
        </Text>
      )}
    </Sheet>
  );
}

/** A chip row's small muted label above it. */
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-[8px]">
      <Text className="font-sans text-[12px] text-muted">{label}</Text>
      {children}
    </View>
  );
}
