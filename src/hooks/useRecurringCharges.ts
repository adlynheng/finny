import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { isExisting, type Save } from '@/lib/save';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type {
  RecurringChargeInsert,
  RecurringChargeUpdate,
} from '@/types/domain';

export function useRecurringCharges() {
  return useQuery({
    queryKey: queryKeys.recurringCharges.list(),
    queryFn: async () =>
      unwrap(await supabase.from('recurring_charge').select('*').order('name')),
  });
}

function useInvalidateRecurringCharges() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.recurringCharges.all });
}

/**
 * Inserts a new recurring charge, or updates the given fields of one when the row carries its id.
 * Resolves to the saved row.
 */
export function useUpsertRecurringCharge() {
  const onSettled = useInvalidateRecurringCharges();
  return useMutation({
    mutationFn: async (
      row: Save<RecurringChargeInsert, RecurringChargeUpdate>,
    ) => {
      if (isExisting(row)) {
        const { id, ...fields } = row;
        return unwrap(
          await supabase
            .from('recurring_charge')
            .update(fields)
            .eq('id', id)
            .select()
            .single(),
        );
      }
      return unwrap(
        await supabase.from('recurring_charge').insert(row).select().single(),
      );
    },
    onSettled,
  });
}

/**
 * Deletes a charge. Its past payments stay in the ledger: they are unlinked
 * from it first, since `txn.recurring_id` would otherwise block the delete.
 */
export function useDeleteRecurringCharge() {
  const queryClient = useQueryClient();
  const onSettled = useInvalidateRecurringCharges();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(
        await supabase
          .from('txn')
          .update({ recurring_id: null })
          .eq('recurring_id', id),
      );
      unwrap(await supabase.from('recurring_charge').delete().eq('id', id));
    },
    onSettled: () =>
      Promise.all([
        onSettled(),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      ]),
  });
}
