import { act, waitFor } from '@testing-library/react-native';

import { useSnapshots, useUpsertSnapshot } from '../useSnapshots';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { freezeToday, resetToday } from '@/lib/today';
import { renderHookWithClient } from '../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

const SELECT =
  '*, classes:net_worth_snapshot_class(amount_cents, asset_class(id, label, color))';

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
});

afterEach(resetToday);

describe('reading', () => {
  it.each([
    [6, '2026-04-01'],
    [12, '2025-10-01'],
    [24, '2024-10-01'],
  ] as const)(
    'reads the last %i monthly points, from %s, oldest first, with class labels nested',
    async (months, start) => {
      stub.respond('net_worth_snapshot', { data: [], error: null });

      const { result } = await renderHookWithClient(() => useSnapshots(months));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(stub.chainsFor('net_worth_snapshot')).toEqual([
        [
          ['select', SELECT],
          ['gte', 'date', start],
          ['order', 'date'],
        ],
      ]);
      expect(stub.from).toHaveBeenCalledTimes(1);
    },
  );

  it('returns the rows as stored, oldest first', async () => {
    const rows = [
      {
        date: '2026-08-01',
        classes: [
          {
            amount_cents: 100,
            asset_class: { id: 1, label: 'Cash', color: null },
          },
        ],
      },
      { date: '2026-09-01', classes: [] },
    ];
    stub.respond('net_worth_snapshot', { data: rows, error: null });

    const { result } = await renderHookWithClient(() => useSnapshots(6));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
  });

  it('keeps each window in its own cache entry', async () => {
    stub.respond('net_worth_snapshot', { data: [], error: null });

    const { client } = await renderHookWithClient(() => useSnapshots(24));

    await waitFor(() =>
      expect(client.getQueryState(queryKeys.snapshots.window(24))?.status).toBe(
        'success',
      ),
    );
    expect(client.getQueryState(queryKeys.snapshots.window(6))).toBeUndefined();
  });

  it('surfaces a failed read as an error', async () => {
    const error = { message: 'network down' };
    stub.respond('net_worth_snapshot', { data: null, error });

    const { result } = await renderHookWithClient(() => useSnapshots(12));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});

describe('saving', () => {
  const september = {
    date: '2026-09-01',
    totalCents: 25_000_000,
    liabilitiesCents: 120_000,
    classes: [
      { assetClassId: 1, amountCents: 5_000_000 },
      { assetClassId: 3, amountCents: 20_120_000 },
    ],
  };

  async function save(input = september) {
    stub.respond('net_worth_snapshot', { data: { id: 7 }, error: null });
    const { result, client } = await renderHookWithClient(() =>
      useUpsertSnapshot(),
    );
    client.setQueryData(queryKeys.snapshots.window(12), []);
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    return client;
  }

  it('upserts the snapshot on its date, so a second save that month overwrites it', async () => {
    await save();

    expect(stub.chainsFor('net_worth_snapshot')).toEqual([
      [
        [
          'upsert',
          {
            date: '2026-09-01',
            total_cents: 25_000_000,
            liabilities_cents: 120_000,
          },
          { onConflict: 'date' },
        ],
        ['select', 'id'],
        ['single'],
      ],
    ]);
  });

  it('replaces the class rows: upserts the new ones, then deletes any class no longer present', async () => {
    await save();

    expect(stub.chainsFor('net_worth_snapshot_class')).toEqual([
      [
        [
          'upsert',
          [
            { snapshot_id: 7, asset_class_id: 1, amount_cents: 5_000_000 },
            { snapshot_id: 7, asset_class_id: 3, amount_cents: 20_120_000 },
          ],
          { onConflict: 'snapshot_id,asset_class_id' },
        ],
      ],
      [
        ['delete'],
        ['eq', 'snapshot_id', 7],
        ['not', 'asset_class_id', 'in', '(1,3)'],
      ],
    ]);
  });

  it('deletes every class row when the snapshot has none', async () => {
    await save({ ...september, classes: [] });

    expect(stub.chainsFor('net_worth_snapshot_class')).toEqual([
      [['delete'], ['eq', 'snapshot_id', 7]],
    ]);
  });

  it('refreshes every window once saved', async () => {
    const client = await save();

    expect(
      client.getQueryState(queryKeys.snapshots.window(12))?.isInvalidated,
    ).toBe(true);
  });

  it('stops before touching class rows when the snapshot upsert fails', async () => {
    const error = { message: 'network down' };
    stub.respond('net_worth_snapshot', { data: null, error });
    const { result } = await renderHookWithClient(() => useUpsertSnapshot());

    await act(async () => {
      await expect(result.current.mutateAsync(september)).rejects.toBe(error);
    });
    expect(stub.chainsFor('net_worth_snapshot_class')).toEqual([]);
  });
});
