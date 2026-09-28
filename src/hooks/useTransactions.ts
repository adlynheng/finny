import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths } from 'date-fns';

import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/unwrap';
import type { TxnInsert } from '@/types/domain';
import { parseMonth, toIsoDate } from '@/utils/format/date';

/** The first day of `month` (`YYYY-MM`) and of the month after it, as ISO dates. */
function monthBounds(month: string) {
  const start = parseMonth(month);
  return { start: toIsoDate(start), end: toIsoDate(addMonths(start, 1)) };
}

/** One month's transactions (`YYYY-MM`), or all of them, newest first. */
export function useTransactions(month?: string) {
  return useQuery({
    queryKey: queryKeys.transactions.list(month),
    queryFn: async () => {
      const bounds = month ? monthBounds(month) : undefined;
      let query = supabase.from('txn').select('*');
      if (bounds) {
        query = query.gte('date', bounds.start).lt('date', bounds.end);
      }
      return unwrap(
        await query
          .order('date', { ascending: false })
          // Same-day rows: the most recently added first.
          .order('id', { ascending: false }),
      );
    },
  });
}

type Common = {
  /** Positive; the hook applies the sign. */
  amountCents: number;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
};

export type NewTransaction =
  | (Common & {
      kind: 'expense' | 'deposit';
      accountId: number;
      description: string;
      categoryId?: number | null;
    })
  | (Common & {
      kind: 'transfer';
      from: { id: number; name: string };
      to: { id: number; name: string };
      /** Used on both rows when given; otherwise each row names the other account. */
      description?: string;
    });

/**
 * The rows one new transaction is stored as. Expenses are negative and deposits positive. A
 * transfer is two rows, out of the source and into the destination, both of kind `transfer` so
 * income and expense totals can leave them out; there is no column linking the pair.
 */
function rowsFor(input: NewTransaction): TxnInsert[] {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('The amount must be a positive whole number of cents.');
  }
  if (input.kind !== 'transfer') {
    return [
      {
        kind: input.kind,
        account_id: input.accountId,
        amount_cents:
          input.kind === 'expense' ? -input.amountCents : input.amountCents,
        date: input.date,
        description: input.description,
        category_id: input.categoryId ?? null,
      },
    ];
  }
  // The form disables the source account among the destinations too; this keeps the rule true
  // for any caller.
  if (input.from.id === input.to.id) {
    throw new Error('A transfer needs two different accounts.');
  }
  const description = input.description?.trim();
  const leg = (
    accountId: number,
    amountCents: number,
    fallback: string,
  ): TxnInsert => ({
    kind: 'transfer',
    account_id: accountId,
    amount_cents: amountCents,
    date: input.date,
    description: description || fallback,
    category_id: null,
  });
  return [
    leg(input.from.id, -input.amountCents, `Transfer to ${input.to.name}`),
    leg(input.to.id, input.amountCents, `Transfer from ${input.from.name}`),
  ];
}

function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
}

/** Resolves to the saved rows: one, or two for a transfer. Both transfer rows save or neither. */
export function useAddTransaction() {
  const onSettled = useInvalidateTransactions();
  return useMutation({
    mutationFn: async (input: NewTransaction) => {
      const rows = rowsFor(input);
      // One insert, so Postgres writes both transfer rows in a single statement.
      return unwrap(await supabase.from('txn').insert(rows).select());
    },
    onSettled,
  });
}

/** Deletes one row. Deleting one side of a transfer leaves the other. */
export function useDeleteTransaction() {
  const onSettled = useInvalidateTransactions();
  return useMutation({
    mutationFn: async (id: number) => {
      unwrap(await supabase.from('txn').delete().eq('id', id));
    },
    onSettled,
  });
}
