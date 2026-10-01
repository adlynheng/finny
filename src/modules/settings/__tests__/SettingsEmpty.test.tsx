import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import {
  initialUiState,
  useUiStore,
  type SettingsPanel,
} from '@/stores/uiStore';
import { SettingsScreen } from '../SettingsScreen';
import { TODAY } from '../../../../test/financeFixtures';
import { assetClasses } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import { settingsRow } from '../../../../test/settingsFixtures';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

/** A name, and nothing else. */
beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  useUiStore.setState(initialUiState());
  jest.replaceProperty(Platform, 'OS', 'macos');
  stub.respond('settings', { data: settingsRow, error: null });
  stub.respond('asset_class', { data: assetClasses, error: null });
  for (const table of ['card', 'account', 'category', 'txn', 'income_source']) {
    stub.respond(table, { data: [], error: null });
  }
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

async function draw(panel: SettingsPanel = 'accounts') {
  useUiStore.setState({ settingsPanel: panel });
  await renderWithClient(
    <>
      <SettingsScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('settings-panel');
}

it('with no cards: dashed outlines to add the first, and No cards yet', async () => {
  await draw();

  expect(screen.getByTestId('card-fan-empty')).toBeTruthy();
  expect(screen.queryByTestId('card-fan')).toBeNull();
  expect(screen.getByTestId('card-detail-empty')).toHaveTextContent(
    /^No cards yet/,
  );
  const profile = within(screen.getByTestId('settings-profile'));
  expect(profile.getByText('0 cards')).toBeTruthy();
  expect(profile.getByText('0 accounts')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('card-fan-add'));
  expect(await screen.findByTestId('sheet-surface')).toBeTruthy();
});

it('the nav says none yet, or where categories come from', async () => {
  await draw();

  const sub = (key: string) =>
    within(screen.getByTestId(`settings-nav-${key}`));
  expect(sub('accounts').getByText('None yet')).toBeTruthy();
  expect(
    sub('expenditure').getByText('Start from defaults or your own'),
  ).toBeTruthy();
  expect(
    sub('deposit').getByText('Start from defaults or your own'),
  ).toBeTruthy();
  expect(sub('fixed').getByText('None yet')).toBeTruthy();
});

it.each([
  ['accounts', 'No accounts yet', 'New account'],
  ['expenditure', 'No categories yet', 'New category'],
  ['deposit', 'No categories yet', 'New category'],
  ['fixed', 'No fixed variables yet', 'Add income'],
] as const)(
  'an empty %s panel: None yet, dashed rows and "%s"',
  async (panel, title, action) => {
    await draw(panel);

    expect(screen.getByTestId('settings-panel-summary')).toHaveTextContent(
      'None yet',
    );
    const empty = within(screen.getByTestId('settings-panel-empty'));
    expect(empty.getAllByTestId('ghost-row')).toHaveLength(4);
    expect(empty.getByText(title)).toBeTruthy();
    expect(empty.getByTestId('settings-panel-empty-action')).toHaveTextContent(
      action,
    );
  },
);

describe.each(['macos', 'ios'] as const)(
  'on %s, an empty panel’s buttons open its sheet',
  os => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', os));

    it.each([
      ['accounts', 'settings-panel-empty-action'],
      ['accounts', 'settings-panel-action'],
      ['expenditure', 'settings-panel-empty-action'],
      ['deposit', 'settings-panel-empty-action'],
      ['fixed', 'settings-panel-empty-action'],
      ['fixed', 'settings-panel-action'],
    ] as const)('%s: %s', async (panel, button) => {
      await draw(panel);

      await fireEvent.press(screen.getByTestId(button));
      expect(await screen.findByTestId('sheet-surface')).toBeTruthy();
    });
  },
);

it('the share card: S$0 across 0 accounts, and nothing owed', async () => {
  await draw();

  const share = within(screen.getByTestId('share-card'));
  expect(share.getByTestId('share-value')).toHaveTextContent('S$0');
  expect(share.getByTestId('share-label')).toHaveTextContent('0 accounts');
  expect(share.getByTestId('share-empty-bar')).toBeTruthy();
  expect(share.getAllByTestId('ghost-row')).toHaveLength(2);
  expect(share.getByTestId('share-owed-total')).toHaveTextContent('S$0');
  expect(share.queryByTestId('share-add-account')).toBeNull();
});
