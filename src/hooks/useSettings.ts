import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { SettingsUpdate } from '@/types/domain';

/** The settings table holds exactly one row; the schema checks its id is 1. */
const SETTINGS_ID = 1;

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.detail(),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('settings')
          .select('*')
          .eq('id', SETTINGS_ID)
          .single(),
      ),
  });
}

/** Updates only the fields given. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: SettingsUpdate) =>
      unwrap(
        await supabase
          .from('settings')
          .update(patch)
          .eq('id', SETTINGS_ID)
          .select()
          .single(),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all }),
  });
}
