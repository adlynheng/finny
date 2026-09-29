import { useQuery } from '@tanstack/react-query';

import { fetchQuotes } from '@/lib/marketData';
import { queryKeys } from '@/lib/queryKeys';

/** The quote function caches for about 45 seconds; asking sooner would only get the same. */
const QUOTE_STALE_MS = 45_000;

/**
 * Latest price and day change for each symbol, by symbol. The key sorts and
 * deduplicates the symbols, so positions and the watchlist asking for the same
 * set share one request.
 */
export function useQuotes(symbols: readonly string[]) {
  const key = queryKeys.quotes.symbols(symbols);
  return useQuery({
    queryKey: key,
    queryFn: () => fetchQuotes(key[1]),
    staleTime: QUOTE_STALE_MS,
    enabled: symbols.length > 0,
  });
}
