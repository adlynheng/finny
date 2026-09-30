import { useEffect } from 'react';
import { startOfMonth } from 'date-fns';

import { useAccounts } from '@/hooks/useAccounts';
import { useAssetClasses } from '@/hooks/useAssetClasses';
import {
  useSnapshots,
  useUpsertSnapshot,
  type SnapshotInput,
} from '@/hooks/useSnapshots';
import { now } from '@/lib/today';
import {
  assetClassSplit,
  netWorth,
  type NetWorthAccount,
  type Snapshot,
  type AssetClass,
} from '@/utils/derive/networth';
import { toIsoDate } from '@/utils/format/date';

/**
 * This month's snapshot as the accounts stand now: net worth, what is owed, and each class's
 * assets. Null before there is anything to record, since history starts with the first balance.
 */
export function currentSnapshot(
  accounts: readonly NetWorthAccount[],
  classes: readonly AssetClass[],
  date: string,
): SnapshotInput | null {
  const worth = netWorth(accounts);
  // `Other` has no row of its own when the table has no such class; it cannot be saved.
  const split = assetClassSplit(accounts, classes).filter(c => c.id > 0);
  if (split.length === 0 && worth.liabilitiesCents === 0) {
    return null;
  }
  return {
    date,
    totalCents: worth.netCents,
    liabilitiesCents: worth.liabilitiesCents,
    classes: split.map(c => ({ assetClassId: c.id, amountCents: c.cents })),
  };
}

/** Whether a saved snapshot already holds these figures. */
export function sameSnapshot(saved: Snapshot, next: SnapshotInput): boolean {
  const amounts = (rows: { id: number; cents: number }[]) =>
    rows
      .filter(r => r.cents !== 0)
      .sort((a, b) => a.id - b.id)
      .map(r => `${r.id}:${r.cents}`)
      .join(',');
  return (
    saved.total_cents === next.totalCents &&
    saved.liabilities_cents === next.liabilitiesCents &&
    amounts(
      saved.classes.map(c => ({
        id: c.asset_class?.id ?? -1,
        cents: c.amount_cents,
      })),
    ) ===
      amounts(
        next.classes.map(c => ({ id: c.assetClassId, cents: c.amountCents })),
      )
  );
}

/**
 * Keeps this month's snapshot level with the accounts. Whenever a balance changes (a
 * transaction, an account edited), this month's row is saved over, so the history chart's last
 * point and the hero's month-on-month change follow the balances, and when the month ends its
 * row stays as the month left it. Mounted once, beside the screens.
 */
export function useSnapshotSync() {
  const accounts = useAccounts().data;
  const classes = useAssetClasses().data;
  // The last two months are in every window; 6 shares the hero's cache entry.
  const snapshots = useSnapshots(6).data;
  const { mutate } = useUpsertSnapshot();

  const date = toIsoDate(startOfMonth(now()));
  const next =
    accounts && classes && snapshots
      ? currentSnapshot(accounts, classes, date)
      : null;
  const saved = snapshots?.find(s => s.date === date);
  const stale = next !== null && (!saved || !sameSnapshot(saved, next));
  // Keyed on the figures, so a failed save is not retried until they change.
  const key = stale ? JSON.stringify(next) : null;

  useEffect(() => {
    if (key) {
      mutate(JSON.parse(key) as SnapshotInput);
    }
  }, [key, mutate]);
}
