import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { findOrCreateInstrument, normaliseSymbol } from './useInstruments';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { InstrumentInsert } from '@/types/domain';

/**
 * Every position with its instrument and open lots, in one query rather than one per holding:
 * the Positions table shows each holding with its lots expanded inline. Lots come oldest first,
 * the order FIFO sells them in; positions come by symbol.
 */
export function usePositions() {
  return useQuery({
    queryKey: queryKeys.positions.list(),
    queryFn: async () => {
      const positions = unwrap(
        await supabase
          .from('position')
          .select('*, instrument(*), lots:lot(*)')
          .order('purchased_at', { referencedTable: 'lots' })
          .order('id', { referencedTable: 'lots' }),
      );
      return positions.sort((a, b) =>
        a.instrument.symbol.localeCompare(b.instrument.symbol),
      );
    },
  });
}

export type NewLot = {
  /** Only used when the symbol is new; a known instrument is left as stored. */
  instrument: InstrumentInsert;
  quantity: number;
  costPerUnitCents: number;
  /** ISO date, `YYYY-MM-DD`. */
  purchasedAt: string;
};

/**
 * Records a purchase. Covers the three cases the Add position form merges: a new symbol creates
 * its instrument, position and lot; a known symbol that is not held (say, from the watchlist)
 * gets a position and lot; a held symbol only gains a lot. Resolves to the new lot.
 *
 * These are separate requests, not one transaction: if a later one fails, an earlier instrument
 * or empty position is left behind. Both are harmless (the next attempt reuses them), unlike a
 * failed sale, which is why Task 69's sale goes through a Postgres function instead.
 */
export function useAddPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instrument,
      quantity,
      costPerUnitCents,
      purchasedAt,
    }: NewLot) => {
      normaliseSymbol(instrument.symbol);
      if (!(quantity > 0) || !Number.isFinite(quantity)) {
        throw new Error('The quantity must be more than zero.');
      }
      if (!Number.isInteger(costPerUnitCents) || costPerUnitCents <= 0) {
        throw new Error('The price must be a positive whole number of cents.');
      }

      const found = await findOrCreateInstrument(instrument);
      const positionId =
        found.positionId ??
        unwrap(
          await supabase
            .from('position')
            .insert({ instrument_id: found.id })
            .select('id')
            .single(),
        ).id;
      return unwrap(
        await supabase
          .from('lot')
          .insert({
            position_id: positionId,
            quantity,
            cost_per_unit_cents: costPerUnitCents,
            purchased_at: purchasedAt,
          })
          .select()
          .single(),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.instruments.all }),
      ]),
  });
}
