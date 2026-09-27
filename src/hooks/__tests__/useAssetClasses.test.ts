import { waitFor } from '@testing-library/react-native';

import { useAssetClasses } from '../useAssetClasses';
import { supabase } from '@/lib/supabase';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads asset classes in display order (the seed inserts them in that order)', async () => {
  stub.respond('asset_class', {
    data: [
      { id: 1, label: 'Cash' },
      { id: 2, label: 'CPF' },
    ],
    error: null,
  });

  const { result } = await renderHookWithClient(() => useAssetClasses());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.map(row => row.label)).toEqual(['Cash', 'CPF']);
  expect(stub.chainsFor('asset_class')).toEqual([
    [
      ['select', '*'],
      ['order', 'id'],
    ],
  ]);
});

it('surfaces a failed read as an error', async () => {
  const error = { message: 'network down' };
  stub.respond('asset_class', { data: null, error });

  const { result } = await renderHookWithClient(() => useAssetClasses());

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(error);
});
