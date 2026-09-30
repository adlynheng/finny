/**
 * Every TanStack Query key in the app. Hooks read with these and mutations invalidate with them,
 * so a key is never typed inline: a typo there is a mutation that silently fails to refresh the
 * screen. Each resource's keys start with its `all` root, so invalidating the root refreshes every
 * filtered variant of it.
 */

import type { CategoryKind } from '@/types/domain';

/** The Overview history card's range toggles. */
export type SnapshotWindow = 6 | 12 | 24;

/** The Trading P&L chart's ranges, served by the `market-data-bars` function. */
export type BarRange = '1M' | '3M' | '6M' | '1Y';

/** A resource read as one list, with no filters. */
function listResource<const Root extends string>(root: Root) {
  const all = [root] as const;
  return { all, list: () => [...all, 'list'] as const };
}

const settings = ['settings'] as const;
const categories = ['categories'] as const;
const transactions = ['transactions'] as const;
const snapshots = ['snapshots'] as const;
const fx = ['fx'] as const;
const quotes = ['quotes'] as const;
const bars = ['bars'] as const;
const listings = ['listings'] as const;

export const queryKeys = {
  settings: { all: settings, detail: () => [...settings, 'detail'] as const },
  assetClasses: listResource('assetClasses'),
  accounts: listResource('accounts'),
  cards: listResource('cards'),
  categories: {
    all: categories,
    /** Settings reads expense and deposit categories separately; no kind means both. */
    list: (kind?: CategoryKind) =>
      [...categories, 'list', kind ?? 'all'] as const,
  },
  goals: listResource('goals'),
  transactions: {
    all: transactions,
    /** `month` is `YYYY-MM`; no month means every transaction. */
    list: (month?: string) =>
      [...transactions, 'list', month ?? 'all'] as const,
  },
  recurringCharges: listResource('recurringCharges'),
  incomeSources: listResource('incomeSources'),
  instruments: listResource('instruments'),
  positions: listResource('positions'),
  sales: listResource('sales'),
  watchlist: listResource('watchlist'),
  snapshots: {
    all: snapshots,
    window: (months: SnapshotWindow) =>
      [...snapshots, 'window', months] as const,
  },
  fx: { all: fx, usdSgd: () => [...fx, 'USD', 'SGD'] as const },
  quotes: {
    all: quotes,
    /** Sorted and deduplicated, so the same set of symbols is always one cache entry. */
    symbols: (symbols: readonly string[]) =>
      [...quotes, [...new Set(symbols)].sort()] as const,
  },
  bars: {
    all: bars,
    series: (symbol: string, range: BarRange) =>
      [...bars, symbol, range] as const,
  },
  listings: { all: listings, us: () => [...listings, 'US'] as const },
};
