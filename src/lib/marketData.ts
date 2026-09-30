/**
 * Market data: latest quotes, daily closes and the USD/SGD rate. Prices and
 * rates are live passthrough, never written to a table.
 *
 * Quotes and closes come from Alpaca through the `market-data-quote` and
 * `market-data-bars` Edge Functions, which hold the Alpaca key; the rate comes
 * straight from exchangerate.fun, which needs none. Alpaca covers US listings
 * only, so an SGX or LSE symbol has no quote and no closes.
 */

import type { BarRange } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { now } from '@/lib/today';

export type Quote = {
  /** In the instrument's own currency. */
  priceCents: number;
  /** Today's change, in percentage points. */
  dayChangePercent: number;
};

/** One day's close, in the instrument's own currency. */
export type Bar = { date: string; closeCents: number };

export type UsdSgd = {
  /** S$ per US$1. */
  rate: number;
  fetchedAt: Date;
};

/** The calendar days each range spans; the bars function holds the same. */
export const RANGE_DAYS: Record<BarRange, number> = {
  '1M': 30,
  '3M': 91,
  '6M': 182,
  '1Y': 365,
};

/**
 * The rate the design shows, and Task 86's fallback until a first fetch
 * succeeds.
 */
export const FALLBACK_USD_SGD = 1.3512;

/** Latest quotes for `symbols`; a symbol with no quote is left out. Throws if the call fails. */
export async function fetchQuotes(
  symbols: readonly string[],
): Promise<Record<string, Quote>> {
  const { data, error } = await supabase.functions.invoke<{
    quotes: Record<string, Quote | null>;
  }>('market-data-quote', { body: { symbols } });
  if (error || !data) {
    throw error ?? new Error('market-data-quote: no reply');
  }
  return Object.fromEntries(
    Object.entries(data.quotes).filter(
      (entry): entry is [string, Quote] => entry[1] !== null,
    ),
  );
}

/** A symbol's daily closes over `range`, oldest first. Throws if the call fails. */
export async function fetchBars(
  symbol: string,
  range: BarRange,
): Promise<Bar[]> {
  const { data, error } = await supabase.functions.invoke<{ bars: Bar[] }>(
    'market-data-bars',
    { body: { symbol, range } },
  );
  if (error || !data) {
    throw error ?? new Error('market-data-bars: no reply');
  }
  return data.bars;
}

/** exchangerate.fun's latest rates: no key, no limit, updated hourly. */
export const FX_URL = 'https://api.exchangerate.fun/latest?base=USD';

/** The live USD/SGD rate, stamped with when it was fetched. Throws on a failed or malformed reply. */
export async function fetchUsdSgd(): Promise<UsdSgd> {
  const response = await fetch(FX_URL);
  if (!response.ok) {
    throw new Error(`FX rates: HTTP ${response.status}`);
  }
  const body: { rates?: Record<string, unknown> } = await response.json();
  const rate = body.rates?.SGD;
  if (typeof rate !== 'number' || !(rate > 0)) {
    throw new Error('FX rates: no USD/SGD rate');
  }
  return { rate, fetchedAt: now() };
}
