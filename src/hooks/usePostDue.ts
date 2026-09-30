import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { today } from '@/lib/today';
import { unwrap } from '@/lib/unwrap';
import {
  chargePostings,
  incomePostings,
  postedThrough,
} from '@/utils/derive/posting';

/**
 * Posts every recurring charge and income payment due since each last posted, then marks them
 * posted through `day`. The unique keys from migration 0007 make a repeat harmless, so the Mac
 * and the phone opening together post each payment once. Resolves to whether anything posted.
 */
export async function postDue(day: string = today()): Promise<boolean> {
  const results = await Promise.all([
    supabase.from('recurring_charge').select('*').eq('is_active', true),
    supabase.from('income_source').select('*').eq('is_active', true),
    supabase.from('account').select('*').eq('is_active', true),
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('category').select('*').eq('kind', 'deposit'),
  ]);
  const [charges, incomes, accounts, settings, categories] = [
    unwrap(results[0]),
    unwrap(results[1]),
    unwrap(results[2]),
    unwrap(results[3]),
    unwrap(results[4]),
  ];
  const due = <
    T extends { account_id: number | null; last_posted_date: string | null },
  >(
    rows: T[] | null,
  ) =>
    (rows ?? []).filter(
      r => r.account_id !== null && postedThrough(r, day) < day,
    );
  const dueCharges = due(charges);
  // Take-home and CPF need the rates; without settings, income waits.
  const dueIncomes = settings ? due(incomes) : [];
  const context = {
    settings: settings!,
    accounts: accounts ?? [],
    categories: categories ?? [],
  };

  const chargeTxns = dueCharges.flatMap(c => chargePostings(c, day));
  const incomeTxns = dueIncomes.flatMap(s => incomePostings(s, context, day));
  if (chargeTxns.length > 0) {
    unwrap(
      await supabase.from('txn').upsert(chargeTxns, {
        onConflict: 'recurring_id,date',
        ignoreDuplicates: true,
      }),
    );
  }
  if (incomeTxns.length > 0) {
    unwrap(
      await supabase.from('txn').upsert(incomeTxns, {
        onConflict: 'income_id,account_id,date',
        ignoreDuplicates: true,
      }),
    );
  }
  for (const [table, rows] of [
    ['recurring_charge', dueCharges],
    ['income_source', dueIncomes],
  ] as const) {
    if (rows.length > 0) {
      unwrap(
        await supabase
          .from(table)
          .update({ last_posted_date: day })
          .in(
            'id',
            rows.map(r => r.id),
          ),
      );
    }
  }
  return chargeTxns.length + incomeTxns.length > 0;
}

let running: Promise<unknown> | null = null;

async function postAndRefresh(queryClient: QueryClient) {
  if (running) {
    return;
  }
  running = postDue()
    .then(posted => {
      if (posted) {
        for (const key of [
          queryKeys.transactions.all,
          queryKeys.accounts.all,
          queryKeys.recurringCharges.all,
          queryKeys.incomeSources.all,
        ]) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    })
    // Nothing to show: the next launch or return to the app tries again.
    .catch(() => {})
    .finally(() => {
      running = null;
    });
}

/**
 * Posts due charges and income when the app opens and each time it comes back to the front, so
 * a payment lands on its day's balances without the user logging it. Mounted once, beside the
 * screens.
 */
export function usePostDue() {
  const queryClient = useQueryClient();
  useEffect(() => {
    postAndRefresh(queryClient);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        postAndRefresh(queryClient);
      }
    });
    return () => subscription.remove();
  }, [queryClient]);
}
