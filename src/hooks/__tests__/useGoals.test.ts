import { waitFor } from '@testing-library/react-native';

import { useGoals } from '../useGoals';
import { supabase } from '@/lib/supabase';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => stub.reset());

it('reads goals in their arranged order', async () => {
  stub.respond('goal', { data: [{ id: 2 }, { id: 1 }], error: null });

  const { result } = await renderHookWithClient(() => useGoals());

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([{ id: 2 }, { id: 1 }]);
  expect(stub.chainsFor('goal')).toEqual([
    [
      ['select', '*'],
      ['order', 'sort_order'],
      ['order', 'id'],
    ],
  ]);
});
