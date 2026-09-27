import { waitFor } from '@testing-library/react-native';

import { useSales } from '../useSales';
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
