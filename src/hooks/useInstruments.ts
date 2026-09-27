import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { InstrumentInsert } from '@/types/domain';

/** Symbols are stored trimmed and upper-case, as the Add position form shows them. */
export function normaliseSymbol(symbol: string) {
  const normalised = symbol.trim().toUpperCase();
  if (!normalised) {
    throw new Error('A symbol is required.');
  }
  return normalised;
}

/**
 * The instrument for a symbol, created from `instrument` if the symbol is new. A known
 * instrument is reused exactly as stored: once a symbol is held its market, type and industry
 * must not change. Also says which position holds it, if any, from the same query.
 */
export async function findOrCreateInstrument(
  instrument: InstrumentInsert,
): Promise<{ id: number; positionId: number | null }> {
  const symbol = normaliseSymbol(instrument.symbol);
  const found = unwrap(
    await supabase
      .from('instrument')
      .select('id, position(id)')
      .eq('symbol', symbol)
      .maybeSingle(),
  );
  if (found) {
    return { id: found.id, positionId: found.position[0]?.id ?? null };
  }
  const created = unwrap(
    await supabase
      .from('instrument')
      .insert({ ...instrument, symbol })
      .select('id')
      .single(),
  );
  return { id: created.id, positionId: null };
}

export function useInstruments() {
  return useQuery({
    queryKey: queryKeys.instruments.list(),
    queryFn: async () =>
      unwrap(await supabase.from('instrument').select('*').order('symbol')),
  });
}

/**
 * Saves an instrument keyed on its symbol: a known symbol updates the given fields of its row
 * instead of adding a second one. Resolves to the saved row.
 */
export function useUpsertInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instrument: InstrumentInsert) => {
      const row = { ...instrument, symbol: normaliseSymbol(instrument.symbol) };
      return unwrap(
        await supabase
          .from('instrument')
          .upsert(row, { onConflict: 'symbol' })
          .select()
          .single(),
      );
    },
    // Positions and the watchlist embed instrument details, so they refresh too.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instruments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all }),
      ]),
  });
}
