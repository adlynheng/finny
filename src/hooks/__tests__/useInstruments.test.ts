import { act, waitFor } from '@testing-library/react-native';

import { useInstruments, useUpsertInstrument } from '../useInstruments';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads instruments by symbol', async () => {
  stub.respond('instrument', {
    data: [{ id: 1, symbol: 'AAPL' }],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useInstruments());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([{ id: 1, symbol: 'AAPL' }]);
  expect(stub.chainsFor('instrument')).toEqual([
    [
      ['select', '*'],
      ['order', 'symbol'],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('instrument', { data: null, error });

  const { result } = await renderHookWithClient(() => useInstruments());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('upserts keyed on the symbol, so a known symbol reuses its row', async () => {
  stub.respond('instrument', { data: { id: 1, symbol: 'D05' }, error: null });
  const { result, client } = await renderHookWithClient(() =>
    useUpsertInstrument(),
  );
  client.setQueryData(queryKeys.instruments.list(), []);
  client.setQueryData(queryKeys.positions.list(), []);
  client.setQueryData(queryKeys.watchlist.list(), []);

  await act(async () => {
    await result.current.mutateAsync({
      symbol: ' d05',
      name: 'DBS Group',
      currency: 'SGD',
    });
  });

  expect(stub.chainsFor('instrument')).toEqual([
    [
      [
        'upsert',
        { symbol: 'D05', name: 'DBS Group', currency: 'SGD' },
        { onConflict: 'symbol' },
      ],
      ['select'],
      ['single'],
    ],
  ]);
  // Positions and the watchlist show instrument details, so they refresh too.
  expect(
    client.getQueryState(queryKeys.instruments.list())?.isInvalidated,
  ).toBe(true);
  expect(client.getQueryState(queryKeys.positions.list())?.isInvalidated).toBe(
    true,
  );
  expect(client.getQueryState(queryKeys.watchlist.list())?.isInvalidated).toBe(
    true,
  );
});
