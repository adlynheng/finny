import { useQuery } from '@tanstack/react-query';

import { fetchUsListings } from '@/lib/listings';
import { queryKeys } from '@/lib/queryKeys';

/** Nasdaq rewrites the list once a day. */
const LISTINGS_STALE_MS = 24 * 60 * 60_000;

/**
 * Every US-listed stock and ETF, for the symbol search. Kept for a day once
 * fetched, even with no form open, so reopening the form needs no refetch.
 */
export function useUsListings() {
  return useQuery({
    queryKey: queryKeys.listings.us(),
    queryFn: fetchUsListings,
    staleTime: LISTINGS_STALE_MS,
    gcTime: LISTINGS_STALE_MS,
  });
}
