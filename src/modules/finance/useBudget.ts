import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import {
  dailyAverageCents,
  dailySpend,
  daysRemaining,
  elapsedDays,
  monthSpentCents,
  paceStatus,
  safeDailyCents,
  usage,
} from '@/utils/derive/budget';
import { daysInMonth, monthKey } from '@/utils/format/date';

/**
 * This month's budget, from the budget derive functions against the month's
 * transactions and the settings limit: what the hero, its stats and the dial
 * show. Spend counts through today only. Null until both have loaded.
 */
export function useBudget() {
  const month = monthKey(today());
  const txns = useTransactions(month).data;
  const settings = useSettings().data;
  if (!txns || !settings) {
    return null;
  }
  const limitCents = settings.monthly_expenditure_cents;
  const elapsed = elapsedDays(month);
  const spentCents = monthSpentCents(txns, month, elapsed);
  return {
    month,
    limitCents,
    spentCents,
    leftCents: limitCents - spentCents,
    elapsed,
    daysInMonth: daysInMonth(month),
    daysLeft: daysRemaining(month),
    /** Spend on each day so far, today last. */
    dailyCents: dailySpend(txns, month).slice(0, elapsed),
    pace: paceStatus(spentCents, limitCents, month, elapsed),
    dailyAverageCents: dailyAverageCents(spentCents, elapsed),
    safeDailyCents: safeDailyCents(limitCents, spentCents, month),
    usage: usage(spentCents, limitCents),
  };
}

export type Budget = NonNullable<ReturnType<typeof useBudget>>;
