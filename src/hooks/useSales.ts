import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';

/** Recorded sales, newest first. Recording one is Task 69's FIFO write. */
export function useSales() {
  return useQuery({
    queryKey: queryKeys.sales.list(),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('sale')
          .select('*')
          .order('sold_at', { ascending: false })
          .order('id', { ascending: false }),
      ),
  });
}
