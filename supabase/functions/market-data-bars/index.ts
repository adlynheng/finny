/**
 * POST { symbol, range: '1M' | '3M' | '6M' | '1Y' } → { bars: [{ date, closeCents }] }, oldest
 * first: the symbol's daily closes over the range, for the P&L chart and the watchlist
 * sparklines.
 *
 * Proxies Alpaca's daily bars (free IEX feed) so the key stays a Supabase secret. Cached for
 * about 12 hours by symbol and range, for as long as this worker lives. A symbol Alpaca cannot
 * hold, such as an SGX listing, has no closes; a new listing has the few it has.
 */

import {
  alpacaBars,
  createBarsSource,
  parseBarsRequest,
} from '../_shared/alpaca.ts';

const keyId = Deno.env.get('ALPACA_KEY_ID');
const secret = Deno.env.get('ALPACA_SECRET_KEY');
const barsFor =
  keyId && secret ? createBarsSource(alpacaBars(keyId, secret)) : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async request => {
  if (request.method !== 'POST') {
    return json({ error: 'POST a symbol and range' }, 405);
  }
  if (!barsFor) {
    return json({ error: 'Alpaca key not configured' }, 500);
  }
  const asked = parseBarsRequest(await request.json().catch(() => null));
  if (!asked) {
    return json(
      { error: 'Expected { symbol, range: 1M | 3M | 6M | 1Y }' },
      400,
    );
  }
  try {
    return json({ bars: await barsFor(asked.symbol, asked.range) });
  } catch (error) {
    console.error(error);
    return json({ error: 'Alpaca bars unavailable' }, 502);
  }
});
