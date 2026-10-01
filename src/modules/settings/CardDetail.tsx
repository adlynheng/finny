import { Text, View } from 'react-native';

import { PlusIcon } from '@/components/icons/PlusIcon';
import { Button } from '@/components/ui/Button';
import { Glass } from '@/components/ui/Glass';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import type { CardRow } from '@/types/domain';
import { monthSpentCents } from '@/utils/derive/budget';
import { formatMoney } from '@/utils/format/money';
import { cardKind } from './CardFace';
import { dayOfMonthLabel } from './income';

const plus = (color: string) => (
  <PlusIcon size={10} color={color} strokeWidth={1.4} />
);

type Stat = { label: string; value: string };

/**
 * The selected card's three figures. A credit card shows what it earned this
 * cycle, its limit and its statement date; a debit card what it earned, what
 * was spent from its account this month (from the transactions, not stored),
 * and what it is linked as.
 */
function useCardStats(card: CardRow): Stat[] {
  const month = today().slice(0, 7);
  const txns = useTransactions(month).data ?? [];
  const account = useAccounts().data?.find(a => a.id === card.account_id);
  const earned = {
    label: 'Earned this cycle',
    value: card.rewards_earned_display ?? '—',
  };
  if (card.card_type === 'credit') {
    return [
      earned,
      {
        label: 'Credit limit',
        value: card.credit_limit_cents
          ? formatMoney(card.credit_limit_cents)
          : '—',
      },
      {
        label: 'Statement',
        value:
          card.statement_day !== null
            ? dayOfMonthLabel(card.statement_day)
            : card.statement_date ?? '—',
      },
    ];
  }
  const spent = monthSpentCents(
    txns.filter(t => t.account_id === card.account_id),
    month,
  );
  return [
    earned,
    { label: 'Spent this month', value: formatMoney(spent) },
    {
      label: 'Linked as',
      value: card.statement_date ?? account?.name ?? '—',
    },
  ];
}

/**
 * The hero's right column (the mobile detail block): the selected card's
 * title and type, Add card, its rewards, its three figures, and the "Count
 * toward monthly budget" switch. With no cards, just the title and Add card.
 */
export function CardDetail({
  card,
  onAdd,
}: {
  card: CardRow | undefined;
  onAdd: () => void;
}) {
  return (
    <View
      testID="card-detail"
      className="min-w-0 flex-1 justify-end gap-y-[12px] self-stretch pb-[24px] ios:flex-none ios:justify-start ios:self-auto ios:pb-0"
    >
      <View className="flex-row items-start justify-between gap-x-[8px] ios:items-center">
        <View className="min-w-0 shrink gap-y-[2px]">
          <Text numberOfLines={1} className="font-sans text-[15px] text-ink">
            {card ? `${card.bank} •••• ${card.last4}` : 'No cards yet'}
          </Text>
          <Text className="font-sans text-[12px] text-muted">
            {card
              ? `${cardKind(card)} · ${(card.network ?? '').toUpperCase()}`
              : 'Add one to see its rewards here'}
          </Text>
        </View>
        <Button
          testID="add-card"
          variant="primary"
          size="sm"
          label="Add card"
          icon={plus}
          onPress={onAdd}
          className="ios:h-[40px] ios:rounded-10 ios:px-[14px]"
        />
      </View>
      {card && <CardFacts card={card} />}
    </View>
  );
}

function CardFacts({ card }: { card: CardRow }) {
  const stats = useCardStats(card);
  return (
    <>
      <Glass
        testID="card-rewards"
        recipe="chip"
        radius={8}
        fill="bg-white/60 ios:bg-white"
        className="flex-row items-center gap-x-[10px] px-[12px] py-[10px] ios:border-ink/[.05]"
      >
        <View className="size-[16px] items-center justify-center rounded-full bg-lime/30">
          <View className="size-[6px] rounded-full bg-lime" />
        </View>
        <View className="min-w-0 flex-1 gap-y-px">
          <Text className="font-sans text-[11px] text-muted">Rewards</Text>
          <Text className="font-sans text-[13px] text-ink">
            {card.rewards_program ?? 'No rewards set'}
          </Text>
        </View>
      </Glass>
      <View
        testID="card-stats"
        className="flex-row gap-x-[12px] ios:gap-x-[10px]"
      >
        {stats.map(s => (
          <View key={s.label} className="min-w-0 flex-1 gap-y-[3px]">
            <Text
              numberOfLines={1}
              className="font-sans text-[11px] text-muted"
            >
              {s.label}
            </Text>
            <Text
              numberOfLines={1}
              className="font-sans text-[19px] font-light leading-[19px] tracking-[-0.02em] text-ink ios:text-[18px] ios:leading-[18px]"
            >
              {s.value}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}
