import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';

/** Read-only: the seed migration sets the classes, in display order. */
export function useAssetClasses() {
  return useQuery({
    queryKey: queryKeys.assetClasses.list(),
    queryFn: async () =>
      unwrap(await supabase.from('asset_class').select('*').order('id')),
  });
}
