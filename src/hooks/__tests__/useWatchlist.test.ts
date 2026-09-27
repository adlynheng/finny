import { act, waitFor } from '@testing-library/react-native';

import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '../useWatchlist';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads the watchlist with each instrument, in the order added', async () => {
  stub.respond('watchlist_item', {
    data: [{ id: 1, instrument: { symbol: 'TSLA' } }],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useWatchlist());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(stub.from).toHaveBeenCalledTimes(1);
  expect(stub.chainsFor('watchlist_item')).toEqual([
    [
      ['select', '*, instrument(*)'],
      ['order', 'added_at'],
      ['order', 'id'],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('watchlist_item', { data: null, error });

  const { result } = await renderHookWithClient(() => useWatchlist());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('adds a new symbol by creating its instrument first', async () => {
  stub.respond(
    'instrument',
    { data: null, error: null },
    { data: { id: 11 }, error: null },
  );
  const { result, client } = await renderHookWithClient(() =>
    useAddToWatchlist(),
  );
  client.setQueryData(queryKeys.watchlist.list(), []);
  client.setQueryData(queryKeys.instruments.list(), []);

  await act(async () => {
    await result.current.mutateAsync({ symbol: 'tsla', name: 'Tesla' });
  });

  expect(stub.chainsFor('instrument')).toEqual([
    [['select', 'id, position(id)'], ['eq', 'symbol', 'TSLA'], ['maybeSingle']],
    [
      ['insert', { symbol: 'TSLA', name: 'Tesla' }],
      ['select', 'id'],
      ['single'],
    ],
  ]);
  // Adding a symbol that is already watched is a no-op rather than a unique-key error.
  expect(stub.chainsFor('watchlist_item')).toEqual([
    [
      [
        'upsert',
        { instrument_id: 11 },
        { onConflict: 'instrument_id', ignoreDuplicates: true },
      ],
    ],
  ]);
  expect(client.getQueryState(queryKeys.watchlist.list())?.isInvalidated).toBe(
    true,
  );
  expect(
    client.getQueryState(queryKeys.instruments.list())?.isInvalidated,
  ).toBe(true);
});

it('adds a known symbol using its existing instrument', async () => {
  stub.respond('instrument', {
    data: { id: 10, position: [{ id: 20 }] },
    error: null,
  });
  const { result } = await renderHookWithClient(() => useAddToWatchlist());

  await act(async () => {
    await result.current.mutateAsync({ symbol: 'NVDA' });
  });

  expect(stub.chainsFor('instrument')).toHaveLength(1);
  expect(stub.chainsFor('watchlist_item')).toEqual([
    [
      [
        'upsert',
        { instrument_id: 10 },
        { onConflict: 'instrument_id', ignoreDuplicates: true },
      ],
    ],
  ]);
});

it('removes one watchlist entry by id, leaving its instrument', async () => {
  const { result, client } = await renderHookWithClient(() =>
    useRemoveFromWatchlist(),
  );
  client.setQueryData(queryKeys.watchlist.list(), []);

  await act(async () => {
    await result.current.mutateAsync(4);
  });

  expect(stub.chainsFor('watchlist_item')).toEqual([
    [['delete'], ['eq', 'id', 4]],
  ]);
  expect(stub.chainsFor('instrument')).toEqual([]);
  expect(client.getQueryState(queryKeys.watchlist.list())?.isInvalidated).toBe(
    true,
  );
});
