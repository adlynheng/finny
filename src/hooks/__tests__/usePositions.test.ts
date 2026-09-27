import { act, waitFor } from '@testing-library/react-native';

import { useAddPosition, usePositions } from '../usePositions';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

describe('reading', () => {
  it('reads every position with its instrument and lots in one query', async () => {
    stub.respond('position', {
      data: [
        { id: 2, instrument: { symbol: 'NVDA' }, lots: [{ id: 5 }, { id: 6 }] },
        { id: 1, instrument: { symbol: 'AAPL' }, lots: [{ id: 3 }] },
      ],
      error: null,
    });

    const { result } = await renderHookWithClient(() => usePositions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(stub.from).toHaveBeenCalledTimes(1);
    expect(stub.chainsFor('position')).toEqual([
      [
        ['select', '*, instrument(*), lots:lot(*)'],
        // Oldest lot first: the order FIFO sells them in and the expanded row lists them.
        ['order', 'purchased_at', { referencedTable: 'lots' }],
        ['order', 'id', { referencedTable: 'lots' }],
      ],
    ]);
    expect(result.current.data?.map(p => p.instrument.symbol)).toEqual([
      'AAPL',
      'NVDA',
    ]);
  });

  it('surfaces a failed read as an error', async () => {
    const error = { message: 'network down' };
    stub.respond('position', { data: null, error });

    const { result } = await renderHookWithClient(() => usePositions());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});

describe('adding', () => {
  const nvda = {
    symbol: 'nvda ',
    name: 'NVIDIA',
    exchange: 'NASDAQ',
    currency: 'USD',
    kind: 'Stock',
    sector: 'Semiconductors',
  };
  const lot = {
    quantity: 10,
    costPerUnitCents: 12_050,
    purchasedAt: '2026-09-24',
  };
  const lotRow = {
    quantity: 10,
    cost_per_unit_cents: 12_050,
    purchased_at: '2026-09-24',
  };

  async function addPosition() {
    stub.respond('lot', {
      data: { id: 30, position_id: 20, ...lotRow },
      error: null,
    });
    const { result, client } = await renderHookWithClient(() =>
      useAddPosition(),
    );
    client.setQueryData(queryKeys.positions.list(), []);
    client.setQueryData(queryKeys.instruments.list(), []);
    client.setQueryData(queryKeys.watchlist.list(), []);
    await act(async () => {
      await result.current.mutateAsync({ instrument: nvda, ...lot });
    });
    return client;
  }

  it('creates the instrument, position and lot for a new symbol', async () => {
    stub.respond(
      'instrument',
      { data: null, error: null },
      { data: { id: 10, symbol: 'NVDA' }, error: null },
    );
    stub.respond('position', { data: { id: 20 }, error: null });

    await addPosition();

    expect(stub.chainsFor('instrument')).toEqual([
      [
        ['select', 'id, position(id)'],
        ['eq', 'symbol', 'NVDA'],
        ['maybeSingle'],
      ],
      [['insert', { ...nvda, symbol: 'NVDA' }], ['select', 'id'], ['single']],
    ]);
    expect(stub.chainsFor('position')).toEqual([
      [['insert', { instrument_id: 10 }], ['select', 'id'], ['single']],
    ]);
    expect(stub.chainsFor('lot')).toEqual([
      [['insert', { position_id: 20, ...lotRow }], ['select'], ['single']],
    ]);
  });

  it('reuses a known instrument that is not held, without changing it', async () => {
    stub.respond('instrument', { data: { id: 10, position: [] }, error: null });
    stub.respond('position', { data: { id: 20 }, error: null });

    await addPosition();

    expect(stub.chainsFor('instrument')).toEqual([
      [
        ['select', 'id, position(id)'],
        ['eq', 'symbol', 'NVDA'],
        ['maybeSingle'],
      ],
    ]);
    expect(stub.chainsFor('position')).toEqual([
      [['insert', { instrument_id: 10 }], ['select', 'id'], ['single']],
    ]);
    expect(stub.chainsFor('lot')).toEqual([
      [['insert', { position_id: 20, ...lotRow }], ['select'], ['single']],
    ]);
  });

  it('only appends a lot to a symbol already held', async () => {
    stub.respond('instrument', {
      data: { id: 10, position: [{ id: 20 }] },
      error: null,
    });

    await addPosition();

    expect(stub.chainsFor('position')).toEqual([]);
    expect(stub.chainsFor('lot')).toEqual([
      [['insert', { position_id: 20, ...lotRow }], ['select'], ['single']],
    ]);
  });

  it('refreshes positions and instruments, but not the watchlist', async () => {
    stub.respond('instrument', {
      data: { id: 10, position: [{ id: 20 }] },
      error: null,
    });

    const client = await addPosition();

    expect(
      client.getQueryState(queryKeys.positions.list())?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(queryKeys.instruments.list())?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(queryKeys.watchlist.list())?.isInvalidated,
    ).toBe(false);
  });

  it.each([
    [{ quantity: 0 }, 'The quantity must be more than zero.'],
    [{ quantity: -1 }, 'The quantity must be more than zero.'],
    [
      { costPerUnitCents: 0 },
      'The price must be a positive whole number of cents.',
    ],
    [
      { costPerUnitCents: 12.5 },
      'The price must be a positive whole number of cents.',
    ],
  ])('refuses %p without writing', async (change, message) => {
    const { result } = await renderHookWithClient(() => useAddPosition());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ instrument: nvda, ...lot, ...change }),
      ).rejects.toThrow(message);
    });
    expect(stub.from).not.toHaveBeenCalled();
  });

  it('refuses a blank symbol without writing', async () => {
    const { result } = await renderHookWithClient(() => useAddPosition());

    await act(async () => {
      await expect(
        result.current.mutateAsync({ instrument: { symbol: '  ' }, ...lot }),
      ).rejects.toThrow('A symbol is required.');
    });
    expect(stub.from).not.toHaveBeenCalled();
  });
});
