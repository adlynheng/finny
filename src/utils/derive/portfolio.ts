/**
 * The Trading page's book: each holding valued at its latest price and put in
 * S$, the whole portfolio's P&L day by day, and its split by instrument type
 * and by industry. Everything the page shows in S$ is summed here, so the
 * hero, the tables and the health card agree.
 *
 * Prices and lot costs are in the instrument's own currency (US$ cents for a
 * US listing, S$ cents for SGX); `fx` turns one unit of it into S$.
 */

import type { Bar, Quote } from '@/lib/marketData';
import {
  INSTRUMENT_KINDS,
  type InstrumentKind,
  type InstrumentRow,
} from '@/types/domain';
import type { Currency } from '@/utils/format/money';
import {
  averageCostCents,
  costBasisCents,
  openQuantity,
  type Lot,
} from './positions';

/** A position as usePositions reads it. */
export type PositionInput = {
  id: number;
  account_id: number | null;
  instrument: InstrumentRow;
  lots: Lot[];
};

export type Holding = {
  positionId: number;
  accountId: number | null;
  instrument: InstrumentRow;
  symbol: string;
  currency: Currency;
  /** Oldest first. */
  lots: Lot[];
  quantity: number;
  /** In the instrument's currency. */
  avgCostCents: number;
  /** In the instrument's currency; null until the symbol has a quote. */
  priceCents: number | null;
  dayChangePercent: number | null;
  /** S$ per unit of the instrument's currency. */
  fx: number;
  /** Market value in S$ cents: at cost until there is a price. */
  valueCents: number;
  /** Cost basis in S$ cents. */
  costCents: number;
  /** Unrealised P&L in S$ cents. */
  pnlCents: number;
  /** On cost, in percentage points. */
  pnlPercent: number;
  /** Share of the portfolio's market value, 0–1. */
  weight: number;
};

export const currencyOf = (instrument: InstrumentRow): Currency =>
  instrument.currency === 'SGD' ? 'SGD' : 'USD';

/** S$ per unit of `currency`. */
export const fxFor = (currency: Currency, usdSgdRate: number) =>
  currency === 'SGD' ? 1 : usdSgdRate;

/** Each open position valued, in the order given. Positions with no lots are left out. */
export function holdingsOf(
  positions: readonly PositionInput[],
  quotes: Record<string, Quote>,
  usdSgdRate: number,
): Holding[] {
  const open = positions.filter(p => openQuantity(p.lots) > 0);
  const rows = open.map(p => {
    const symbol = p.instrument.symbol;
    const currency = currencyOf(p.instrument);
    const fx = fxFor(currency, usdSgdRate);
    const quantity = openQuantity(p.lots);
    const quote = quotes[symbol];
    const costCents = Math.round(costBasisCents(p.lots) * fx);
    const valueCents = quote
      ? Math.round(quantity * quote.priceCents * fx)
      : costCents;
    return {
      positionId: p.id,
      accountId: p.account_id,
      instrument: p.instrument,
      symbol,
      currency,
      lots: [...p.lots].sort(
        (a, b) => a.purchased_at.localeCompare(b.purchased_at) || a.id - b.id,
      ),
      quantity,
      avgCostCents: averageCostCents(p.lots)!,
      priceCents: quote?.priceCents ?? null,
      dayChangePercent: quote?.dayChangePercent ?? null,
      fx,
      valueCents,
      costCents,
      pnlCents: valueCents - costCents,
      pnlPercent: ((valueCents - costCents) / costCents) * 100,
      weight: 0,
    };
  });
  const total = rows.reduce((sum, h) => sum + h.valueCents, 0);
  return rows.map(h => ({
    ...h,
    weight: total > 0 ? h.valueCents / total : 0,
  }));
}

export type Totals = {
  valueCents: number;
  costCents: number;
  pnlCents: number;
  /** On cost, in percentage points; 0 with nothing held. */
  pnlPercent: number;
};

export function totalsOf(holdings: readonly Holding[]): Totals {
  const valueCents = holdings.reduce((sum, h) => sum + h.valueCents, 0);
  const costCents = holdings.reduce((sum, h) => sum + h.costCents, 0);
  const pnlCents = valueCents - costCents;
  return {
    valueCents,
    costCents,
    pnlCents,
    pnlPercent: costCents > 0 ? (pnlCents / costCents) * 100 : 0,
  };
}

