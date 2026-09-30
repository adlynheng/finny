/**
 * Every US-listed stock and ETF, for the Add position form's symbol search.
 * Nasdaq publishes the list daily as two pipe-separated files, free and with
 * no key: Nasdaq's own listings, and every other exchange's (NYSE and the
 * rest). Alpaca has no search, so the app fetches both once a day and
 * searches them on the device.
 */

export const LISTING_URLS = [
  'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',
  'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt',
] as const;

export type Listing = { symbol: string; name: string; etf: boolean };

/** Plain tickers and class shares (BRK.B); not preferreds (ABR$D), units (AAC.U) or warrants. */
const TICKER = /^[A-Z]{1,5}(\.[A-C])?$/;
/** The share description after the company's name: ` - Common Stock`, ` Class A Ordinary Shares`. */
const DESCRIPTION =
  /\s+-?\s*(?:New\s+)?(?:Class [A-Z]\s+)?(?:Common|Ordinary|Capital Stock|American Depositary|Depositary)\b.*$/i;
/** A company's preferreds, notes, warrants, rights and units (an ETF may hold them, and stays). */
const NOT_A_SHARE =
  /\b(?:Preferred|Notes?|Debentures?|Warrants?|Rights?|Units?)\b/i;

/**
 * One file's listings. The header row names the columns (the symbol is
 * `Symbol` in one file, `ACT Symbol` in the other); the last row is the
 * file's creation time. Test issues are left out.
 */
export function parseListings(text: string): Listing[] {
  const [header = '', ...rows] = text.trim().split(/\r?\n/);
  const columns = header.split('|');
  const at = (name: string) => columns.indexOf(name);
  const symbolAt = Math.max(at('Symbol'), at('ACT Symbol'));
  const [nameAt, etfAt, testAt] = [
    at('Security Name'),
    at('ETF'),
    at('Test Issue'),
  ];
  return rows.flatMap(row => {
    const cells = row.split('|');
    const symbol = cells[symbolAt] ?? '';
    const etf = cells[etfAt] === 'Y';
    const raw = (cells[nameAt] ?? '').replace(/\s+/g, ' ').trim();
    const description = DESCRIPTION.exec(raw);
    const name = description ? raw.slice(0, description.index) : raw;
    // An ADR's description can mention units, so only a preferred's or a
    // note's description rules it out.
    const share =
      etf ||
      !(
        NOT_A_SHARE.test(name) ||
        /\b(?:Preferred|Notes?)\b/i.test(description?.[0] ?? '')
      );
    return TICKER.test(symbol) && cells[testAt] !== 'Y' && name !== '' && share
      ? [{ symbol, name, etf }]
      : [];
  });
}

/** Both files' listings, by symbol. Throws if either fails. */
export async function fetchUsListings(): Promise<Listing[]> {
  const texts = await Promise.all(
    LISTING_URLS.map(async url => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Listings: HTTP ${response.status}`);
      }
      return response.text();
    }),
  );
  return texts
    .flatMap(parseListings)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * Up to `limit` listings for what was typed: the exact symbol (or its class
 * shares: BRK finds BRK.A and BRK.B) first, then
 * symbols starting with it (shortest first), then names starting with it,
 * then names with a later word starting with it (an ETF named after the
 * company). Case is ignored.
 */
export function searchListings(
  listings: readonly Listing[],
  query: string,
  limit = 8,
): Listing[] {
  const q = query.trim().toUpperCase();
  if (q === '') {
    return [];
  }
  const rank = (l: Listing) => {
    const name = l.name.toUpperCase();
    return l.symbol === q || l.symbol.split('.')[0] === q
      ? 0
      : l.symbol.startsWith(q)
      ? 1
      : name.startsWith(q)
      ? 2
      : name.split(/[\s.,&()-]+/).some(word => word.startsWith(q))
      ? 3
      : null;
  };
  return listings
    .flatMap(l => {
      const r = rank(l);
      return r === null ? [] : [{ l, r }];
    })
    .sort(
      (a, b) =>
        a.r - b.r ||
        a.l.symbol.length - b.l.symbol.length ||
        a.l.symbol.localeCompare(b.l.symbol),
    )
    .slice(0, limit)
    .map(({ l }) => l);
}
