import { act, waitFor } from '@testing-library/react-native';

import { Sphere } from '@/components/charts/Sphere';
import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { OverviewSphere } from '../OverviewSphere';
import { accounts, assetClasses } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

// The chart itself is Sphere.test's; here, only what it is given.
jest.mock('@/components/charts/Sphere', () => ({
  Sphere: jest.fn(() => null),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
  stub.respond('account', { data: accounts, error: null });
  stub.respond('asset_class', { data: assetClasses, error: null });
  stub.respond('net_worth_snapshot', {
    data: [
      { date: '2024-10-01', total_cents: 9_000_000, classes: [] },
      { date: '2026-09-01', total_cents: 14_000_000, classes: [] },
    ],
    error: null,
  });
});

afterEach(resetToday);

/** The props the sphere was last drawn with. */
const drawn = () => jest.mocked(Sphere).mock.lastCall![0];

async function sphere() {
  jest.mocked(Sphere).mockClear();
  await renderWithClient(<OverviewSphere />);
  await waitFor(() => expect(drawn().oldest).not.toBeNull());
  return { props: drawn() };
}

it('rings the classes in their own order, compared with the oldest snapshot', async () => {
  const { props } = await sphere();

  expect(props.classes).toEqual([
    { key: '1', label: 'Cash', cents: 4_230_000 },
    { key: '2', label: 'CPF', cents: 3_820_000 },
    { key: '3', label: 'Investments', cents: 6_245_000 },
  ]);
  expect(props.newestCents).toBe(14_175_000);
  expect(props.oldest).toEqual({ month: '2024-10', cents: 9_000_000 });
  expect(props.selected).toBeNull();
});

it('sets the hovered class for the Share of assets card, and clears it on leaving', async () => {
  const { props } = await sphere();

  await act(() => props.onSelect!('3'));
  expect(useUiStore.getState()).toMatchObject({
    hoveredAssetClassId: 3,
    hoveredAccountId: null,
  });

  await act(() => props.onSelect!(null));
  expect(useUiStore.getState().hoveredAssetClassId).toBeNull();
});

it('highlights the class a Share of assets row sets', async () => {
  await sphere();
  await act(() =>
    useUiStore.setState({ hoveredAccountId: 1, hoveredAssetClassId: 1 }),
  );

  expect(drawn().selected).toBe('1');
});

it('labels the classes unless told not to (mobile, where chips carry them)', async () => {
  expect((await sphere()).props.labels).toBe(true);

  jest.mocked(Sphere).mockClear();
  await renderWithClient(<OverviewSphere labels={false} />);
  await waitFor(() => expect(drawn().labels).toBe(false));
});
