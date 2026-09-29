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
 * together. Null until positions and quotes have loaded.
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

  if (!positions || !sales || !watchlist || (watched.length && !quotes.data)) {
    return null;
  }
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
    rate,
    rateAt,
    idle: idleCash(holdings, accounts ?? []),
    realisedCents,
  };
}