/**
 * The holdings' unrealised P&L on each day, in S$ cents: each holding's
 * market value at that day's close less its cost basis (so the last day
 * matches the holdings' own P&L), summed. Days are every date any holding
 * has a close for; a holding with no close on a day counts from its last one,
 * and before its first counts nothing.
 */
export function pnlSeries(
  holdings: readonly Holding[],
  bars: Record<string, readonly Bar[]>,
): { dates: string[]; values: number[] } {
  const dates = [
    ...new Set(holdings.flatMap(h => (bars[h.symbol] ?? []).map(b => b.date))),
  ].sort();
  const values = dates.map(() => 0);
  for (const h of holdings) {
    const closes = bars[h.symbol] ?? [];
    let k = 0;
    let close: number | null = null;
    dates.forEach((date, i) => {
      while (k < closes.length && closes[k]!.date <= date) {
        close = closes[k]!.closeCents;
        k++;
      }
      if (close !== null) {
        values[i] = values[i]! + close * h.quantity * h.fx - h.costCents;
      }
    });
  }
  return { dates, values: values.map(Math.round) };
}

/**
 * The capital the holdings' open lots put in, as it stood on each of `dates`:
 * the S$ cost of every lot bought on or before that day, so it steps up on
 * each purchase date. Lots sold since are no longer open, so it counts only
 * what is still held (as the design's "Actual lots" pattern does).
 */
export function capitalSeries(
  holdings: readonly Holding[],
  dates: readonly string[],
): number[] {
  const buys = holdings
    .flatMap(h =>
      h.lots.map(l => ({
        date: l.purchased_at,
        cents: l.quantity * l.cost_per_unit_cents * h.fx,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  let k = 0;
  let total = 0;
  return dates.map(date => {
    while (k < buys.length && buys[k]!.date <= date) {
      total += buys[k]!.cents;
      k++;
    }
    return Math.round(total);
  });
}

export type TypeSlice = {
  kind: InstrumentKind;
  /** How many holdings are of this type. */
  count: number;
  /** Market value in S$ cents. */
  cents: number;
  /** Share of the portfolio, 0–1. */
  share: number;
};

/** Stocks, ETFs and REITs, in that order; types nothing is held in are left out. */
export function byType(holdings: readonly Holding[]): TypeSlice[] {
  const total = holdings.reduce((sum, h) => sum + h.valueCents, 0);
  return INSTRUMENT_KINDS.map(kind => {
    const of = holdings.filter(h => h.instrument.kind === kind);
    const cents = of.reduce((sum, h) => sum + h.valueCents, 0);
    return {
      kind,
      count: of.length,
      cents,
      share: total > 0 ? cents / total : 0,
    };
  }).filter(t => t.cents > 0);
}

export type IndustrySlice = {
  name: string;
  /** Its holdings' symbols, in the order given. */
  symbols: string[];
  cents: number;
  share: number;
  /** Against the largest industry, 0–1: the bar's length. */
  ofLargest: number;
};

/** Industries by market value, largest first. A holding with no industry counts as Other. */
export function byIndustry(holdings: readonly Holding[]): IndustrySlice[] {
  const total = holdings.reduce((sum, h) => sum + h.valueCents, 0);
  const groups = new Map<string, { symbols: string[]; cents: number }>();
  for (const h of holdings) {
    const name = h.instrument.sector ?? 'Other';
    const group = groups.get(name) ?? { symbols: [], cents: 0 };
    group.symbols.push(h.symbol);
    group.cents += h.valueCents;
    groups.set(name, group);
  }
  const sorted = [...groups].sort((a, b) => b[1].cents - a[1].cents);
  const largest = sorted[0]?.[1].cents ?? 0;
  return sorted.map(([name, g]) => ({
    name,
    symbols: g.symbols,
    cents: g.cents,
    share: total > 0 ? g.cents / total : 0,
    ofLargest: largest > 0 ? g.cents / largest : 0,
  }));
}
