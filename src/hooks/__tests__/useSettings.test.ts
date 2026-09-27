import { act, waitFor } from '@testing-library/react-native';

import { useSettings, useUpdateSettings } from '../useSettings';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads the one settings row', async () => {
  stub.respond('settings', { data: { id: 1, name: 'Adlyn' }, error: null });

  const { result } = await renderHookWithClient(() => useSettings());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: 1, name: 'Adlyn' });
  expect(stub.chainsFor('settings')).toEqual([
    [['select', '*'], ['eq', 'id', 1], ['single']],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'JWT expired' };
  stub.respond('settings', { data: null, error });

  const { result } = await renderHookWithClient(() => useSettings());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});

it('updates only the given fields, then refreshes settings', async () => {
  stub.respond('settings', { data: { id: 1, name: 'Adlyn H' }, error: null });
  const { result, client } = await renderHookWithClient(() =>
    useUpdateSettings(),
  );
  client.setQueryData(queryKeys.settings.detail(), { id: 1, name: 'Adlyn' });
  client.setQueryData(queryKeys.accounts.list(), []);

  await act(async () => {
    await result.current.mutateAsync({ name: 'Adlyn H' });
  });

  expect(stub.chainsFor('settings')).toEqual([
    [['update', { name: 'Adlyn H' }], ['eq', 'id', 1], ['select'], ['single']],
  ]);
  expect(client.getQueryState(queryKeys.settings.detail())?.isInvalidated).toBe(
    true,
  );
  expect(client.getQueryState(queryKeys.accounts.list())?.isInvalidated).toBe(
    false,
  );
});
