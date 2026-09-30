import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { today } from '@/lib/today';
import type { SettingsPanel } from '@/stores/uiStore';
import type {
  AccountRow,
  CategoryRow,
  IncomeSourceRow,
  SettingsRow,
} from '@/types/domain';
import { groupCategories } from '@/utils/derive/cashflow';
import { shareOfAssets } from '@/utils/derive/networth';
import { grossIncomeCents } from '@/utils/derive/plan';
import { formatMonthShort } from '@/utils/format/date';
import { formatMoney } from '@/utils/format/money';

export type CategoryTotal = { category: CategoryRow; cents: number };

export type SettingsData = {
  settings: SettingsRow;
  /** Active accounts, in the Settings grouping's order. */
  accounts: AccountRow[];
  /** Every asset account's balance, credit cards excluded. */
  assetsCents: number;
  expense: CategoryTotal[];
  deposit: CategoryTotal[];
  /** Active income streams. */
  incomes: IncomeSourceRow[];
  incomeMonthlyCents: number;
  /** This month, as the tiles name it: `Sep`. */
  monthLabel: string;
};

/**
 * What the Settings panels show, loaded once for all four. A category's month
 * total is its row in the Personal Finance Categories grouping, so the two
 * pages agree. Null until everything has loaded.
 */
export function useSettingsData(): SettingsData | null {
  const month = today().slice(0, 7);
  const settings = useSettings().data;
  const allAccounts = useAccounts().data;
  const categories = useCategories().data;
  const txns = useTransactions(month).data;
  const sources = useIncomeSources().data;
  if (!settings || !allAccounts || !categories || !txns || !sources) {
    return null;
  }
  const accounts = allAccounts.filter(a => a.is_active);
  const { spending, income } = groupCategories(txns, categories);
  const totals = (kind: CategoryRow['kind'], rows: typeof spending.rows) =>
    categories
      .filter(c => c.kind === kind)
      .map(category => ({
        category,
        cents: rows
          .filter(r => r.categoryId === category.id)
          .reduce((sum, r) => sum + r.cents, 0),
      }));
  const incomes = sources.filter(s => s.is_active);
  return {
    settings,
    accounts,
    assetsCents: shareOfAssets(accounts).reduce((sum, r) => sum + r.cents, 0),
    expense: totals('expense', spending.rows),
    deposit: totals('deposit', income.rows),
    incomes,
    incomeMonthlyCents: grossIncomeCents(incomes),
    monthLabel: formatMonthShort(month),
  };
}

/** `1 account`, `9 accounts`. */
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const sumOf = (totals: CategoryTotal[]) =>
  totals.reduce((sum, t) => sum + t.cents, 0);

export type PanelHead = {
  title: string;
  /** The count: the nav's subtitle, and the summary's first half. */
  count: string;
  summary: string;
  action: string;
};

/** Each panel's title, summary line and action, in the nav's order. */
export function panelHeads(
  data: SettingsData,
): Record<SettingsPanel, PanelHead> {
  const head = (
    title: string,
    count: string,
    detail: string,
    action: string,
  ): PanelHead => ({ title, count, summary: `${count} · ${detail}`, action });
  const month = data.monthLabel;
  return {
    accounts: head(
      'Accounts & balances',
      plural(data.accounts.length, 'account'),
      `${formatMoney(data.assetsCents)} in assets`,
      'New account',
    ),
    expenditure: head(
      'Expenditure categories',
      plural(data.expense.length, 'category', 'categories'),
      `${formatMoney(sumOf(data.expense), { decimals: 2 })} spent in ${month}`,
      'New category',
    ),
    deposit: head(
      'Deposit categories',
      plural(data.deposit.length, 'category', 'categories'),
      `${formatMoney(sumOf(data.deposit))} received in ${month}`,
      'New category',
    ),
    fixed: head(
      'Fixed variables',
      plural(data.incomes.length, 'income stream'),
      `${formatMoney(data.incomeMonthlyCents)} / month`,
      'Add income',
    ),
  };
}

export const PANELS: SettingsPanel[] = [
  'accounts',
  'expenditure',
  'deposit',
  'fixed',
];
