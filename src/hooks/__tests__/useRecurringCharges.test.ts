import { act, waitFor } from '@testing-library/react-native';

import {
  useDeleteRecurringCharge,
  useRecurringCharges,
  useUpsertRecurringCharge,
} from '../useRecurringCharges';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads recurring charges by name', async () => {
  stub.respond('recurring_charge', {
    data: [{ id: 1, name: 'Netflix' }],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useRecurringCharges());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([{ id: 1, name: 'Netflix' }]);
  expect(stub.chainsFor('recurring_charge')).toEqual([
    [
      ['select', '*'],
      ['order', 'name'],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('recurring_charge', { data: null, error });

  const { result } = await renderHookWithClient(() => useRecurringCharges());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('inserts, updates and deletes, refreshing after each', async () => {
  const netflix = {
    name: 'Netflix',
    amount_cents: 1_998,
    frequency: 'monthly',
    start_date: '2026-01-05',
  };
  stub.respond('recurring_charge', {
    data: { id: 1, ...netflix },
    error: null,
  });
  const { result, client } = await renderHookWithClient(() => ({
    upsert: useUpsertRecurringCharge(),
    remove: useDeleteRecurringCharge(),
  }));
  client.setQueryData(queryKeys.recurringCharges.list(), []);

  await act(async () => {
    await result.current.upsert.mutateAsync(netflix);
  });
  expect(
    client.getQueryState(queryKeys.recurringCharges.list())?.isInvalidated,
  ).toBe(true);

  await act(async () => {
    await result.current.upsert.mutateAsync({ id: 1, is_active: false });
    await result.current.remove.mutateAsync(1);
  });
  expect(stub.chainsFor('recurring_charge')).toEqual([
    [['insert', netflix], ['select'], ['single']],
    [['update', { is_active: false }], ['eq', 'id', 1], ['select'], ['single']],
    [['delete'], ['eq', 'id', 1]],
  ]);
});
