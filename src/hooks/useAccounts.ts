import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import {
  ACCOUNT_TYPES,
  type AccountInsert,
  type AccountRow,
} from '@/types/domain';

/** Position of a type in the Settings grouping; an unknown type sorts last. */
function typeRank(type: string) {
  const rank = (ACCOUNT_TYPES as readonly string[]).indexOf(type);
  return rank === -1 ? ACCOUNT_TYPES.length : rank;
}

// Sorted here rather than by Postgres: the Settings grouping (Savings, CPF, Broker, Credit card)
// is not alphabetical.
function bySettingsGroup(a: AccountRow, b: AccountRow) {
  return typeRank(a.type) - typeRank(b.type) || a.name.localeCompare(b.name);
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: async () =>
      unwrap(await supabase.from('account').select('*')).sort(bySettingsGroup),
  });
}

/** Balances feed net worth, so every account change also refreshes the snapshots. */
function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots.all }),
    ]);
}

/** Inserts a new account, or updates one when the row carries an id. Resolves to the saved row. */
export function useUpsertAccount() {
  const onSettled = useInvalidateAccounts();
  return useMutation({
    mutationFn: async (account: AccountInsert) =>
      unwrap(await supabase.from('account').upsert(account).select().single()),
    onSettled,
  });
}

export function useDeleteAccount() {
  const onSettled = useInvalidateAccounts();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await supabase.from('account').delete().eq('id', id));
    },
    onSettled,
  });
}
