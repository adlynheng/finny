import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

// test/jestSetup.js stands the stub in for these two; this file tests the real ones.
const { fetchBars, fetchQuotes } =
  jest.requireActual<typeof import('@/lib/marketData')>('@/lib/marketData');

const invoke = supabase.functions.invoke as jest.Mock;

afterEach(() => invoke.mockReset());

describe('fetchQuotes', () => {
  it('asks the quote function, leaving out symbols it has no quote for', async () => {
    invoke.mockResolvedValue({
      data: {
        quotes: {
          AAPL: { priceCents: 32_958, dayChangePercent: -2.6 },
          D05: null,
        },
      },
      error: null,
    });

    expect(await fetchQuotes(['AAPL', 'D05'])).toEqual({
      AAPL: { priceCents: 32_958, dayChangePercent: -2.6 },
    });
    expect(invoke).toHaveBeenCalledWith('market-data-quote', {
      body: { symbols: ['AAPL', 'D05'] },
    });
  });

  it('throws when the call fails', async () => {
    const error = new Error('FunctionsHttpError');
    invoke.mockResolvedValue({ data: null, error });
    await expect(fetchQuotes(['AAPL'])).rejects.toBe(error);
  });
});

describe('fetchBars', () => {
  it('asks the bars function for a symbol and range', async () => {
    const bars = [{ date: '2026-09-29', closeCents: 32_958 }];
    invoke.mockResolvedValue({ data: { bars }, error: null });

    expect(await fetchBars('AAPL', '3M')).toEqual(bars);
    expect(invoke).toHaveBeenCalledWith('market-data-bars', {
      body: { symbol: 'AAPL', range: '3M' },
    });
  });

  it('throws when the call fails', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('502') });
    await expect(fetchBars('AAPL', '1M')).rejects.toThrow('502');
  });
});
