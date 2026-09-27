import { act, waitFor } from '@testing-library/react-native';

import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
} from '../useTransactions';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

const dbs = { id: 1, name: 'DBS Multiplier' };
const ibkr = { id: 2, name: 'IBKR' };

beforeEach(() => stub.reset());

async function add(
  input: Parameters<ReturnType<typeof useAddTransaction>['mutateAsync']>[0],
) {
  const { result, client } = await renderHookWithClient(() =>
    useAddTransaction(),
  );
  client.setQueryData(queryKeys.transactions.list('2026-09'), []);
  await act(async () => {
    await result.current.mutateAsync(input);
  });
  return client;
}

/** The rows sent in the one insert call. */
function insertedRows() {
  const [chain] = stub.chainsFor('txn');
  expect(chain?.[0]?.[0]).toBe('insert');
  return chain?.[0]?.[1];
}

describe('reading', () => {
  it('reads one month, newest first', async () => {
    stub.respond('txn', { data: [], error: null });

    const { result } = await renderHookWithClient(() =>
      useTransactions('2026-09'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(stub.chainsFor('txn')).toEqual([
      [
        ['select', '*'],
        ['gte', 'date', '2026-09-01'],
        ['lt', 'date', '2026-10-01'],
        ['order', 'date', { ascending: false }],
        ['order', 'id', { ascending: false }],
      ],
    ]);
  });

  it('rolls December over into the next year', async () => {
    stub.respond('txn', { data: [], error: null });

    const { result } = await renderHookWithClient(() =>
      useTransactions('2026-12'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(stub.chainsFor('txn')[0]).toContainEqual([
      'lt',
      'date',
      '2027-01-01',
    ]);
  });

  it('reads every transaction when no month is given', async () => {
    stub.respond('txn', { data: [], error: null });

    const { result } = await renderHookWithClient(() => useTransactions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(stub.chainsFor('txn')).toEqual([
      [
        ['select', '*'],
        ['order', 'date', { ascending: false }],
        ['order', 'id', { ascending: false }],
      ],
    ]);
  });

  it('rejects a month that is not YYYY-MM', async () => {
    const { result } = await renderHookWithClient(() =>
      useTransactions('2026-9'),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(stub.from).not.toHaveBeenCalled();
  });

  it('surfaces a failed read as an error', async () => {
    const error = { message: 'network down' };
    stub.respond('txn', { data: null, error });

    const { result } = await renderHookWithClient(() =>
      useTransactions('2026-09'),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});

describe('adding', () => {
  it('stores an expense as money out', async () => {
    await add({
      kind: 'expense',
      accountId: 1,
      amountCents: 1_250,
      date: '2026-09-24',
      description: 'Kopi',
      categoryId: 3,
    });

    expect(insertedRows()).toEqual([
      {
        kind: 'expense',
        account_id: 1,
        amount_cents: -1_250,
        date: '2026-09-24',
        description: 'Kopi',
        category_id: 3,
      },
    ]);
  });

  it('stores a deposit as money in', async () => {
    await add({
      kind: 'deposit',
      accountId: 1,
      amountCents: 520_000,
      date: '2026-09-25',
      description: 'Salary',
      categoryId: 8,
    });

    expect(insertedRows()).toEqual([
      expect.objectContaining({ kind: 'deposit', amount_cents: 520_000 }),
    ]);
  });

  it('stores a transfer as two rows, out of the source and into the destination', async () => {
    await add({
      kind: 'transfer',
      from: dbs,
      to: ibkr,
      amountCents: 100_000,
      date: '2026-09-24',
    });

    expect(insertedRows()).toEqual([
      {
        kind: 'transfer',
        account_id: 1,
        amount_cents: -100_000,
        date: '2026-09-24',
        description: 'Transfer to IBKR',
        category_id: null,
      },
      {
        kind: 'transfer',
        account_id: 2,
        amount_cents: 100_000,
        date: '2026-09-24',
        description: 'Transfer from DBS Multiplier',
        category_id: null,
      },
    ]);
  });

  it('uses the caller’s description on both transfer rows when one is given', async () => {
    await add({
      kind: 'transfer',
      from: dbs,
      to: ibkr,
      amountCents: 100_000,
      date: '2026-09-24',
      description: 'September top-up',
    });

    const rows = insertedRows() as { description: string }[];
    expect(rows.map(row => row.description)).toEqual([
      'September top-up',
      'September top-up',
    ]);
  });

  it('falls back to the generated descriptions when the given one is blank', async () => {
    await add({
      kind: 'transfer',
      from: dbs,
      to: ibkr,
      amountCents: 100_000,
      date: '2026-09-24',
      description: '   ',
    });

    const rows = insertedRows() as { description: string }[];
    expect(rows.map(row => row.description)).toEqual([
      'Transfer to IBKR',
      'Transfer from DBS Multiplier',
    ]);
  });

  it('refuses a transfer from an account to itself, without writing', async () => {
    const { result } = await renderHookWithClient(() => useAddTransaction());

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          kind: 'transfer',
          from: dbs,
          to: { ...dbs },
          amountCents: 100_000,
          date: '2026-09-24',
        }),
      ).rejects.toThrow('A transfer needs two different accounts.');
    });
    expect(stub.from).not.toHaveBeenCalled();
  });

  it.each([0, -500, 12.5])(
    'refuses an amount of %p cents, without writing',
    async amountCents => {
      const { result } = await renderHookWithClient(() => useAddTransaction());

      await act(async () => {
        await expect(
          result.current.mutateAsync({
            kind: 'expense',
            accountId: 1,
            amountCents,
            date: '2026-09-24',
            description: 'Kopi',
          }),
        ).rejects.toThrow(
          'The amount must be a positive whole number of cents.',
        );
      });
      expect(stub.from).not.toHaveBeenCalled();
    },
  );

  it('refreshes every month once saved', async () => {
    const client = await add({
      kind: 'expense',
      accountId: 1,
      amountCents: 1_250,
      date: '2026-09-24',
      description: 'Kopi',
    });

    expect(
      client.getQueryState(queryKeys.transactions.list('2026-09'))
        ?.isInvalidated,
    ).toBe(true);
  });
});

describe('deleting', () => {
  it('deletes one row by id and refreshes', async () => {
    const { result, client } = await renderHookWithClient(() =>
      useDeleteTransaction(),
    );
    client.setQueryData(queryKeys.transactions.list(), []);

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    expect(stub.chainsFor('txn')).toEqual([[['delete'], ['eq', 'id', 42]]]);
    expect(
      client.getQueryState(queryKeys.transactions.list())?.isInvalidated,
    ).toBe(true);
  });
});
