/**
 * POST { symbols: string[] } → { quotes: { [symbol]: { priceCents, dayChangePercent } | null } }.
 *
 * Proxies Alpaca's stock snapshots (free IEX feed) so the Alpaca key and secret stay Supabase
 * secrets and never ship in the app. A symbol Alpaca has no quote for, such as an SGX listing,
 * comes back null on its own; the rest still answer. The cache lives as long as this worker.
 */

import {
  alpacaSnapshots,
  createQuoteSource,
  parseSymbols,
} from '../_shared/alpaca.ts';

const keyId = Deno.env.get('ALPACA_KEY_ID');
const secret = Deno.env.get('ALPACA_SECRET_KEY');
const quotesFor =
  keyId && secret ? createQuoteSource(alpacaSnapshots(keyId, secret)) : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async request => {
  if (request.method !== 'POST') {
    return json({ error: 'POST a list of symbols' }, 405);
  }
  if (!quotesFor) {
    return json({ error: 'Alpaca key not configured' }, 500);
  }
  const symbols = parseSymbols(await request.json().catch(() => null));
  return json({ quotes: await quotesFor(symbols) });
});
