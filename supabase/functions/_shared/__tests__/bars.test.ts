import {
  alpacaBars,
  BARS_CACHE_MS,
  createBarsSource,
  parseBarsRequest,
  type FetchBars,
} from '../alpaca';

const reply = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

describe('parseBarsRequest', () => {
  it('a symbol, upper-cased, and one of the four ranges', () => {
    expect(parseBarsRequest({ symbol: ' aapl ', range: '3M' })).toEqual({
      symbol: 'AAPL',
      range: '3M',
    });
  });

  it('nothing else', () => {
    expect(parseBarsRequest(null)).toBeNull();
    expect(parseBarsRequest({ symbol: 'AAPL', range: '5Y' })).toBeNull();
    expect(parseBarsRequest({ symbol: '', range: '1M' })).toBeNull();
    expect(parseBarsRequest({ symbol: ['AAPL'], range: '1M' })).toBeNull();
  });
});

describe('alpacaBars', () => {
  it('asks for split-adjusted daily IEX bars from the start, dating each by its trading day', async () => {
    const fetcher = jest.fn(() =>
      reply({
        bars: [
          { t: '2026-09-28T04:00:00Z', c: 101.5 },
          { t: '2026-09-29T04:00:00Z', c: 99.123 },
        ],
        next_page_token: null,
      }),
    );
    expect(
      await alpacaBars('id', 'secret', fetcher as never)('AAPL', '2026-08-30'),
    ).toEqual([
      { date: '2026-09-28', closeCents: 10_150 },
      { date: '2026-09-29', closeCents: 9_912 },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://data.alpaca.markets/v2/stocks/AAPL/bars?timeframe=1Day&feed=iex&adjustment=all&limit=1000&start=2026-08-30',
      {
        headers: { 'APCA-API-KEY-ID': 'id', 'APCA-API-SECRET-KEY': 'secret' },
      },
    );
  });

  it('follows the pages', async () => {
    const fetcher = jest
      .fn()
      .mockImplementationOnce(() =>
        reply({
          bars: [{ t: '2026-09-28T04:00:00Z', c: 1 }],
          next_page_token: 'p2',
        }),
      )
      .mockImplementationOnce(() =>
        reply({ bars: [{ t: '2026-09-29T04:00:00Z', c: 2 }] }),
      );
    const bars = await alpacaBars('id', 's', fetcher)('AAPL', '2026-09-01');
    expect(bars.map(b => b.closeCents)).toEqual([100, 200]);
    expect(fetcher.mock.calls[1][0]).toContain('&page_token=p2');
  });

  it('no bars for a symbol with no history, and throws on a failed reply', async () => {
    expect(
      await alpacaBars('id', 's', (() => reply({ bars: null })) as never)(
        'NOPE',
        '2026-09-01',
      ),
    ).toEqual([]);
    const failing = () => Promise.resolve({ ok: false, status: 429 });
    await expect(
      alpacaBars('id', 's', failing as never)('AAPL', '2026-09-01'),
    ).rejects.toThrow('HTTP 429');
  });
});

describe('createBarsSource', () => {
  const NOW = Date.parse('2026-09-30T08:00:00Z');
  let time: number;
  let fetchBars: jest.MockedFunction<FetchBars>;
  let barsFor: ReturnType<typeof createBarsSource>;

  beforeEach(() => {
    time = NOW;
    fetchBars = jest.fn<ReturnType<FetchBars>, Parameters<FetchBars>>(
      async () => [{ date: '2026-09-29', closeCents: 100 }],
    );
    barsFor = createBarsSource(fetchBars, () => time);
  });

  it('starts each range its span of calendar days back', async () => {
    for (const range of ['1M', '3M', '6M', '1Y'] as const) {
      await barsFor('AAPL', range);
    }
    expect(fetchBars.mock.calls.map(c => c[1])).toEqual([
      '2026-08-31',
      '2026-07-01',
      '2026-04-01',
      '2025-09-30',
    ]);
  });

  it('holds each symbol and range for about 12 hours', async () => {
    await barsFor('AAPL', '1M');
    await barsFor('AAPL', '1M');
    expect(fetchBars).toHaveBeenCalledTimes(1);

    await barsFor('AAPL', '3M');
    await barsFor('MSFT', '1M');
    expect(fetchBars).toHaveBeenCalledTimes(3);

    time = NOW + BARS_CACHE_MS;
    await barsFor('AAPL', '1M');
    expect(fetchBars).toHaveBeenCalledTimes(4);
  });

  it('returns a new listing’s short history as it is', async () => {
    fetchBars.mockResolvedValueOnce([{ date: '2026-09-29', closeCents: 500 }]);
    expect(await barsFor('NEWCO', '1Y')).toEqual([
      { date: '2026-09-29', closeCents: 500 },
    ]);
  });

  it('no closes for a symbol that cannot be a US ticker, without asking', async () => {
    expect(await barsFor('D05', '1M')).toEqual([]);
    expect(fetchBars).not.toHaveBeenCalled();
  });

  it('does not cache a failure', async () => {
    fetchBars.mockRejectedValueOnce(new Error('HTTP 500'));
    await expect(barsFor('AAPL', '1M')).rejects.toThrow('HTTP 500');
    await barsFor('AAPL', '1M');
    expect(fetchBars).toHaveBeenCalledTimes(2);
  });
});
