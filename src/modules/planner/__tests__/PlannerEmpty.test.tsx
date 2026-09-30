import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { PlannerScreen } from '../PlannerScreen';
import { categories } from '../../../../test/financeFixtures';
import { plannerSettings } from '../../../../test/plannerFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

/** No income, charges or goals. */
beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  jest.replaceProperty(Platform, 'OS', 'macos');
  stub.respond('settings', { data: plannerSettings(), error: null });
  stub.respond('income_source', { data: [], error: null });
  stub.respond('recurring_charge', { data: [], error: null });
  stub.respond('category', {
    data: categories.filter(c => c.kind === 'expense'),
    error: null,
  });
  stub.respond('goal', { data: [], error: null });
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

async function open() {
  await renderWithClient(
    <>
      <PlannerScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('plan-left');
}

it('with no income: S$0 to allocate, dashed sliders and the empty dial', async () => {
  await open();

  expect(screen.getByTestId('plan-left')).toHaveTextContent('0');
  expect(screen.getByTestId('plan-sub')).toHaveTextContent(
    /^Enter your gross monthly income/,
  );
  expect(screen.getAllByTestId('plan-ghost-slider')).toHaveLength(3);
  expect(screen.getByTestId('empty-dial')).toBeTruthy();
  expect(screen.queryByTestId('plan-save')).toBeNull();
});

it('Start plan waits for an income, then saves it as a monthly salary', async () => {
  await open();

  const start = screen.getByTestId('plan-start');
  expect(start.props.accessibilityState).toMatchObject({ disabled: true });

  await fireEvent.changeText(screen.getByTestId('plan-income-input'), '9500');
  expect(
    screen.getByTestId('plan-start').props.accessibilityState,
  ).toMatchObject({ disabled: false });
  await fireEvent.press(screen.getByTestId('plan-start'));

  const insert = stub
    .chainsFor('income_source')
    .find(chain => chain[0]?.[0] === 'insert');
  expect(insert?.[0]?.[1]).toMatchObject({
    type: 'salary',
    name: 'Salary',
    base_income_cents: 950_000,
    frequency: 'monthly',
    payday: 31,
    start_date: '2026-09-24',
  });
});

it('with no charges, the commitments card points to Personal Finance', async () => {
  await open();

  expect(screen.getByTestId('commitments-sub')).toHaveTextContent(
    'per month · none yet',
  );
  const empty = within(screen.getByTestId('commitments-empty'));
  expect(empty.getAllByTestId('ghost-row')).toHaveLength(4);
  expect(empty.getByText('Nothing fixed yet')).toBeTruthy();
  expect(empty.getByTestId('commitments-add')).toHaveTextContent(
    'Add in Personal Finance',
  );
});
