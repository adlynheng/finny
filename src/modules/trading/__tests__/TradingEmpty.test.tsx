import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { TradingScreen } from '../TradingScreen';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

/** Nothing held, sold or watched. */
beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
  jest.replaceProperty(Platform, 'OS', 'macos');
  for (const table of [
    'position',
    'sale',
    'watchlist_item',
    'account',
    'instrument',
  ]) {
    stub.respond(table, { data: [], error: null });
  }
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

async function open() {
  await renderWithClient(
    <>
      <TradingScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('trading-empty-chart');
}

it('the hero: no positions yet, S$0, and zeros in the strip', async () => {
  await open();

  expect(screen.getByTestId('trading-empty-chip')).toHaveTextContent(
    'No positions yet',
  );
  expect(screen.getByTestId('trading-value')).toHaveTextContent('0');
  expect(screen.getByTestId('trading-strip')).toHaveTextContent(
    /Capital invested.*S\$0.*Positions0/,
  );
  expect(screen.queryByTestId('trading-chart')).toBeNull();
  expect(screen.queryByTestId('trading-mode')).toBeNull();
});

it('the hero’s Add position opens the form', async () => {
  await open();

  await fireEvent.press(screen.getByTestId('trading-empty-add'));
  expect(useUiStore.getState().addPositionOpen).toBe(true);
});

it('the health card waits for holdings', async () => {
  await open();

  expect(screen.getByTestId('health-updated')).toHaveTextContent(
    'AI review · waiting for holdings',
  );
  expect(screen.getByTestId('health-verdict')).toHaveTextContent(
    'Scored once you hold something',
  );
  expect(screen.getByTestId('health-diversification')).toHaveTextContent('–');
  expect(screen.queryByTestId('health-rings')).toBeNull();
  const ideas = within(screen.getByTestId('health-empty'));
  expect(ideas.getAllByTestId('ghost-row')).toHaveLength(2);
});

it.each([
  ['positions', 'No positions yet', true],
  ['watchlist', 'Nothing on your watchlist', false],
  ['portfolio', 'No mix to show yet', false],
] as const)(
  'the %s tab is empty: dashed rows and "%s"',
  async (tab, title, canAdd) => {
    useUiStore.setState({ tradingTab: tab });
    await open();

    const empty = within(screen.getByTestId('trading-empty'));
    expect(empty.getAllByTestId('ghost-row')).toHaveLength(3);
    expect(empty.getByText(title)).toBeTruthy();
    expect(empty.queryByTestId('add-first-position') !== null).toBe(canAdd);
  },
);
