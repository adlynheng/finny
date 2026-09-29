import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import { consumeFifo, type Lot } from '@/utils/derive/positions';

/** Recorded sales, newest first. */
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

export type NewSale = {
  instrumentId: number;
  /** Where the proceeds go. */
  accountId: number;
  /** The position's open lots, as read. */
  lots: readonly Lot[];
  quantity: number;
  /** In the instrument's currency. */
  pricePerUnitCents: number;
  /** ISO date, `YYYY-MM-DD`. */
  soldAt: string;
};

/**
 * Records a sale, oldest lots first. The FIFO consumer decides which lots it
 * draws on (and refuses to sell more than is held); the record_sale function
 * then writes the sale, reduces or deletes those lots and closes an emptied
 * position in one transaction, refusing if any lot changed since it was read.
 * Resolves to the new sale's id.
 */
export function useRecordSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instrumentId,
      accountId,
      lots,
      quantity,
      pricePerUnitCents,
      soldAt,
    }: NewSale) => {
      if (!Number.isInteger(pricePerUnitCents) || pricePerUnitCents <= 0) {
        throw new Error('The price must be a positive whole number of cents.');
      }
      const read = new Map(lots.map(l => [l.id, l.quantity]));
      const { consumed } = consumeFifo(lots, quantity);
      return unwrap(
        await supabase.rpc('record_sale', {
          p_instrument_id: instrumentId,
          p_account_id: accountId,
          p_quantity: quantity,
          p_price_per_unit_cents: pricePerUnitCents,
          p_sold_at: soldAt,
          p_lots: consumed.map(c => ({
            id: c.lotId,
            quantity: read.get(c.lotId)!,
            remaining: c.remainingQuantity,
          })),
        }),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
      ]),
  });
}
