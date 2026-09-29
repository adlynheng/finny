/**
 * The Transactions card's list, from a month's rows. A transfer is stored as
 * two rows, out of one account and into another; the list shows it once, as
 * the design does, naming both accounts. Search and the kind filter apply to
 * these display rows, and the cash-flow derive's `monthTotals` sums them.
 */

import type { TransactionsFilter } from '@/stores/uiStore';
import type { AccountRow, CategoryRow, TxnKind, TxnRow } from '@/types/domain';

export type TxnListRow = {
  id: number;
  date: string;
  kind: TxnKind;
  description: string;
  /** The category, `Transfer`, or `Uncategorised`. */
  category: string;
  /** The category's icon key, for the icon registry. */
  iconKey: string | null;
  /** The account, or `From → To` for a transfer. */
  account: string;
  /** Signed: out negative, in positive; a transfer as its outgoing amount. */
  amount_cents: number;
  category_id: number | null;
};

type Lookup = {
  accounts: readonly Pick<AccountRow, 'id' | 'name'>[];
  categories: readonly Pick<CategoryRow, 'id' | 'name' | 'icon'>[];
};

/**
 * One row per expense and deposit, and one per transfer: its outgoing leg,
 * paired with the incoming leg of the same amount on the same day. A leg with
 * no partner is shown alone. Order is kept.
 */
export function listRows(
  txns: readonly TxnRow[],
  { accounts, categories }: Lookup,
): TxnListRow[] {
  const accountName = (id: number | null) =>
    accounts.find(a => a.id === id)?.name ?? 'Unknown account';
  const incoming = txns.filter(
    t => t.kind === 'transfer' && t.amount_cents > 0,
  );
  const paired = new Set<number>();
  const rows: TxnListRow[] = [];

  for (const t of txns) {
    if (t.kind === 'transfer') {
      if (t.amount_cents > 0) {
        continue;
      }
      const leg = incoming.find(
        i =>
          !paired.has(i.id) &&
          i.date === t.date &&
          i.amount_cents === -t.amount_cents,
      );
      if (leg) {
        paired.add(leg.id);
      }
      rows.push({
        id: t.id,
        date: t.date,
        kind: 'transfer',
        description: t.description,
        category: 'Transfer',
        iconKey: null,
        account: leg
          ? `${accountName(t.account_id)} → ${accountName(leg.account_id)}`
          : accountName(t.account_id),
        amount_cents: t.amount_cents,
        category_id: null,
      });
      continue;
    }
    const category = categories.find(c => c.id === t.category_id);
    rows.push({
      id: t.id,
      date: t.date,
      kind: t.kind === 'deposit' ? 'deposit' : 'expense',
      description: t.description,
      category: category?.name ?? 'Uncategorised',
      iconKey: category?.icon ?? null,
      account: accountName(t.account_id),
      amount_cents: t.amount_cents,
      category_id: t.category_id,
    });
  }
  // Incoming legs whose outgoing leg is missing (say, in another month).
  for (const leg of incoming) {
    if (!paired.has(leg.id)) {
      rows.push({
        id: leg.id,
        date: leg.date,
        kind: 'transfer',
        description: leg.description,
        category: 'Transfer',
        iconKey: null,
        account: accountName(leg.account_id),
        amount_cents: leg.amount_cents,
        category_id: null,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

const KIND_FOR: Record<TransactionsFilter, TxnKind | null> = {
  all: null,
  in: 'deposit',
  out: 'expense',
  transfers: 'transfer',
};

/** The rows of the filter's kind whose description, category or account contains the query. */
export function filterRows(
  rows: readonly TxnListRow[],
  filter: TransactionsFilter,
  query: string,
): TxnListRow[] {
  const kind = KIND_FOR[filter];
  const q = query.trim().toLowerCase();
  return rows.filter(
    r =>
      (kind === null || r.kind === kind) &&
      (q === '' ||
        `${r.description} ${r.category} ${r.account}`
          .toLowerCase()
          .includes(q)),
  );
}
