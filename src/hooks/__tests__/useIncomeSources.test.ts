import { act, waitFor } from '@testing-library/react-native';

import {
  useDeleteIncomeSource,
  useIncomeSources,
  useUpsertIncomeSource,
} from '../useIncomeSources';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads income sources by name', async () => {
  stub.respond('income_source', {
    data: [{ id: 1, name: 'Salary' }],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useIncomeSources());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([{ id: 1, name: 'Salary' }]);
  expect(stub.chainsFor('income_source')).toEqual([
    [
      ['select', '*'],
      ['order', 'name'],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('income_source', { data: null, error });

  const { result } = await renderHookWithClient(() => useIncomeSources());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('inserts, updates and deletes, refreshing after each', async () => {
  const salary = {
    name: 'Salary',
    type: 'salary',
    base_income_cents: 650_000,
    frequency: 'monthly',
    start_date: '2026-01-25',
  };
  stub.respond('income_source', { data: { id: 1, ...salary }, error: null });
  const { result, client } = await renderHookWithClient(() => ({
    upsert: useUpsertIncomeSource(),
    remove: useDeleteIncomeSource(),
  }));
  client.setQueryData(queryKeys.incomeSources.list(), []);

  await act(async () => {
    await result.current.upsert.mutateAsync(salary);
  });
  expect(
    client.getQueryState(queryKeys.incomeSources.list())?.isInvalidated,
  ).toBe(true);

  await act(async () => {
    await result.current.upsert.mutateAsync({
      id: 1,
      base_income_cents: 700_000,
    });
    await result.current.remove.mutateAsync(1);
  });
  expect(stub.chainsFor('income_source')).toEqual([
    [['insert', salary], ['select'], ['single']],
    [
      ['update', { base_income_cents: 700_000 }],
      ['eq', 'id', 1],
      ['select'],
      ['single'],
    ],
    [['delete'], ['eq', 'id', 1]],
  ]);
  // Its payments are unlinked first, so the delete is not blocked.
  expect(stub.chainsFor('txn')).toEqual([
    [
      ['update', { income_id: null }],
      ['eq', 'income_id', 1],
    ],
  ]);
});
