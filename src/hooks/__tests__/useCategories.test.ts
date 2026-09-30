import { act, waitFor } from '@testing-library/react-native';

import {
  useCategories,
  useDeleteCategory,
  useUpsertCategory,
} from '../useCategories';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads only the asked-for kind, by name', async () => {
  stub.respond('category', {
    data: [{ id: 1, kind: 'expense', name: 'Food' }],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useCategories('expense'));

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(stub.chainsFor('category')).toEqual([
    [
      ['select', '*'],
      ['eq', 'kind', 'expense'],
      ['order', 'name'],
    ],
  ]);
});

it('reads both kinds when no kind is given', async () => {
  stub.respond('category', { data: [], error: null });

  const { result } = await renderHookWithClient(() => useCategories());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(stub.chainsFor('category')).toEqual([
    [
      ['select', '*'],
      ['order', 'name'],
    ],
  ]);
});

it('keeps expense and deposit categories in separate cache entries', async () => {
  stub.respond(
    'category',
    { data: [{ id: 1, kind: 'expense', name: 'Food' }], error: null },
    { data: [{ id: 2, kind: 'deposit', name: 'Salary' }], error: null },
  );

  const { result } = await renderHookWithClient(() => ({
    expense: useCategories('expense'),
    deposit: useCategories('deposit'),
  }));

  await waitFor(() => expect(result.current.deposit.isSuccess).toBe(true));
  expect(result.current.expense.data?.map(row => row.name)).toEqual(['Food']);
  expect(result.current.deposit.data?.map(row => row.name)).toEqual(['Salary']);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('category', { data: null, error });

  const { result } = await renderHookWithClient(() => useCategories('deposit'));

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('inserts, renames and deletes, refreshing every kind', async () => {
  stub.respond('category', {
    data: { id: 9, kind: 'expense', name: 'Pets' },
    error: null,
  });
  const { result, client } = await renderHookWithClient(() => ({
    upsert: useUpsertCategory(),
    remove: useDeleteCategory(),
  }));
  client.setQueryData(queryKeys.categories.list('expense'), []);
  client.setQueryData(queryKeys.categories.list('deposit'), []);
  client.setQueryData(queryKeys.snapshots.window(12), []);

  await act(async () => {
    await result.current.upsert.mutateAsync({ kind: 'expense', name: 'Pets' });
  });
  expect(
    client.getQueryState(queryKeys.categories.list('expense'))?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(queryKeys.categories.list('deposit'))?.isInvalidated,
  ).toBe(true);
  // Categories hold no balances, so net worth is left alone.
  expect(
    client.getQueryState(queryKeys.snapshots.window(12))?.isInvalidated,
  ).toBe(false);

  await act(async () => {
    await result.current.upsert.mutateAsync({ id: 9, name: 'Pet care' });
    await result.current.remove.mutateAsync(9);
  });
  expect(stub.chainsFor('category')).toEqual([
    [['insert', { kind: 'expense', name: 'Pets' }], ['select'], ['single']],
    [['update', { name: 'Pet care' }], ['eq', 'id', 9], ['select'], ['single']],
    [['delete'], ['eq', 'id', 9]],
  ]);
  // Its transactions and charges are unlinked first, so the delete is not blocked.
  expect(stub.chainsFor('txn')).toEqual([
    [
      ['update', { category_id: null }],
      ['eq', 'category_id', 9],
    ],
  ]);
  expect(stub.chainsFor('recurring_charge')).toEqual([
    [
      ['update', { category_id: null }],
      ['eq', 'category_id', 9],
    ],
  ]);
});
