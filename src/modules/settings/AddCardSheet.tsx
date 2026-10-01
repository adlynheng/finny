import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChipRow } from '@/components/ui/ChipRow';
import { FormField } from '@/components/ui/FormField';
import { GradientFill } from '@/components/ui/GradientFill';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { useAccounts } from '@/hooks/useAccounts';
import { useAddCard } from '@/hooks/useCards';
import { cardThemes } from '@/theme/gradients';
import { tokens } from '@/theme/tokens';
import { CARD_THEMES, type CardTheme, type CardType } from '@/types/domain';
import { parseDayOfMonth } from './income';

const NETWORKS = ['VISA', 'mastercard', 'AMEX'] as const;
type Network = (typeof NETWORKS)[number];
const NETWORK_OPTIONS = NETWORKS.map(n => ({ value: n, label: n }));
const KINDS = [
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
] as const;

/** Exactly four digits. */
export const isLast4 = (text: string) => /^\d{4}$/.test(text);

/**
 * The Add card form: its name, last four digits, network, Credit or Debit,
 * a rewards line and a colour from the six card themes. A credit card gets a
 * liability account of its own for what it owes, and can take its billing
 * cycle (the statement day and the bill's due day, both or neither), which
 * puts its bills on the payments calendar; a debit card spends from
 * one of the savings accounts, picked here (the design has no such field,
 * but every card belongs to an account). Mount it only while open.
 */
export function AddCardSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  /** The new card, to select it. */
  onAdded: (id: number) => void;
}) {
  const savings = (useAccounts().data ?? []).filter(
    a => a.is_active && a.type === 'Savings',
  );
  const add = useAddCard();
  const [bank, setBank] = useState('');
  const [last4, setLast4] = useState('');
  const [network, setNetwork] = useState<Network>('VISA');
  const [kind, setKind] = useState<CardType>('credit');
  const [rewards, setRewards] = useState('');
  const [theme, setTheme] = useState<CardTheme>('Green');
  const [linkedId, setLinkedId] = useState<number | null>(null);
  const [statement, setStatement] = useState('');
  const [billDue, setBillDue] = useState('');
  const statementDay = parseDayOfMonth(statement);
  const billDueDay = parseDayOfMonth(billDue);
  const linked = linkedId ?? savings[0]?.id ?? null;

  const credit = kind === 'credit';
  // The cycle needs both days, or neither.
  const cycleValid =
    !credit ||
    (statement === '' && billDue === '') ||
    (statementDay !== null && billDueDay !== null);
  const valid =
    bank.trim() !== '' &&
    isLast4(last4) &&
    (credit || linked !== null) &&
    cycleValid;

  const save = () => {
    if (!valid) {
      return;
    }
    const name = bank.trim();
    add.mutate(
      {
        card: {
          bank: name,
          product_name: credit ? 'Credit' : 'Debit',
          network,
          last4,
          card_type: kind,
          rewards_program: rewards.trim() || null,
          color_theme: theme,
          account_id: credit ? undefined : linked!,
          statement_day: credit ? statementDay : null,
          bill_due_day: credit ? billDueDay : null,
        },
        account: credit
          ? {
              name,
              type: 'Credit card',
              note: `•••• ${last4}`,
              balance_cents: 0,
              is_liability: true,
            }
          : undefined,
      },
      {
        onSuccess: card => {
          onAdded(card.id);
          onClose();
        },
      },
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Add card"
      actions={{
        primary: {
          label: 'Add',
          onPress: save,
          disabled: !valid || add.isPending,
        },
      }}
    >
      <Input
        testID="card-name"
        label="Card name"
        placeholder="e.g. Citi PremierMiles"
        value={bank}
        onChangeText={setBank}
      />
      <Input
        testID="card-last4"
        label="Last 4 digits"
        placeholder="1234"
        keyboardType="number-pad"
        maxLength={4}
        value={last4}
        onChangeText={t => setLast4(t.replace(/[^0-9]/g, ''))}
      />
      <FormField label="Network">
        <Segmented
          testID="card-network"
          options={NETWORK_OPTIONS}
          value={network}
          onChange={setNetwork}
        />
      </FormField>
      <FormField label="Type">
        <Segmented
          testID="card-kind"
          options={KINDS}
          value={kind}
          onChange={setKind}
        />
      </FormField>
      {credit && (
        <>
          <Input
            testID="card-statement-day"
            label="Statement day"
            placeholder="e.g. 18"
            keyboardType="number-pad"
            maxLength={2}
            value={statement}
            onChangeText={t => setStatement(t.replace(/[^0-9]/g, ''))}
          />
          <Input
            testID="card-bill-due-day"
            label="Bill due day"
            placeholder="e.g. 8"
            keyboardType="number-pad"
            maxLength={2}
            value={billDue}
            onChangeText={t => setBillDue(t.replace(/[^0-9]/g, ''))}
          />
          <Text
            testID="card-cycle-hint"
            className="font-sans text-[12px] text-muted"
          >
            Days of the month, 1–31; 31 is the last day. The bill shows on the
            payments calendar with what its cycle spent.
          </Text>
        </>
      )}
      {!credit && (
        <FormField label="Spends from">
          <ChipRow
            testID="card-account"
            options={savings.map(a => ({ value: String(a.id), label: a.name }))}
            value={linked === null ? null : String(linked)}
            onChange={v => setLinkedId(Number(v))}
          />
        </FormField>
      )}
      <Input
        testID="card-rewards-input"
        label="Rewards"
        placeholder="e.g. 1.2 mpd on all spend"
        value={rewards}
        onChangeText={setRewards}
      />
      <FormField label="Colour">
        <View
          testID="card-colours"
          className="flex-row flex-wrap gap-[12px] p-[2px]"
        >
          {CARD_THEMES.map(name => (
            <Swatch
              key={name}
              name={name}
              selected={name === theme}
              onPress={() => setTheme(name)}
            />
          ))}
        </View>
      </FormField>
      {add.isError && (
        <Text testID="card-error" className="font-sans text-[12px] text-danger">
          Couldn’t add the card. Try again.
        </Text>
      )}
    </Sheet>
  );
}

const { ink, white } = tokens.colors;
/** The selected swatch's ring: white, then ink, outside it. */
const RING = `0 0 0 2px ${white}, 0 0 0 3.5px ${ink}`;

/** A theme's own gradient in a 34px circle; the chosen one is ringed. */
function Swatch({
  name,
  selected,
  onPress,
}: {
  name: CardTheme;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`swatch-${name}`}
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="size-[34px] rounded-full"
      style={selected ? { boxShadow: RING } : undefined}
    >
      <GradientFill gradient={cardThemes[name].gradient} radius={17} />
      {!selected && (
        <View className="absolute inset-0 rounded-full border border-ink/[.08]" />
      )}
    </Pressable>
  );
}
