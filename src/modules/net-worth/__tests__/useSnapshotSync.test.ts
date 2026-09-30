import { waitFor } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import {
  currentSnapshot,
  sameSnapshot,
  useSnapshotSync,
} from '../useSnapshotSync';
import { accounts, assetClasses } from '../../../../test/overviewFixtures';
import { renderHookWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
});
afterEach(resetToday);

/** The fixture accounts: S$142,950 of assets less the card's S$1,200. */
const live = {
  date: '2026-09-01',
  totalCents: 14_175_000,
  liabilitiesCents: 120_000,
  classes: [
    { assetClassId: 3, amountCents: 6_245_000 },
    { assetClassId: 1, amountCents: 4_230_000 },
    { assetClassId: 2, amountCents: 3_820_000 },
  ],
};

/** A saved row holding `live`'s figures, as `useSnapshots` reads it. */
const savedLive = {
  id: 9,
  date: '2026-09-01',
  total_cents: 14_175_000,
  liabilities_cents: 120_000,
  classes: [
    { amount_cents: 4_230_000, asset_class: assetClasses[0]! },
    { amount_cents: 3_820_000, asset_class: assetClasses[1]! },
    { amount_cents: 6_245_000, asset_class: assetClasses[2]! },
  ],
};

describe('currentSnapshot', () => {
  it('is net worth, what is owed, and each class’s assets', () => {
    expect(currentSnapshot(accounts, assetClasses, '2026-09-01')).toEqual(live);
  });

  it('is nothing before there is a balance to record', () => {
    expect(currentSnapshot([], assetClasses, '2026-09-01')).toBeNull();
    const zero = accounts.map(a => ({ ...a, balance_cents: 0 }));
    expect(currentSnapshot(zero, assetClasses, '2026-09-01')).toBeNull();
  });
});

describe('sameSnapshot', () => {
  it('matches a saved row with the same figures, whatever the class order', () => {
    expect(sameSnapshot(savedLive, live)).toBe(true);
  });

  it.each([
    ['total', { total_cents: 1 }],
    ['what is owed', { liabilities_cents: 1 }],
    [
      'a class amount',
      {
        classes: [
          { amount_cents: 1, asset_class: assetClasses[0]! },
          ...savedLive.classes.slice(1),
        ],
      },
    ],
    ['a missing class', { classes: savedLive.classes.slice(1) }],
  ])('differs on %s', (_, change) => {
    expect(sameSnapshot({ ...savedLive, ...change }, live)).toBe(false);
  });
});

describe('useSnapshotSync', () => {
  const respond = (snapshots: unknown[]) => {
    stub.respond('account', { data: accounts, error: null });
    stub.respond('asset_class', { data: assetClasses, error: null });
    stub.respond('net_worth_snapshot', { data: snapshots, error: null });
  };
  const upserts = () =>
    stub
      .chainsFor('net_worth_snapshot')
      .filter(chain => chain[0]?.[0] === 'upsert');

  it('saves this month when its row is out of date', async () => {
    respond([{ ...savedLive, total_cents: 14_000_000 }]);
    stub.respond('net_worth_snapshot_class', { data: null, error: null });

    await renderHookWithClient(() => useSnapshotSync());

    await waitFor(() => expect(upserts()).toHaveLength(1));
    expect(upserts()[0]![0]).toEqual([
      'upsert',
      {
        date: '2026-09-01',
        total_cents: 14_175_000,
        liabilities_cents: 120_000,
      },
      { onConflict: 'date' },
    ]);
  });

  it('saves this month when it has no row yet', async () => {
    respond([]);

    await renderHookWithClient(() => useSnapshotSync());

    await waitFor(() => expect(upserts()).toHaveLength(1));
  });

  it('leaves a row that already matches', async () => {
    respond([savedLive]);

    await renderHookWithClient(() => useSnapshotSync());

    await waitFor(() =>
      expect(stub.chainsFor('net_worth_snapshot')).toHaveLength(1),
    );
    expect(upserts()).toHaveLength(0);
  });
});
