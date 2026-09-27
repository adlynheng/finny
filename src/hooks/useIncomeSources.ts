import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { isExisting, type Save } from '@/lib/save';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { IncomeSourceInsert, IncomeSourceUpdate } from '@/types/domain';

export function useIncomeSources() {
  return useQuery({
    queryKey: queryKeys.incomeSources.list(),
    queryFn: async () =>
      unwrap(await supabase.from('income_source').select('*').order('name')),
  });
}

function useInvalidateIncomeSources() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.incomeSources.all });
}

/**
 * Inserts a new income source, or updates the given fields of one when the row carries its id.
 * Resolves to the saved row.
 */
export function useUpsertIncomeSource() {
  const onSettled = useInvalidateIncomeSources();
  return useMutation({
    mutationFn: async (row: Save<IncomeSourceInsert, IncomeSourceUpdate>) => {
      if (isExisting(row)) {
        const { id, ...fields } = row;
        return unwrap(
          await supabase
            .from('income_source')
            .update(fields)
            .eq('id', id)
            .select()
            .single(),
        );
      }
      return unwrap(
        await supabase.from('income_source').insert(row).select().single(),
      );
    },
    onSettled,
  });
}

export function useDeleteIncomeSource() {
  const onSettled = useInvalidateIncomeSources();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await supabase.from('income_source').delete().eq('id', id));
    },
    onSettled,
  });
}
