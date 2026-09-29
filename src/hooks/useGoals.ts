import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';

/** Goals in the order they are arranged. Creating and removing them comes with the Planner. */
export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('goal')
          .select('*')
          .order('sort_order')
          .order('id'),
      ),
  });
}
