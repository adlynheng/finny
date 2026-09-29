/**
 * Trading rows for tests, after the design's book, at the stub's prices and
 * its US$1 = S$1.3512. Accounts are overviewFixtures': 4 is Interactive
 * Brokers (S$62,450), 1 and 2 the banks.
 */

import type { Quote } from '@/lib/marketData';

export const RATE = 1.3512;

function instrument(
  id: number,
  symbol: string,
  name: string,
  currency: 'USD' | 'SGD',
  kind: string,
  sector: string,
) {
  return {
    id,
    symbol,
    name,
    currency,
    kind,
    sector,
    exchange: currency === 'SGD' ? 'SGX' : 'NASDAQ',
  };
}

export const instruments = {
  VWRA: instrument(
    1,
    'VWRA',
    'Vanguard FTSE All-World',
    'USD',
    'ETF',
    'Broad market',
  ),
  D05: instrument(2, 'D05', 'DBS Group', 'SGD', 'Stock', 'Financials'),
  NVDA: instrument(3, 'NVDA', 'NVIDIA', 'USD', 'Stock', 'Tech'),
  C38U: instrument(
    4,
    'C38U',
    'CapitaLand Integrated Commercial Trust',
    'SGD',
    'REIT',
    'Real estate',
  ),
  TSLA: instrument(5, 'TSLA', 'Tesla', 'USD', 'Stock', 'Consumer'),
  QQQ: instrument(6, 'QQQ', 'Invesco QQQ', 'USD', 'ETF', 'Tech'),
};

let lotId = 0;
const lot = (quantity: number, cents: number, date: string) => ({
  id: ++lotId,
  quantity,
  cost_per_unit_cents: cents,
  purchased_at: date,
});

function position(
  id: number,
  symbol: keyof typeof instruments,
  lots: ReturnType<typeof lot>[],
) {
  return {
    id,
    account_id: 4,
    instrument_id: instruments[symbol].id,
    instrument: instruments[symbol],
    lots,
  };
}

/** Five holdings, by symbol as usePositions sorts them. */
export const positions = [
  position(4, 'C38U', [
    lot(1200, 192, '2025-03-10'),
    lot(800, 206, '2026-02-17'),
  ]),
  position(2, 'D05', [
    lot(150, 3_450, '2024-02-06'),
    lot(50, 4_140, '2025-11-14'),
  ]),
  position(3, 'NVDA', [
    lot(15, 8_260, '2024-08-07'),
    lot(10, 11_890, '2025-04-22'),
  ]),
  position(5, 'TSLA', [
    lot(6, 24_800, '2025-02-11'),
    lot(4, 29_000, '2025-12-01'),
  ]),
  position(1, 'VWRA', [
    lot(50, 10_420, '2024-03-12'),
    lot(40, 12_150, '2024-10-03'),
    lot(15, 13_815, '2026-06-18'),
  ]),
];

export const quotes: Record<string, Quote> = {
  VWRA: { priceCents: 14_265, dayChangePercent: 0.42 },
  D05: { priceCents: 4_412, dayChangePercent: 0.34 },
  NVDA: { priceCents: 17_840, dayChangePercent: 2.14 },
  C38U: { priceCents: 212, dayChangePercent: 0.47 },
  TSLA: { priceCents: 24_130, dayChangePercent: -1.92 },
  QQQ: { priceCents: 51_230, dayChangePercent: 0.95 },
};

/** Five NVDA sold from the oldest lot. */
export const sales = [
  {
    id: 1,
    instrument_id: 3,
    account_id: 4,
    quantity: 5,
    price_per_unit_cents: 16_520,
    proceeds_cents: 82_600,
    cost_basis_cents: 41_300,
    realized_pnl_cents: 41_300,
    sold_at: '2026-07-14',
    created_at: '2026-07-14T00:00:00Z',
  },
];

/** NVDA is watched and held; QQQ only watched. */
export const watchlist = [
  {
    id: 1,
    instrument_id: 3,
    added_at: '2026-07-01T00:00:00Z',
    instrument: instruments.NVDA,
  },
  {
    id: 2,
    instrument_id: 6,
    added_at: '2026-08-01T00:00:00Z',
    instrument: instruments.QQQ,
  },
];

/** Queues the Trading page's reads on the Supabase stub. */
export function respondTrading(
  stub: {
    respond: (table: string, ...r: { data: unknown; error: null }[]) => void;
  },
  accounts: unknown[],
) {
  stub.respond('position', { data: positions, error: null });
  stub.respond('sale', { data: sales, error: null });
  stub.respond('watchlist_item', { data: watchlist, error: null });
  stub.respond('account', { data: accounts, error: null });
  stub.respond('instrument', { data: Object.values(instruments), error: null });
}
