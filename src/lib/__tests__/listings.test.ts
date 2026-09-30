import {
  LISTING_URLS,
  fetchUsListings,
  parseListings,
  searchListings,
  type Listing,
} from '../listings';

const fetchMock = global.fetch as jest.Mock;
afterEach(() =>
  fetchMock
    .mockReset()
    .mockImplementation(() => Promise.reject(new Error('No network'))),
);

// Rows as Nasdaq writes them, trimmed to what matters.
const NASDAQ = [
  'Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares',
  'AAPL|Apple Inc. - Common Stock|Q|N|N|40|N|N',
  'GOOG|Alphabet Inc. - Class C Capital Stock|Q|N|N|40|N|N',
  'GOOGM|Alphabet Inc. - Depositary Shares representing a 1/20th Interest in a Share of Series A Mandatory Convertible Preferred Stock|Q|N|N|100|N|N',
  'ABCDW|ABCD Acquisition Corp - Warrant|G|N|N|100|N|N',
  'QQQ|Invesco QQQ Trust, Series 1|G|N|N|40|Y|N',
  'ZVZZT|NASDAQ TEST STOCK|G|Y|N|100|N|N',
  'File Creation Time: 0930202611:01|||||||',
].join('\n');
const OTHER = [
  'ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol',
  'BRK.B|Berkshire Hathaway Inc. New Common Stock|N|BRK.B|N|40|N|BRK.B',
  'ABR$D|Arbor Realty Trust 6.375% Series D Preferred|N|ABR-D|N|100|N|ABR-D',
  'KOF|Coca Cola Femsa S.A.B. de C.V.  American Depositary Shares, each representing 10 Units|N|KOF|N|100|N|KOF',
  'PFF|iShares Preferred and Income Securities ETF|P|PFF|Y|100|N|PFF',
  'File Creation Time: 0930202611:01|||||||',
].join('\n');

describe('parseListings', () => {
  it('reads each file’s columns, names without their share description', () => {
    expect(parseListings(NASDAQ)).toEqual([
      { symbol: 'AAPL', name: 'Apple Inc.', etf: false },
      { symbol: 'GOOG', name: 'Alphabet Inc.', etf: false },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust, Series 1', etf: true },
    ]);
    expect(parseListings(OTHER)).toEqual([
      { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', etf: false },
      { symbol: 'KOF', name: 'Coca Cola Femsa S.A.B. de C.V.', etf: false },
      {
        symbol: 'PFF',
        name: 'iShares Preferred and Income Securities ETF',
        etf: true,
      },
    ]);
  });
});

describe('searchListings', () => {
  const l = (symbol: string, name: string, etf = false): Listing => ({
    symbol,
    name,
    etf,
  });
  const all = [
    l('AAPB', 'GraniteShares 2x Long AAPL Daily ETF', true),
    l('AAPL', 'Apple Inc.'),
    l('APLE', 'Apple Hospitality REIT, Inc.'),
    l('AAPX', 'T-Rex 2X Long Apple Daily Target ETF', true),
    l('BRK.A', 'Berkshire Hathaway Inc.'),
    l('BRK.B', 'Berkshire Hathaway Inc.'),
    l('BRKR', 'Bruker Corporation'),
  ];
  const symbols = (q: string, limit?: number) =>
    searchListings(all, q, limit).map(x => x.symbol);

  it('puts the exact symbol, then symbols starting with it, first', () => {
    // AAPB's name mentions AAPL, so it follows.
    expect(symbols('aapl')).toEqual(['AAPL', 'AAPB']);
    expect(symbols('AAP')).toEqual(['AAPB', 'AAPL', 'AAPX']);
  });

  it('finds class shares by their root', () => {
    expect(symbols('BRK')).toEqual(['BRK.A', 'BRK.B', 'BRKR']);
  });

  it('matches names, those starting with it before later words', () => {
    expect(symbols('apple')).toEqual(['AAPL', 'APLE', 'AAPX']);
  });

  it('caps the matches, and finds nothing for nothing', () => {
    expect(symbols('a', 2)).toHaveLength(2);
    expect(symbols('  ')).toEqual([]);
  });
});

describe('fetchUsListings', () => {
  it('joins both files by symbol', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(url === LISTING_URLS[0] ? NASDAQ : OTHER),
      }),
    );
    const listings = await fetchUsListings();
    expect(listings.map(x => x.symbol)).toEqual([
      'AAPL',
      'BRK.B',
      'GOOG',
      'KOF',
      'PFF',
      'QQQ',
    ]);
  });

  it('throws when either file fails', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve({
        ok: url === LISTING_URLS[0],
        status: 503,
        text: () => Promise.resolve(NASDAQ),
      }),
    );
    await expect(fetchUsListings()).rejects.toThrow('HTTP 503');
  });
});
