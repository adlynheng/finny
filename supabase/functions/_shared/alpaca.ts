/**
 * The market-data functions' logic, kept free of Deno so Jest can test it. Quotes: Alpaca's
 * stock snapshots turned into each symbol's latest price and day change, behind a short
 * per-symbol cache so the Mac and the phone asking together call Alpaca once. Bars: a symbol's
 * daily closes over a range, behind a long cache, since they change once a day.
 */

/** A symbol's latest price, in cents of its own currency, and today's change in percentage points. */
export type Quote = { priceCents: number; dayChangePercent: number };

/** Each asked-for symbol's quote, or null where Alpaca has none (an unknown or non-US symbol). */
export type Quotes = Record<string, Quote | null>;

/** The part of Alpaca's snapshot this reads. */
export type Snapshot = {
  latestTrade?: { p?: number } | null;
  dailyBar?: { c?: number } | null;
  prevDailyBar?: { c?: number } | null;
};

/** Fetches snapshots for `symbols`, keyed by symbol; a symbol Alpaca does not know is left out. */
export type FetchSnapshots = (
  symbols: readonly string[],
) => Promise<Record<string, Snapshot | null | undefined>>;

export const ALPACA_DATA_URL = 'https://data.alpaca.markets';

/** About the time a price can sit before the page should show a newer one. */
export const QUOTE_CACHE_MS = 45_000;

/** How many symbols one request may ask for: a watchlist and a portfolio, with room to spare. */
export const MAX_SYMBOLS = 100;

/**
 * A US ticker as Alpaca writes one: letters, with an optional share class (BRK.B). Alpaca
 * rejects a whole request over one symbol outside this, such as SGX's D05, so those are never
 * sent; a letters-only symbol it does not know is simply left out of its reply.
 */
const US_TICKER = /^[A-Z]{1,6}([./][A-Z]{1,2})?$/;

export const isUsTicker = (symbol: string) => US_TICKER.test(symbol);

/** Alpaca's multi-symbol snapshots on the free IEX feed. Throws on a failed reply. */
export function alpacaSnapshots(
  keyId: string,
  secret: string,
  fetcher: typeof fetch = fetch,
): FetchSnapshots {
  return async symbols => {
    const url = `${ALPACA_DATA_URL}/v2/stocks/snapshots?feed=iex&symbols=${symbols
      .map(encodeURIComponent)
      .join(',')}`;
    const response = await fetcher(url, {
      headers: { 'APCA-API-KEY-ID': keyId, 'APCA-API-SECRET-KEY': secret },
    });
    if (!response.ok) {
      throw new Error(`Alpaca snapshots: HTTP ${response.status}`);
    }
    return response.json();
  };
}

/** A snapshot's quote: the last trade (or, without one, today's close) against yesterday's close. */
export function toQuote(snapshot: Snapshot | null | undefined): Quote | null {
  const price = snapshot?.latestTrade?.p ?? snapshot?.dailyBar?.c;
  if (typeof price !== 'number' || !(price > 0)) {
    return null;
  }
  const previous = snapshot?.prevDailyBar?.c;
  return {
    priceCents: Math.round(price * 100),
    dayChangePercent:
      typeof previous === 'number' && previous > 0
        ? ((price - previous) / previous) * 100
        : 0,
  };
}

/** The request's symbols: upper-cased, deduplicated and capped; anything but a list of strings is none. */
export function parseSymbols(body: unknown): string[] {
  const symbols = (body as { symbols?: unknown } | null)?.symbols;
  if (!Array.isArray(symbols)) {
    return [];
  }
  const clean = symbols
    .filter((s): s is string => typeof s === 'string')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
  return [...new Set(clean)].slice(0, MAX_SYMBOLS);
}

/**
 * A quote lookup that answers each symbol from its cache while fresh and asks Alpaca, once, for
 * the rest. A symbol that cannot be a US ticker is null without asking; an unknown one is cached
 * as null like any other answer. A failed call leaves those
 * symbols null and uncached, so the next request tries again, while the cached ones still answer.
 */
