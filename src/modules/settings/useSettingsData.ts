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
  /** The expense categories marked for recurring charges. */
  recurring: CategoryTotal[];
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
  const expense = totals('expense', spending.rows);
  return {
    settings,
    accounts,
    assetsCents: shareOfAssets(accounts).reduce((sum, r) => sum + r.cents, 0),
    expense,
    recurring: expense.filter(t => t.category.is_recurring),
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
  /** With nothing in the panel yet: the design's empty note, in place of its body. */
  empty: { title: string; body: string } | null;
};

/** Each panel's empty note, from the design (Fixed variables' reworded for its income streams). */
const EMPTY: Record<SettingsPanel, { title: string; body: string }> = {
  accounts: {
    title: 'No accounts yet',
    body: 'Add savings, CPF and brokerage accounts with their balances. They feed your net worth and the share of assets.',
  },
  expenditure: {
    title: 'No categories yet',
    body: 'Categories sort every transaction and drive the spending breakdown on Personal Finance.',
  },
  recurring: {
    title: 'No recurring categories yet',
    body: 'Recurring categories sort your recurring charges. They are expense categories, so each charge still counts toward your spending.',
  },
  deposit: {
    title: 'No categories yet',
    body: 'Categories sort every transaction and drive the spending breakdown on Personal Finance.',
  },
  fixed: {
    title: 'No fixed variables yet',
    body: 'Your salary and other income, with the CPF that comes off it. They set what the monthly plan has to allocate.',
  },
};

/**
 * Each panel's title, summary line and action, in the nav's order. An empty
 * panel's summary is "None yet", as is its nav subtitle, except the category
 * panels', which say where categories come from.
 */
export function panelHeads(
  data: SettingsData,
): Record<SettingsPanel, PanelHead> {
  const lengths: Record<SettingsPanel, number> = {
    accounts: data.accounts.length,
    expenditure: data.expense.length,
    recurring: data.recurring.length,
    deposit: data.deposit.length,
    fixed: data.incomes.length,
  };
  const head = (
    key: SettingsPanel,
    title: string,
    count: string,
    detail: string,
    action: string,
  ): PanelHead =>
    lengths[key] === 0
      ? {
          title,
          count:
            key === 'expenditure' || key === 'deposit'
              ? 'Start from defaults or your own'
              : 'None yet',
          summary: 'None yet',
          action,
          empty: EMPTY[key],
        }
      : { title, count, summary: `${count} · ${detail}`, action, empty: null };
  const month = data.monthLabel;
  return {
    accounts: head(
      'accounts',
      'Accounts & balances',
      plural(data.accounts.length, 'account'),
      `${formatMoney(data.assetsCents)} in assets`,
      'New account',
    ),
    expenditure: head(
      'expenditure',
      'Expenditure categories',
      plural(data.expense.length, 'category', 'categories'),
      `${formatMoney(sumOf(data.expense), { decimals: 2 })} spent in ${month}`,
      'New category',
    ),
    recurring: head(
      'recurring',
      'Recurring categories',
      plural(data.recurring.length, 'category', 'categories'),
      `${formatMoney(sumOf(data.recurring), {
        decimals: 2,
      })} spent in ${month}`,
      'New category',
    ),
    deposit: head(
      'deposit',
      'Deposit categories',
      plural(data.deposit.length, 'category', 'categories'),
      `${formatMoney(sumOf(data.deposit))} received in ${month}`,
      'New category',
    ),
    fixed: head(
      'fixed',
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
  'recurring',
  'deposit',
  'fixed',
];
