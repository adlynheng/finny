import { Platform } from 'react-native';
import { screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { givenName } from '../NetWorthHero';
import { OverviewScreen } from '../OverviewScreen';
import { TODAY } from '../../../../test/financeFixtures';
import { assetClasses } from '../../../../test/overviewFixtures';
import { goals } from '../../../../test/plannerFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import { settingsRow } from '../../../../test/settingsFixtures';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

/** A new user: a name and nothing else. */
function respondEmpty(extra: { goal?: unknown[] } = {}) {
  stub.respond('settings', {
    data: {
      ...settingsRow,
      monthly_expenditure_cents: 0,
      monthly_savings_cents: 0,
      monthly_investment_cents: 0,
    },
    error: null,
  });
  stub.respond('account', { data: [], error: null });
  stub.respond('asset_class', { data: assetClasses, error: null });
  stub.respond('position', { data: [], error: null });
  stub.respond('goal', { data: extra.goal ?? [], error: null });
  stub.respond('txn', { data: [], error: null });
  stub.respond('net_worth_snapshot', { data: [], error: null });
}

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  jest.replaceProperty(Platform, 'OS', 'macos');
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

it('welcomes a new user at S$0, with nothing tracked yet', async () => {
  respondEmpty();
  await renderWithClient(<OverviewScreen />);

  expect(await screen.findByTestId('net-worth-welcome')).toHaveTextContent(
    'Welcome, Wei Ling',
  );
  expect(screen.getByTestId('net-worth')).toHaveTextContent('0');
  expect(screen.getByTestId('net-worth-month')).toHaveTextContent('Sep 2026');
  expect(screen.getByTestId('net-worth-nothing')).toHaveTextContent(
    'Nothing tracked yet',
  );
  expect(screen.queryByTestId('net-worth-liabilities')).toBeNull();
});

it.each([
  ['Wei Ling Tan', 'Wei Ling'],
  ['Adlyn Heng', 'Adlyn'],
  ['Adlyn', 'Adlyn'],
  ['  ', ''],
])('greets %j as %j', (name, given) => {
  expect(givenName(name)).toBe(given);
});

it('lists the four setup steps, none done, each naming its tab', async () => {
  respondEmpty();
  await renderWithClient(<OverviewScreen />);

  const steps = within(await screen.findByTestId('setup-steps'));
  expect(steps.getByTestId('setup-done')).toHaveTextContent('0 of 4 done');
  const rows = [
    ['Settings', 'Add your accounts'],
    ['Finance', 'Set a monthly budget'],
    ['Trading', 'Log your holdings'],
    ['Planner', 'Create a savings goal'],
  ];
  for (const [tab, title] of rows) {
    const row = steps.getByTestId(`setup-step-${tab}`);
    expect(row).toHaveTextContent(new RegExp(title!));
    expect(row.props.accessibilityState).toMatchObject({ checked: false });
  }
});

it('ticks a step once its data exists', async () => {
  respondEmpty({ goal: goals.slice(0, 1) });
  await renderWithClient(<OverviewScreen />);

  expect(await screen.findByText('1 of 4 done')).toBeTruthy();
  expect(
    screen.getByTestId('setup-step-Planner').props.accessibilityState,
  ).toMatchObject({ checked: true });
});

it('draws the empty sphere with its caption', async () => {
  respondEmpty();
  await renderWithClient(<OverviewScreen />);

  expect(await screen.findByTestId('sphere-empty')).toBeTruthy();
  expect(
    screen.getByTestId('sphere-empty-caption').props.children.props.children,
  ).toBe('Cash, CPF, investments and property map here');
});

it('empties the share, This month and goals cards', async () => {
  respondEmpty();
  await renderWithClient(<OverviewScreen />);

  const share = within(await screen.findByTestId('share-card'));
  expect(share.getByTestId('share-value')).toHaveTextContent('S$0');
  expect(share.getByTestId('share-label')).toHaveTextContent('0 accounts');
  expect(share.getAllByTestId('share-ghost-row')).toHaveLength(4);
  expect(share.getByText('No accounts yet')).toBeTruthy();
  expect(share.getByTestId('share-add-account')).toHaveTextContent(
    'Add an account',
  );

  expect(screen.getByTestId('month-spent')).toHaveTextContent(
    'No transactions yet',
  );
  expect(screen.getByTestId('month-net')).toHaveTextContent('Net S$0');
  expect(screen.getByTestId('month-bar').props.style).toMatchObject({
    width: '0%',
  });
  expect(screen.getByTestId('goals-summary')).toHaveTextContent('None yet');
});

it('stacks the steps under the welcome on iOS', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  respondEmpty();
  await renderWithClient(<OverviewScreen />);

  const hero = within(await screen.findByTestId('net-worth-hero'));
  expect(hero.getByTestId('setup-steps')).toBeTruthy();
  expect(await screen.findByTestId('sphere-empty')).toBeTruthy();
});
