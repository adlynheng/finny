import { useAccounts } from '@/hooks/useAccounts';
import { useInstruments } from '@/hooks/useInstruments';
import { usePositions } from '@/hooks/usePositions';
import { useQuotes } from '@/hooks/useQuotes';
import { useSales } from '@/hooks/useSales';
import { useUsdSgd } from '@/hooks/useUsdSgd';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { Quote } from '@/lib/marketData';
import type { InstrumentRow, SaleRow } from '@/types/domain';
import { idleCash, type IdleCash } from '@/utils/derive/ideas';
import {
  currencyOf,
  fxFor,
  holdingsOf,
  totalsOf,
  type Holding,
  type Totals,
} from '@/utils/derive/portfolio';

export type Book = {
  holdings: Holding[];
  totals: Totals;
  /** Newest first. */
  sales: SaleRow[];
  /** Every held and watched instrument: holdings first, then the rest in the order watched. */
  watched: InstrumentRow[];
  quotes: Record<string, Quote>;
  /** When the quotes were fetched. */
  quotedAt: Date | null;
  /**
   * `loading` until the first quotes arrive, `failed` if none could be
   * fetched, then `priced`. Until priced, holdings are valued at cost, so
   * price-dependent figures show a skeleton or a dash rather than a P&L of 0.
   */
  prices: 'loading' | 'failed' | 'priced';
  /** The last quote request failed, a first load or a refresh. */
  quoteError: boolean;
  retryQuotes: () => void;
  /** S$ per US$1. */
  rate: number;
  rateAt: Date | null;
  idle: IdleCash | null;
  /** Realised P&L across every recorded sale, in S$ cents. */
  realisedCents: number;
};

/**
 * Everything the Trading page shows, from positions, sales, the watchlist,
 * quotes and the USD/SGD rate: one quote request for held and watched symbols
 * together. Null until positions, sales and the watchlist have loaded; quotes
 * may still be on their way (see `prices`), so cost basis shows without them.
 */
export function useTradingBook(): Book | null {
  const positions = usePositions().data;
  const sales = useSales().data;
  const watchlist = useWatchlist().data;
  const accounts = useAccounts().data;
  // A sale's instrument may be neither held nor watched any more.
  const instruments = useInstruments().data;
  const { rate, fetchedAt: rateAt } = useUsdSgd();

  const watched = [
    ...(positions ?? []).map(p => p.instrument),
    ...(watchlist ?? []).map(w => w.instrument),
  ].filter((ins, i, all) => all.findIndex(o => o.id === ins.id) === i);
  const quotes = useQuotes(watched.map(i => i.symbol));

  if (!positions || !sales || !watchlist) {
    return null;
  }
  const prices =
    watched.length === 0 || quotes.data
      ? 'priced'
      : quotes.isError
      ? 'failed'
      : 'loading';
  const holdings = holdingsOf(positions, quotes.data ?? {}, rate);
  const instrumentOf = new Map(
    [...(instruments ?? []), ...watched].map(i => [i.id, i]),
  );
  const realisedCents = sales.reduce((sum, s) => {
    const ins = instrumentOf.get(s.instrument_id);
    const fx = ins ? fxFor(currencyOf(ins), rate) : 1;
    return sum + Math.round(s.realized_pnl_cents * fx);
  }, 0);

  return {
    holdings,
    totals: totalsOf(holdings),
    sales,
    watched,
    quotes: quotes.data ?? {},
    quotedAt: quotes.dataUpdatedAt ? new Date(quotes.dataUpdatedAt) : null,
    prices,
    quoteError: quotes.isError,
    retryQuotes: () => {
      quotes.refetch();
    },
    rate,
    rateAt,
    idle: idleCash(holdings, accounts ?? []),
    realisedCents,
  };
}
