import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys, type SnapshotWindow } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { now } from '@/lib/today';
import { unwrap } from '@/lib/unwrap';

/** The first day of the month `months - 1` months before this one, as `YYYY-MM-DD`. */
function windowStart(months: SnapshotWindow) {
  const current = now();
  const start = new Date(
    current.getFullYear(),
    current.getMonth() - (months - 1),
    1,
  );
  const month = String(start.getMonth() + 1).padStart(2, '0');
  return `${start.getFullYear()}-${month}-01`;
}

/**
 * The Overview history card's points: one snapshot per month for the last 6, 12 or 24 months
 * (this month included), oldest first, each with its per-asset-class amounts and labels.
 */
export function useSnapshots(months: SnapshotWindow) {
  return useQuery({
    queryKey: queryKeys.snapshots.window(months),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('net_worth_snapshot')
          .select(
            '*, classes:net_worth_snapshot_class(amount_cents, asset_class(id, label, color))',
          )
          .gte('date', windowStart(months))
          .order('date'),
      ),
  });
}

export type SnapshotInput = {
  /** `YYYY-MM-DD`; one snapshot per date. */
  date: string;
  totalCents: number;
  liabilitiesCents: number;
  classes: { assetClassId: number; amountCents: number }[];
};

/**
 * Saves the snapshot for a date, replacing any already saved for it: re-running a month
 * overwrites it rather than adding a second row.
 *
 * The class rows are upserted first and stale ones deleted after, rather than deleted and
 * re-inserted, so a failure part-way leaves the old amounts in place instead of none. These are
 * separate requests, so a failure between them can leave the total and the class rows out of
 * step until the next save of that date.
 */
export function useUpsertSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      totalCents,
      liabilitiesCents,
      classes,
    }: SnapshotInput) => {
      const { id } = unwrap(
        await supabase
          .from('net_worth_snapshot')
          .upsert(
            {
              date,
              total_cents: totalCents,
              liabilities_cents: liabilitiesCents,
            },
            { onConflict: 'date' },
          )
          .select('id')
          .single(),
      );

      if (classes.length > 0) {
        unwrap(
          await supabase.from('net_worth_snapshot_class').upsert(
            classes.map(({ assetClassId, amountCents }) => ({
              snapshot_id: id,
              asset_class_id: assetClassId,
              amount_cents: amountCents,
            })),
            { onConflict: 'snapshot_id,asset_class_id' },
          ),
        );
      }

      const stale = supabase
        .from('net_worth_snapshot_class')
        .delete()
        .eq('snapshot_id', id);
      unwrap(
        await (classes.length > 0
          ? stale.not(
              'asset_class_id',
              'in',
              `(${classes.map(c => c.assetClassId).join(',')})`,
            )
          : stale),
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all }),
  });
}