export function createQuoteSource(
  fetchSnapshots: FetchSnapshots,
  now: () => number = Date.now,
  ttlMs = QUOTE_CACHE_MS,
) {
  const cache = new Map<string, { quote: Quote | null; at: number }>();
  return async (symbols: readonly string[]): Promise<Quotes> => {
    const time = now();
    const quotes: Quotes = {};
    const missing: string[] = [];
    for (const symbol of symbols) {
      const hit = cache.get(symbol);
      if (!isUsTicker(symbol)) {
        quotes[symbol] = null;
      } else if (hit && time - hit.at < ttlMs) {
        quotes[symbol] = hit.quote;
      } else {
        missing.push(symbol);
      }
    }
    if (missing.length > 0) {
      try {
        const snapshots = await fetchSnapshots(missing);
        for (const symbol of missing) {
          const quote = toQuote(snapshots[symbol]);
          cache.set(symbol, { quote, at: time });
          quotes[symbol] = quote;
        }
      } catch (error) {
        console.error(error);
        for (const symbol of missing) {
          quotes[symbol] = null;
        }
      }
    }
    return quotes;
  };
}

/** The P&L chart's ranges, and the calendar days each spans (as the app's RANGE_DAYS). */
export const RANGE_DAYS = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365 } as const;

export type BarRange = keyof typeof RANGE_DAYS;

/** One day's close, in cents of the symbol's own currency. */
export type Bar = { date: string; closeCents: number };

/** Daily bars change once a day. */
export const BARS_CACHE_MS = 12 * 60 * 60_000;

/** Fetches a symbol's daily closes from `start` (YYYY-MM-DD) to today, oldest first. */
export type FetchBars = (symbol: string, start: string) => Promise<Bar[]>;

/** The request's symbol and range; null for anything else. */
export function parseBarsRequest(
  body: unknown,
): { symbol: string; range: BarRange } | null {
  const { symbol, range } = (body ?? {}) as {
    symbol?: unknown;
    range?: unknown;
  };
  if (typeof symbol !== 'string' || typeof range !== 'string') {
    return null;
  }
  const clean = symbol.trim().toUpperCase();
  return clean && range in RANGE_DAYS
    ? { symbol: clean, range: range as BarRange }
    : null;
}

/**
 * Alpaca's daily bars on the free IEX feed, split-adjusted, following its pages. A bar's time
 * is midnight New York, so its UTC date is the trading day. Throws on a failed reply.
 */
export function alpacaBars(
  keyId: string,
  secret: string,
  fetcher: typeof fetch = fetch,
): FetchBars {
  return async (symbol, start) => {
    const bars: Bar[] = [];
    let page: string | null = null;
    do {
      const url =
        `${ALPACA_DATA_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars` +
        `?timeframe=1Day&feed=iex&adjustment=all&limit=1000&start=${start}` +
        (page ? `&page_token=${encodeURIComponent(page)}` : '');
      const response = await fetcher(url, {
        headers: { 'APCA-API-KEY-ID': keyId, 'APCA-API-SECRET-KEY': secret },
      });
      if (!response.ok) {
        throw new Error(`Alpaca bars: HTTP ${response.status}`);
      }
      const body: {
        bars?: { t: string; c: number }[] | null;
        next_page_token?: string | null;
      } = await response.json();
      for (const b of body.bars ?? []) {
        bars.push({
          date: b.t.slice(0, 10),
          closeCents: Math.round(b.c * 100),
        });
      }
      page = body.next_page_token ?? null;
    } while (page);
    return bars;
  };
}

/** `days` before `now`, as YYYY-MM-DD. */
const daysBefore = (now: number, days: number) =>
  new Date(now - days * 86_400_000).toISOString().slice(0, 10);

/**
 * A bars lookup cached by symbol and range. A symbol that cannot be a US ticker has no closes,
 * without asking; a new listing returns the closes it has. A failed call throws and is not cached.
 */
export function createBarsSource(
  fetchBars: FetchBars,
  now: () => number = Date.now,
  ttlMs = BARS_CACHE_MS,
) {
  const cache = new Map<string, { bars: Bar[]; at: number }>();
  return async (symbol: string, range: BarRange): Promise<Bar[]> => {
    if (!isUsTicker(symbol)) {
      return [];
    }
    const time = now();
    const key = `${symbol}:${range}`;
    const hit = cache.get(key);
    if (hit && time - hit.at < ttlMs) {
      return hit.bars;
    }
    const bars = await fetchBars(symbol, daysBefore(time, RANGE_DAYS[range]));
    cache.set(key, { bars, at: time });
    return bars;
  };
}
