import { useCallback } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';

import { fetchBars, type Bar } from '@/lib/marketData';
import { queryKeys, type BarRange } from '@/lib/queryKeys';

/** Daily closes change once a day; the bars function caches for about 12 hours. */
const BARS_STALE_MS = 12 * 60 * 60_000;

/**
 * Each symbol's daily closes over `range`, oldest first, keyed by symbol: one
 * cached request per symbol and range, so switching range or mode refetches
 * only what has not been fetched. `bars` holds the symbols loaded so far.
 */
export function useBars(symbols: readonly string[], range: BarRange) {
  const unique = [...new Set(symbols)];
  const key = unique.join(',');
  // Stable while the symbols are, so the result is too until a query changes.
  const combine = useCallback(
    (results: UseQueryResult<Bar[]>[]) => {
      const list = key ? key.split(',') : [];
      return {
        bars: Object.fromEntries(
          list.flatMap((symbol, i) => {
            const data = results[i]?.data;
            return data ? [[symbol, data]] : [];
          }),
        ) as Record<string, Bar[]>,
        isPending: results.some(r => r.isPending),
      };
    },
    [key],
  );
  return useQueries({
    queries: unique.map(symbol => ({
      queryKey: queryKeys.bars.series(symbol, range),
      queryFn: () => fetchBars(symbol, range),
      staleTime: BARS_STALE_MS,
    })),
    combine,
  });
}
