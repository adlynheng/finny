import { Platform } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { ShareOfAssetsCard } from '../ShareOfAssetsCard';
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

afterEach(() => jest.restoreAllMocks());

const fill = (id: number) =>
  classes(
    within(screen.getByTestId(`share-row-${id}`)).getByTestId('glass-fill'),
  );

it('totals the asset accounts and lists them largest first, credit cards left out', async () => {
  await renderWithClient(<ShareOfAssetsCard />);

  expect(await screen.findByTestId('share-row-4')).toHaveTextContent(
    'Interactive BrokersS$62,45044%',
  );
  expect(screen.getByTestId('share-value')).toHaveTextContent('S$142,950');
  expect(screen.getByTestId('share-label')).toHaveTextContent(
    'Across 4 accounts',
  );
  expect(screen.queryByTestId('share-row-5')).toBeNull();
  expect(screen.queryByTestId('share-segment-5')).toBeNull();
});

it('sizes each segment by its balance', async () => {
  await renderWithClient(<ShareOfAssetsCard />);

  expect(await screen.findByTestId('share-segment-4')).toHaveStyle({
    flexGrow: 6_245_000,
  });
  expect(screen.getByTestId('share-segment-2')).toHaveStyle({
    flexGrow: 1_390_000,
  });
});

it.each(['share-row-4', 'share-segment-4'])(
  'hovering %s shows that account, lights it and sets its class for the sphere',
  async testID => {
    jest.replaceProperty(Platform, 'OS', 'macos');
    await renderWithClient(<ShareOfAssetsCard />);
    await fireEvent(await screen.findByTestId(testID), 'hoverIn');

    expect(useUiStore.getState()).toMatchObject({
      hoveredAccountId: 4,
      hoveredAssetClassId: 3,
    });
    expect(screen.getByTestId('share-value')).toHaveTextContent('S$62,450');
    expect(screen.getByTestId('share-label')).toHaveTextContent(
      'Interactive Brokers · 43.7%',
    );
    expect(classes(screen.getByTestId('share-segment-4'))).toContain('bg-lime');
    expect(classes(screen.getByTestId('share-segment-1'))).toContain(
      'bg-white/25',
    );
    expect(fill(4)).toContain('bg-white/[.26]');

    await fireEvent(screen.getByTestId(testID), 'hoverOut');
    expect(useUiStore.getState()).toMatchObject({
      hoveredAccountId: null,
      hoveredAssetClassId: null,
    });
    expect(screen.getByTestId('share-value')).toHaveTextContent('S$142,950');
  },
);

it.each(['share-row-4', 'share-segment-4'])(
  'on iOS, tapping %s lights that account, and tapping it again clears it',
  async testID => {
    await renderWithClient(<ShareOfAssetsCard />);
    await fireEvent.press(await screen.findByTestId(testID));

    expect(useUiStore.getState()).toMatchObject({
      hoveredAccountId: 4,
      hoveredAssetClassId: 3,
    });
    expect(screen.getByTestId('share-value')).toHaveTextContent('S$62,450');

    await fireEvent.press(screen.getByTestId(testID));
    expect(useUiStore.getState()).toMatchObject({
      hoveredAccountId: null,
      hoveredAssetClassId: null,
    });
  },
);

it('on iOS, tapping another account moves the light to it', async () => {
  await renderWithClient(<ShareOfAssetsCard />);
  await fireEvent.press(await screen.findByTestId('share-row-4'));
  await fireEvent.press(screen.getByTestId('share-row-1'));

  expect(useUiStore.getState()).toMatchObject({
    hoveredAccountId: 1,
    hoveredAssetClassId: 1,
  });
});

it('lights every account in a class hovered on the sphere, keeping the total', async () => {
  await renderWithClient(<ShareOfAssetsCard />);
  await screen.findByTestId('share-row-1');
  await act(() => useUiStore.setState({ hoveredAssetClassId: 1 }));

  expect(classes(screen.getByTestId('share-segment-1'))).toContain('bg-lime');
  expect(classes(screen.getByTestId('share-segment-2'))).toContain('bg-lime');
  expect(classes(screen.getByTestId('share-segment-3'))).toContain(
    'bg-white/25',
  );
  expect(fill(1)).toContain('bg-white/[.26]');
  expect(fill(3)).not.toContain('bg-white/[.26]');
  expect(screen.getByTestId('share-value')).toHaveTextContent('S$142,950');
});

it('colours each account by its type at rest', async () => {
  await renderWithClient(<ShareOfAssetsCard />);

  expect(classes(await screen.findByTestId('share-segment-1'))).toContain(
    'bg-white',
  );
  expect(classes(screen.getByTestId('share-segment-3'))).toContain(
    'bg-white/[.72]',
  );
  expect(classes(screen.getByTestId('share-segment-4'))).toContain(
    'bg-white/45',
  );
});

it('hatches each segment edge to edge, a full-height line every 4px', async () => {
  await renderWithClient(<ShareOfAssetsCard />);
  const segment = await screen.findByTestId('share-segment-4');
  await fireEvent(within(segment).getByTestId('share-hatch'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 10, height: 34 } },
  });

  expect(within(segment).getByTestId('share-hatch-lines').props.d).toBe(
    'M0.5 0V34M4.5 0V34M8.5 0V34',
  );
});
