import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { AssetClassChips } from '../AssetClassChips';
import { classes } from '../../../../test/classes';
import { accounts, assetClasses } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  useUiStore.setState(initialUiState());
  stub.respond('account', { data: accounts, error: null });
  stub.respond('asset_class', { data: assetClasses, error: null });
});

const fill = (id: number) =>
  classes(
    within(screen.getByTestId(`asset-chip-${id}`)).getByTestId('glass-fill'),
  );

it('lists each class with a balance in class order, with its share and balance', async () => {
  await renderWithClient(<AssetClassChips />);

  expect(await screen.findByTestId('asset-chip-1')).toHaveTextContent(
    'Cash30%S$42.3k',
  );
  expect(screen.getByTestId('asset-chip-2')).toHaveTextContent('CPF27%S$38.2k');
  expect(screen.getByTestId('asset-chip-3')).toHaveTextContent(
    'Investments44%S$62.5k',
  );
  // Property and Other have no balance.
  expect(screen.queryByTestId('asset-chip-4')).toBeNull();
  expect(screen.queryByTestId('asset-chip-5')).toBeNull();
});

it('sets them two to a row', async () => {
  await renderWithClient(<AssetClassChips />);
  await screen.findByTestId('asset-chip-1');

  const row = (id: number) => screen.getByTestId(`asset-chip-${id}`).parent;
  expect(row(1)).toBe(row(2));
  expect(row(3)).not.toBe(row(1));
});

it('highlights a tapped class on the sphere, and clears it on a second tap', async () => {
  useUiStore.setState({ hoveredAccountId: 4 });
  await renderWithClient(<AssetClassChips />);
  await fireEvent.press(await screen.findByTestId('asset-chip-2'));

  expect(useUiStore.getState()).toMatchObject({
    hoveredAssetClassId: 2,
    hoveredAccountId: null,
  });
  expect(fill(2)).toContain('bg-white');
  expect(fill(1)).not.toContain('bg-white');

  await fireEvent.press(screen.getByTestId('asset-chip-2'));
  expect(useUiStore.getState().hoveredAssetClassId).toBeNull();
});

it('moves the highlight to another tapped class', async () => {
  await renderWithClient(<AssetClassChips />);
  await fireEvent.press(await screen.findByTestId('asset-chip-2'));
  await fireEvent.press(screen.getByTestId('asset-chip-3'));

  expect(useUiStore.getState().hoveredAssetClassId).toBe(3);
});
