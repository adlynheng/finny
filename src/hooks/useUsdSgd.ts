import { useQuery } from '@tanstack/react-query';

import { FALLBACK_USD_SGD, fetchUsdSgd } from '@/lib/marketData';
import { queryKeys } from '@/lib/queryKeys';

/** The rate updates hourly. */
const FX_STALE_MS = 60 * 60_000;

/**
 * The USD/SGD rate and when it was fetched. Until a first fetch succeeds the
 * rate is the fallback and `fetchedAt` null, so prices can still convert;
 * every consumer treats the rate as possibly stale.
 */
export function useUsdSgd() {
  const query = useQuery({
    queryKey: queryKeys.fx.usdSgd(),
    queryFn: fetchUsdSgd,
    staleTime: FX_STALE_MS,
  });
  return {
    rate: query.data?.rate ?? FALLBACK_USD_SGD,
    fetchedAt: query.data?.fetchedAt ?? null,
  };
}
