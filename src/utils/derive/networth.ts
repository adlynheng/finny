/**
 * Net worth from the accounts table, and the Overview's breakdowns of it.
 * Inactive accounts are left out everywhere, a null balance counts as zero,
 * and a liability's balance is the amount owed whatever its sign.
 */

import type { AccountRow, AssetClassRow } from '@/types/domain';
import { formatMonthShort } from '@/utils/format/date';

export type NetWorthAccount = Pick<
  AccountRow,
  | 'id'
  | 'name'
  | 'type'
  | 'asset_class_id'
  | 'balance_cents'
  | 'is_liability'
  | 'is_active'
>;

export type AssetClass = Pick<AssetClassRow, 'id' | 'label' | 'color'>;

/** A `net_worth_snapshot` row as `useSnapshots` reads it. `total_cents` is net worth. */
export type Snapshot = {
  date: string;
  total_cents: number;
  liabilities_cents: number;
  classes: { amount_cents: number; asset_class: AssetClass | null }[];
};

export type ClassSlice = AssetClass & { cents: number; fraction: number };

export type HistoryPoint = {
  date: string;
  /** Cumulative bands, each at least the one before: cash ≤ investments ≤ cpf ≤ net. */
  cash: number;
  investments: number;
  cpf: number;
  net: number;
};

const CREDIT_CARD = 'Credit card';
const OTHER = 'Other';

export function netWorth(accounts: readonly NetWorthAccount[]) {
  let assetsCents = 0;
  let liabilitiesCents = 0;
  for (const a of accounts.filter(isActive)) {
    if (a.is_liability) {
      liabilitiesCents += Math.abs(balance(a));
    } else {
      assetsCents += balance(a);
    }
  }
  return {
    assetsCents,
    liabilitiesCents,
    netCents: assetsCents - liabilitiesCents,
  };
}

/**
 * Assets by class, largest first, liabilities excluded. Accounts with no class
 * go into `Other`, and a class with no balance is dropped rather than shown as
 * a zero slice.
 */
export function assetClassSplit(
  accounts: readonly NetWorthAccount[],
  classes: readonly AssetClass[],
): ClassSlice[] {
  const other = classes.find(c => c.label === OTHER) ?? {
    id: -1,
    label: OTHER,
    color: null,
  };
  const byClass = new Map<number, number>();
  for (const a of accounts.filter(isAsset)) {
    const id = classes.some(c => c.id === a.asset_class_id)
      ? a.asset_class_id!
      : other.id;
    byClass.set(id, (byClass.get(id) ?? 0) + balance(a));
  }
  const total = sum([...byClass.values()]);
  return [...classes.filter(c => c.id !== other.id), other]
    .map(c => ({ ...c, cents: byClass.get(c.id) ?? 0 }))
    .filter(c => c.cents > 0)
    .sort((a, b) => b.cents - a.cents)
    .map(c => ({ ...c, fraction: c.cents / total }));
}

/** Active asset accounts by balance, largest first. Credit cards are excluded, as the card's subtitle says. */
export function shareOfAssets(accounts: readonly NetWorthAccount[]) {
  const rows = accounts.filter(a => isAsset(a) && a.type !== CREDIT_CARD);
  const total = sum(rows.map(balance));
  return rows
    .map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      cents: balance(a),
      fraction: total > 0 ? balance(a) / total : 0,
    }))
    .sort((a, b) => b.cents - a.cents);
}

/** What is owed across active credit cards. */
export function cardsOwedCents(accounts: readonly NetWorthAccount[]): number {
  return sum(
    accounts
      .filter(a => isActive(a) && a.type === CREDIT_CARD)
      .map(a => Math.abs(balance(a))),
  );
}

/**
 * The history chart's four nested lines, oldest first. Each band is carried up
 * to at least the one below it, so the chart can interpolate strands between
 * neighbours without them crossing — including a month where liabilities pull
 * net worth under the cash + investments + CPF stack.
 */
export function historySeries(snapshots: readonly Snapshot[]): HistoryPoint[] {
  return chronological(snapshots).map(s => {
    const amount = (label: string) =>
      sum(
        s.classes
          .filter(c => c.asset_class?.label === label)
          .map(c => c.amount_cents),
      );
    const cash = amount('Cash');
    const investments = cash + amount('Investments');
    const cpf = investments + amount('CPF');
    return {
      date: s.date,
      cash,
      investments,
      cpf,
      net: Math.max(cpf, s.total_cents),
    };
  });
}

/** The change between the last two snapshots, naming the earlier month. Null with fewer than two. */
export function monthDelta(snapshots: readonly Snapshot[]) {
  const [previous, latest] = chronological(snapshots).slice(-2);
  if (!previous || !latest) {
    return null;
  }
  const deltaCents = latest.total_cents - previous.total_cents;
  return {
    deltaCents,
    percent:
      previous.total_cents === 0
        ? null
        : (deltaCents / Math.abs(previous.total_cents)) * 100,
    previousMonth: formatMonthShort(previous.date),
  };
}

function chronological(snapshots: readonly Snapshot[]): Snapshot[] {
  return [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
}

function isActive(a: NetWorthAccount): boolean {
  return a.is_active;
}

function isAsset(a: NetWorthAccount): boolean {
  return a.is_active && !a.is_liability;
}

function balance(a: NetWorthAccount): number {
  return a.balance_cents ?? 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
