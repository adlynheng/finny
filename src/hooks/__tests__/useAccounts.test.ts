import { act, waitFor } from '@testing-library/react-native';

import {
  useAccounts,
  useDeleteAccount,
  useUpsertAccount,
} from '../useAccounts';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

function account(id: number, type: string, name: string) {
  return { id, type, name };
}

it('orders accounts the way Settings groups them, then by name', async () => {
  stub.respond('account', {
    data: [
      account(1, 'Credit card', 'Citi Rewards'),
      account(2, 'Broker', 'IBKR'),
      account(3, 'Savings', 'UOB One'),
      account(4, 'CPF', 'CPF OA'),
      account(5, 'Savings', 'DBS Multiplier'),
      account(6, 'Broker', 'Endowus'),
    ],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useAccounts());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.map(row => row.name)).toEqual([
    'DBS Multiplier',
    'UOB One',
    'CPF OA',
    'Endowus',
    'IBKR',
    'Citi Rewards',
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'permission denied for table account' };
  stub.respond('account', { data: null, error });

  const { result } = await renderHookWithClient(() => useAccounts());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('inserts a new account, then refreshes accounts and net worth snapshots', async () => {
  const saved = account(7, 'Savings', 'OCBC 360');
  stub.respond('account', { data: saved, error: null });
  const { result, client } = await renderHookWithClient(() =>
    useUpsertAccount(),
  );
  client.setQueryData(queryKeys.accounts.list(), []);
  client.setQueryData(queryKeys.snapshots.window(12), []);
  client.setQueryData(queryKeys.cards.list(), []);

  let returned: unknown;
  await act(async () => {
    returned = await result.current.mutateAsync({
      name: 'OCBC 360',
      type: 'Savings',
    });
  });

  expect(returned).toEqual(saved);
  expect(stub.chainsFor('account')).toEqual([
    [['insert', { name: 'OCBC 360', type: 'Savings' }], ['select'], ['single']],
  ]);
  expect(client.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(
    true,
  );
  expect(
    client.getQueryState(queryKeys.snapshots.window(12))?.isInvalidated,
  ).toBe(true);
  expect(client.getQueryState(queryKeys.cards.list())?.isInvalidated).toBe(
    false,
  );
});

it('updates an existing account by id, sending only the changed fields', async () => {
  stub.respond('account', { data: account(4, 'CPF', 'CPF OA'), error: null });
  const { result, client } = await renderHookWithClient(() =>
    useUpsertAccount(),
  );
  client.setQueryData(queryKeys.accounts.list(), []);
  client.setQueryData(queryKeys.snapshots.window(12), []);

  await act(async () => {
    await result.current.mutateAsync({ id: 4, balance_cents: 1_250_000 });
  });

  expect(stub.chainsFor('account')).toEqual([
    [
      ['update', { balance_cents: 1_250_000 }],
      ['eq', 'id', 4],
      ['select'],
      ['single'],
    ],
  ]);
  expect(client.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(
    true,
  );
  expect(
    client.getQueryState(queryKeys.snapshots.window(12))?.isInvalidated,
  ).toBe(true);
});

it('deletes an account by id and refreshes, and rejects when the delete fails', async () => {
  const error = { message: 'account is still referenced by a card' };
  stub.respond('account', { data: null, error: null }, { data: null, error });
  const { result, client } = await renderHookWithClient(() =>
    useDeleteAccount(),
  );
  client.setQueryData(queryKeys.accounts.list(), []);
  client.setQueryData(queryKeys.snapshots.window(6), []);

  await act(() => result.current.mutateAsync(3));

  expect(stub.chainsFor('account')).toEqual([[['delete'], ['eq', 'id', 3]]]);
  expect(client.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(
    true,
  );
  expect(
    client.getQueryState(queryKeys.snapshots.window(6))?.isInvalidated,
  ).toBe(true);

  await act(async () => {
    await expect(result.current.mutateAsync(4)).rejects.toBe(error);
  });
});
