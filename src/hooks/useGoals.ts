import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { GoalInsert } from '@/types/domain';

/** Goals in the order they are arranged. */
export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: async () =>
      unwrap(
        await supabase.from('goal').select('*').order('sort_order').order('id'),
      ),
  });
}

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
}

/** Inserts a goal. Resolves to the saved row. */
export function useAddGoal() {
  const onSettled = useInvalidateGoals();
  return useMutation({
    mutationFn: async (goal: GoalInsert) =>
      unwrap(await supabase.from('goal').insert(goal).select().single()),
    onSettled,
  });
}

export function useDeleteGoal() {
  const onSettled = useInvalidateGoals();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await supabase.from('goal').delete().eq('id', id));
    },
    onSettled,
  });
}
