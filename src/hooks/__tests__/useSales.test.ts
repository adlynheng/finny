import { act, waitFor } from '@testing-library/react-native';

import { useRecordSale, useSales } from '../useSales';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads sales, newest first', async () => {
  stub.respond('sale', { data: [{ id: 2 }, { id: 1 }], error: null });

  const { result } = await renderHookWithClient(() => useSales());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([{ id: 2 }, { id: 1 }]);
  expect(stub.chainsFor('sale')).toEqual([
    [
      ['select', '*'],
      ['order', 'sold_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('sale', { data: null, error });

  const { result } = await renderHookWithClient(() => useSales());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

describe('recording a sale', () => {
  // 25 bought first, then 15: the FIFO consumer draws on the first lot first.
  const lots = [
    {
      id: 1,
      quantity: 25,
      cost_per_unit_cents: 8_260,
      purchased_at: '2024-08-07',
    },
    {
      id: 2,
      quantity: 15,
      cost_per_unit_cents: 11_890,
      purchased_at: '2025-04-22',
    },
  ];
  const sale = {
    instrumentId: 3,
    accountId: 6,
    lots,
    pricePerUnitCents: 17_840,
    soldAt: '2026-09-24',
  };

  async function record(quantity: number) {
    stub.respond('rpc:record_sale', { data: 9, error: null });
    const { result, client } = await renderHookWithClient(() =>
      useRecordSale(),
    );
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await act(() => result.current.mutateAsync({ ...sale, quantity }));
    return { invalidate };
  }

  const sent = () =>
    (stub.chainsFor('rpc:record_sale').at(-1)![0]![1] as { p_lots: unknown })
      .p_lots;

  it('sends a partial sale as one lot reduced', async () => {
    await record(10);
    expect(stub.chainsFor('rpc:record_sale')[0]).toEqual([
      [
        'rpc',
        {
          p_instrument_id: 3,
          p_account_id: 6,
          p_quantity: 10,
          p_price_per_unit_cents: 17_840,
          p_sold_at: '2026-09-24',
          p_lots: [{ id: 1, quantity: 25, remaining: 15 }],
        },
      ],
    ]);
  });

  it('spans lots oldest first', async () => {
    await record(30);
    expect(sent()).toEqual([
      { id: 1, quantity: 25, remaining: 0 },
      { id: 2, quantity: 15, remaining: 10 },
    ]);
  });

  it('empties every lot on a full close', async () => {
    await record(40);
    expect(sent()).toEqual([
      { id: 1, quantity: 25, remaining: 0 },
      { id: 2, quantity: 15, remaining: 0 },
    ]);
  });

  it('refuses to sell more than is held, before writing anything', async () => {
    const { result } = await renderHookWithClient(() => useRecordSale());
    await expect(
      act(() => result.current.mutateAsync({ ...sale, quantity: 41 })),
    ).rejects.toThrow('only 40 held');
    expect(stub.rpc).not.toHaveBeenCalled();
  });

  it('refreshes sales and positions', async () => {
    const { invalidate } = await record(10);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.sales.all });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.positions.all,
    });
  });
});
