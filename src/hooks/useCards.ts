import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { isExisting, type Save } from '@/lib/save';
import { unwrap } from '@/lib/unwrap';
import type { CardInsert, CardUpdate } from '@/types/domain';

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards.list(),
    queryFn: async () =>
      unwrap(await supabase.from('card').select('*').order('id')),
  });
}

/** Card balances feed net worth, so every card change also refreshes the snapshots. */
function useInvalidateCards() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all }),
    ]);
}

/**
 * Inserts a new card, or updates the given fields of one when the row carries its id.
 * Resolves to the saved row.
 */
export function useUpsertCard() {
  const onSettled = useInvalidateCards();
  return useMutation({
    mutationFn: async (card: Save<CardInsert, CardUpdate>) => {
      if (isExisting(card)) {
        const { id, ...fields } = card;
        return unwrap(
          await supabase
            .from('card')
            .update(fields)
            .eq('id', id)
            .select()
            .single(),
        );
      }
      return unwrap(await supabase.from('card').insert(card).select().single());
    },
    onSettled,
  });
}

/** The Settings card drawer's "Count toward monthly budget" toggle. */
export function useSetCardInBudget() {
  const onSettled = useInvalidateCards();
  return useMutation({
    mutationFn: async ({
      id,
      includeInBudget,
    }: {
      id: number;
      includeInBudget: boolean;
    }) => {
      unwrap(
        await supabase
          .from('card')
          .update({ include_in_budget: includeInBudget })
          .eq('id', id),
      );
    },
    onSettled,
  });
}
