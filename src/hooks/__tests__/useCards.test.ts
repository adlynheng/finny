import { act, waitFor } from '@testing-library/react-native';

import { useAddCard, useCards, useUpsertCard } from '../useCards';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads cards in the order they were added', async () => {
  stub.respond('card', { data: [{ id: 1 }, { id: 2 }], error: null });

  const { result } = await renderHookWithClient(() => useCards());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);
  expect(stub.chainsFor('card')).toEqual([
    [
      ['select', '*'],
      ['order', 'id'],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('card', { data: null, error });

  const { result } = await renderHookWithClient(() => useCards());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('inserts a new card, then refreshes cards and net worth snapshots', async () => {
  const card = {
    account_id: 2,
    bank: 'Citi',
    card_type: 'credit',
    product_name: 'Rewards',
  };
  stub.respond('card', { data: { id: 5, ...card }, error: null });
  const { result, client } = await renderHookWithClient(() => useUpsertCard());
  client.setQueryData(queryKeys.cards.list(), []);
  client.setQueryData(queryKeys.snapshots.window(24), []);

  await act(async () => {
    await result.current.mutateAsync(card);
  });

  expect(stub.chainsFor('card')).toEqual([
    [['insert', card], ['select'], ['single']],
  ]);
  expect(client.getQueryState(queryKeys.cards.list())?.isInvalidated).toBe(
    true,
  );
  expect(
    client.getQueryState(queryKeys.snapshots.window(24))?.isInvalidated,
  ).toBe(true);
});

it('updates an existing card by id', async () => {
  stub.respond('card', { data: { id: 5, color_theme: 'Dusk' }, error: null });
  const { result } = await renderHookWithClient(() => useUpsertCard());

  await act(async () => {
    await result.current.mutateAsync({ id: 5, color_theme: 'Dusk' });
  });

  expect(stub.chainsFor('card')).toEqual([
    [
      ['update', { color_theme: 'Dusk' }],
      ['eq', 'id', 5],
      ['select'],
      ['single'],
    ],
  ]);
});

it('adds a credit card on a new account of its own, then refreshes cards and accounts', async () => {
  stub.respond('account', { data: { id: 9 }, error: null });
  stub.respond('card', { data: { id: 4 }, error: null });
  const { result, client } = await renderHookWithClient(() => useAddCard());
  client.setQueryData(queryKeys.accounts.list(), []);
  client.setQueryData(queryKeys.cards.list(), []);
  const card = {
    bank: 'Citi',
    product_name: 'Credit',
    card_type: 'credit',
    last4: '1234',
  };
  const account = { name: 'Citi', type: 'Credit card', is_liability: true };

  await act(async () => {
    await result.current.mutateAsync({ card, account });
  });

  expect(stub.chainsFor('account')).toEqual([
    [['insert', account], ['select'], ['single']],
  ]);
  expect(stub.chainsFor('card')).toEqual([
    [['insert', { ...card, account_id: 9 }], ['select'], ['single']],
  ]);
  expect(client.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(
    true,
  );
  expect(client.getQueryState(queryKeys.cards.list())?.isInvalidated).toBe(
    true,
  );
});

it('adds a debit card on the account it names', async () => {
  stub.respond('card', { data: { id: 5 }, error: null });
  const { result } = await renderHookWithClient(() => useAddCard());
  const card = {
    bank: 'UOB',
    product_name: 'Debit',
    card_type: 'debit',
    account_id: 2,
  };

  await act(async () => {
    await result.current.mutateAsync({ card });
  });

  expect(stub.chainsFor('account')).toEqual([]);
  expect(stub.chainsFor('card')).toEqual([
    [['insert', card], ['select'], ['single']],
  ]);
});
