import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { findOrCreateInstrument } from './useInstruments';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { InstrumentInsert } from '@/types/domain';

/** Watched symbols with their instruments, in the order they were added. */
export function useWatchlist() {
  return useQuery({
    queryKey: queryKeys.watchlist.list(),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('watchlist_item')
          .select('*, instrument(*)')
          .order('added_at')
          .order('id'),
      ),
  });
}

/** Watches a symbol, creating its instrument if it is new. Watching it twice changes nothing. */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instrument: InstrumentInsert) => {
      const { id } = await findOrCreateInstrument(instrument);
      unwrap(
        await supabase
          .from('watchlist_item')
          .upsert(
            { instrument_id: id },
            { onConflict: 'instrument_id', ignoreDuplicates: true },
          ),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.instruments.all }),
      ]),
  });
}

/** Stops watching; the instrument stays, since positions or sales may use it. */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await supabase.from('watchlist_item').delete().eq('id', id));
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all }),
  });
}
