/**
 * Market data: latest quotes, daily closes and the USD/SGD rate. Prices and
 * rates are live passthrough, never written to a table.
 *
 * These are stubs (build plan Phase K): they answer from a fixed table so the
 * Trading page can be built and reviewed before the market-data Edge
 * Functions exist. Phase N replaces the three fetchers' bodies (Tasks 86–89);
 * their signatures stay. The table holds the design's prices for the seeded
 * symbols, and the closes are the design's own seeded random walk ending at
 * today's price, so the P&L chart and sparklines draw as the design does. A
 * symbol the table does not know has no quote and no closes.
 */

import { subDays } from 'date-fns';

import type { BarRange } from '@/lib/queryKeys';
import { now } from '@/lib/today';
import { toIsoDate } from '@/utils/format/date';

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

/** How many daily closes each range spans, as the design's ranges do. */
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

/** The design's instruments: price, day change %, the year's return and daily volatility. */
const STUB: Record<
  string,
  { price: number; day: number; year: number; vol: number }
> = {
  VWRA: { price: 142.65, day: 0.42, year: 0.14, vol: 0.01 },
  D05: { price: 44.12, day: 0.34, year: 0.21, vol: 0.013 },
  NVDA: { price: 178.4, day: 2.14, year: 0.55, vol: 0.028 },
  ES3: { price: 3.96, day: -0.25, year: 0.12, vol: 0.008 },
  C38U: { price: 2.12, day: 0.47, year: 0.08, vol: 0.009 },
  AAPL: { price: 231.8, day: -0.61, year: 0.18, vol: 0.017 },
  MSFT: { price: 438.9, day: 0.88, year: 0.09, vol: 0.015 },
  TSLA: { price: 241.3, day: -1.92, year: -0.12, vol: 0.032 },
  QQQ: { price: 512.3, day: 0.95, year: 0.2, vol: 0.013 },
  AMZN: { price: 212.4, day: 1.12, year: 0.16, vol: 0.02 },
  O39: { price: 16.84, day: -0.18, year: 0.15, vol: 0.011 },
  C6L: { price: 6.72, day: 0.6, year: 0.04, vol: 0.014 },
};

/** Latest quotes for `symbols`; a symbol with no quote is left out. */
export async function fetchQuotes(
  symbols: readonly string[],
): Promise<Record<string, Quote>> {
  return Object.fromEntries(
    symbols.flatMap(s => {
      const known = STUB[s];
      return known
        ? [
            [
              s,
              {
                priceCents: Math.round(known.price * 100),
                dayChangePercent: known.day,
              },
            ],
          ]
        : [];
    }),
  );
}

/** A symbol's daily closes over `range`, oldest first, the last one today. */
export async function fetchBars(
  symbol: string,
  range: BarRange,
): Promise<Bar[]> {
  const known = STUB[symbol];
  if (!known) {
    return [];
  }
  const year = walk(known, seedOf(symbol));
  const days = RANGE_DAYS[range];
  const today = now();
  return year.slice(-days).map((close, i) => ({
    date: toIsoDate(subDays(today, days - 1 - i)),
    closeCents: Math.round(close * 100),
  }));
}

export async function fetchUsdSgd(): Promise<UsdSgd> {
  return { rate: FALLBACK_USD_SGD, fetchedAt: now() };
}

/** The design's `gen()`: 366 closes from a year ago to today, ending at today's price. */
function walk(
  { price, year, vol }: (typeof STUB)[string],
  seed: number,
): number[] {
  const n = 365;
  const random = mulberry32(seed);
  const steps = [0];
  for (let i = 1; i <= n; i++) {
    steps.push(steps[i - 1]! + (random() - 0.5) * 2);
  }
  const start = price / (1 + year);
  return steps.map(
    (v, i) =>
      start *
      Math.pow(price / start, i / n) *
      Math.exp(vol * (v - (steps[n]! * i) / n)),
  );
}

/** The design's seed for a symbol. */
function seedOf(symbol: string): number {
  let seed = 13;
  for (const ch of symbol) {
    seed = (seed * 31 + ch.charCodeAt(0)) % 1000003;
  }
  return seed;
}

/** The design's small seeded random number generator (mulberry32): bitwise by nature. */
/* eslint-disable no-bitwise */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */
