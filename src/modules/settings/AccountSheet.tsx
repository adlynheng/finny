import { useState } from 'react';
import { Text } from 'react-native';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { useDeleteAccount, useUpsertAccount } from '@/hooks/useAccounts';
import { useAssetClasses } from '@/hooks/useAssetClasses';
import { useCards } from '@/hooks/useCards';
import {
  ACCOUNT_TYPES,
  isOneOf,
  type AccountRow,
  type AccountType,
} from '@/types/domain';
import {
  centsToInput,
  inputToCents,
  sanitizeAmountInput,
} from '@/utils/format/money';
import { plural } from './useSettingsData';

const TYPES = ACCOUNT_TYPES.map(t => ({ value: t, label: t }));

/** The asset class each type's balance counts towards; a credit card's counts towards none. */
const TYPE_CLASS: Record<AccountType, string | null> = {
  Savings: 'Cash',
  CPF: 'CPF',
  Broker: 'Investments',
  'Credit card': null,
};

/** The line under the delete confirmation's title. */
export function removeAccountDetail(cardCount: number, last4?: string | null) {
  const cards =
    cardCount === 0
      ? ''
      : cardCount === 1
      ? ` Its card${last4 ? ` •••• ${last4}` : ''} is removed with it.`
      : ` Its ${plural(cardCount, 'card')} are removed with it.`;
  return `Its transactions stay, no longer tied to an account.${cards}`;
}

/**
 * The account drawer: name, type, institution or note, and the balance —
 * "Balance owed" for a credit card, whose balance counts as a liability.
 * Editing adds Remove account, which asks first. Mount it only while open.
 */
export function AccountSheet({
  account,
  onClose,
}: {
  /** The account to edit, or null for a new one. */
  account: AccountRow | null;
  onClose: () => void;
}) {
  const classes = useAssetClasses().data ?? [];
  const cards = (useCards().data ?? []).filter(
    c => account && c.account_id === account.id,
  );
  const upsert = useUpsertAccount();
  const remove = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(
    isOneOf(ACCOUNT_TYPES, account?.type) ? account.type : 'Savings',
  );
  const [note, setNote] = useState(account?.note ?? '');
  const [balance, setBalance] = useState(
    account ? centsToInput(Math.abs(account.balance_cents ?? 0)) : '',
  );
  const credit = type === 'Credit card';
  const cents = inputToCents(balance);
  const valid = name.trim() !== '' && cents !== null;

  const save = () => {
    if (!valid) {
      return;
    }
    // A type change moves the balance to that type's class; otherwise the
    // account keeps its own (a Property account stays Property).
    const classId =
      account && account.type === type
        ? account.asset_class_id
        : classes.find(c => c.label === TYPE_CLASS[type])?.id ?? null;
    const fields = {
      name: name.trim(),
      type,
      note: note.trim() || null,
      balance_cents: cents,
      is_liability: credit,
      asset_class_id: credit ? null : classId,
      // Only a CPF account says which CPF account it is.
      cpf_type: type === 'CPF' ? account?.cpf_type ?? null : null,
    };
    upsert.mutate(account ? { id: account.id, ...fields } : fields, {
      onSuccess: onClose,
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={account ? 'Edit account' : 'New account'}
      actions={{
        primary: {
          label: account ? 'Save changes' : 'Add',
          onPress: save,
          disabled: !valid || upsert.isPending,
        },
        danger: account
          ? {
              label: 'Remove account',
              onPress: () => setConfirming(true),
              disabled: remove.isPending,
            }
          : undefined,
      }}
    >
      <Input
        testID="account-name"
        label="Account name"
        placeholder="e.g. OCBC 360"
        value={name}
        onChangeText={setName}
      />
      <FormField label="Account type">
        <Segmented
          testID="account-type"
          options={TYPES}
          value={type}
          onChange={setType}
        />
      </FormField>
      <Input
        testID="account-note"
        label="Institution or note"
        placeholder="Optional"
        value={note}
        onChangeText={setNote}
      />
      <Input
        testID="account-balance"
        label={credit ? 'Balance owed' : 'Current balance'}
        prefix="S$"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={balance}
        onChangeText={t => setBalance(sanitizeAmountInput(t))}
      />
      <Text testID="account-hint" className="font-sans text-[12px] text-muted">
        {credit
          ? 'Card balances count as liabilities, not assets.'
          : 'Counts toward your share of assets.'}
      </Text>
      {(upsert.isError || remove.isError) && (
        <Text className="font-sans text-[12px] text-danger">
          Couldn’t save the account. Try again.
        </Text>
      )}
      {account && (
        <ConfirmDialog
          open={confirming}
          name={account.name}
          detail={removeAccountDetail(cards.length, cards[0]?.last4)}
          confirmLabel="Remove account"
          onConfirm={() =>
            remove.mutate(account.id, {
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
