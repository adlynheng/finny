import {
  alpacaSnapshots,
  createQuoteSource,
  MAX_SYMBOLS,
  parseSymbols,
  QUOTE_CACHE_MS,
  toQuote,
  type FetchSnapshots,
} from '../alpaca';

const snap = (price: number, previous: number) => ({
  latestTrade: { p: price },
  dailyBar: { c: price },
  prevDailyBar: { c: previous },
});

describe('toQuote', () => {
  it('prices in cents, and the change against yesterday’s close', () => {
    expect(toQuote(snap(110.5, 100))).toEqual({
      priceCents: 11_050,
      dayChangePercent: 10.5,
    });
  });

  it('falls back to today’s close without a trade, and no change without yesterday', () => {
    expect(toQuote({ dailyBar: { c: 50 } })).toEqual({
      priceCents: 5_000,
      dayChangePercent: 0,
    });
  });

  it('no quote without a price', () => {
    expect(toQuote(undefined)).toBeNull();
    expect(toQuote({ latestTrade: null, dailyBar: null })).toBeNull();
    expect(toQuote({ latestTrade: { p: 0 } })).toBeNull();
  });
});

describe('parseSymbols', () => {
  it('upper-cases, trims and deduplicates', () => {
    expect(
      parseSymbols({ symbols: ['aapl', ' MSFT ', 'AAPL', '', 3] }),
    ).toEqual(['AAPL', 'MSFT']);
  });

  it('none from a body that is not a list', () => {
    expect(parseSymbols(null)).toEqual([]);
    expect(parseSymbols({ symbols: 'AAPL' })).toEqual([]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: MAX_SYMBOLS + 5 }, (_, i) => `S${i}`);
    expect(parseSymbols({ symbols: many })).toHaveLength(MAX_SYMBOLS);
  });
});

describe('alpacaSnapshots', () => {
  it('asks the IEX feed for every symbol at once, with the key in headers', async () => {
    const fetcher = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    );
    await alpacaSnapshots('id', 'secret', fetcher as never)(['AAPL', 'BRK.B']);
    expect(fetcher).toHaveBeenCalledWith(
      'https://data.alpaca.markets/v2/stocks/snapshots?feed=iex&symbols=AAPL,BRK.B',
      {
        headers: { 'APCA-API-KEY-ID': 'id', 'APCA-API-SECRET-KEY': 'secret' },
      },
    );
  });

  it('throws on a failed reply', async () => {
    const fetcher = () => Promise.resolve({ ok: false, status: 403 });
    await expect(
      alpacaSnapshots('id', 'secret', fetcher as never)(['AAPL']),
    ).rejects.toThrow('HTTP 403');
  });
});

describe('createQuoteSource', () => {
  let time: number;
  let fetchSnapshots: jest.MockedFunction<FetchSnapshots>;
  let quotesFor: ReturnType<typeof createQuoteSource>;

  beforeEach(() => {
    time = 0;
    fetchSnapshots = jest.fn(async symbols =>
      Object.fromEntries(
        symbols.filter(s => s !== 'NOPE').map(s => [s, snap(10, 10)]),
      ),
    );
    quotesFor = createQuoteSource(fetchSnapshots, () => time);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const quote = { priceCents: 1_000, dayChangePercent: 0 };

  it('marks a symbol Alpaca does not know, and one it cannot hold, alone', async () => {
    expect(await quotesFor(['AAPL', 'NOPE', 'D05', 'C38U'])).toEqual({
      AAPL: quote,
      NOPE: null,
      D05: null,
      C38U: null,
    });
    // D05 and C38U are SGX codes: sending them would fail the whole call.
    expect(fetchSnapshots).toHaveBeenCalledWith(['AAPL', 'NOPE']);
  });

  it('answers a second immediate call from its cache', async () => {
    await quotesFor(['AAPL', 'NOPE']);
    expect(await quotesFor(['AAPL', 'NOPE'])).toEqual({
      AAPL: quote,
      NOPE: null,
    });
    expect(fetchSnapshots).toHaveBeenCalledTimes(1);
  });

  it('asks only for what the cache lacks, and again once it has aged', async () => {
    await quotesFor(['AAPL']);
    await quotesFor(['AAPL', 'MSFT']);
    expect(fetchSnapshots).toHaveBeenLastCalledWith(['MSFT']);

    time = QUOTE_CACHE_MS;
    await quotesFor(['AAPL']);
    expect(fetchSnapshots).toHaveBeenLastCalledWith(['AAPL']);
    expect(fetchSnapshots).toHaveBeenCalledTimes(3);
  });

  it('a failed call leaves its symbols null and uncached; cached ones still answer', async () => {
    await quotesFor(['AAPL']);
    fetchSnapshots.mockRejectedValueOnce(new Error('HTTP 500'));
    expect(await quotesFor(['AAPL', 'MSFT'])).toEqual({
      AAPL: quote,
      MSFT: null,
    });

    expect(await quotesFor(['MSFT'])).toEqual({ MSFT: quote });
    expect(fetchSnapshots).toHaveBeenCalledTimes(3);
  });
});
