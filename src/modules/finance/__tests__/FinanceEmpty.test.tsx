import { Platform } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { FinanceScreen } from '../FinanceScreen';
import { categories, settings, TODAY } from '../../../../test/financeFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

/** No limit, no transactions, no charges. */
beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  jest.replaceProperty(Platform, 'OS', 'macos');
  stub.respond('txn', { data: [], error: null });
  stub.respond('settings', { data: settings(0), error: null });
  stub.respond('recurring_charge', { data: [], error: null });
  stub.respond('category', { data: categories, error: null });
  stub.respond('account', { data: [], error: null });
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

const text = (id: string) => screen.getByTestId(id);

it('with no limit set: S$0, no limit set, and a Set limit button', async () => {
  await renderWithClient(<FinanceScreen />);

  expect(await screen.findByTestId('budget-left')).toHaveTextContent('0');
  expect(text('budget-left-label')).toHaveTextContent('no limit set');
  expect(text('budget-month')).toHaveTextContent('Sep 2026');
  expect(text('budget-limit')).toHaveTextContent(
    "Set a monthly limit to track what's safe to spend",
  );
  expect(text('budget-edit')).toHaveTextContent('Set limit');

  await fireEvent.press(text('budget-edit'));
  expect(text('budget-limit-input').props.value).toBe('');
});

it('says what each stat waits for', async () => {
  await renderWithClient(<FinanceScreen />);

  expect(await screen.findByTestId('budget-spent-note')).toHaveTextContent(
    'Nothing logged yet',
  );
  expect(text('budget-daily-note')).toHaveTextContent(
    'Needs a few days of spending',
  );
  expect(text('budget-safe-value')).toHaveTextContent('S$0');
  expect(text('budget-safe-note')).toHaveTextContent('Set a limit first');
});

it('draws the empty dial: a tick a day, the days so far longer, S$0 spent', async () => {
  await renderWithClient(<FinanceScreen />);

  const dial = within(await screen.findByTestId('empty-dial'));
  expect(dial.getAllByTestId('empty-dial-tick-on')).toHaveLength(24);
  expect(dial.getAllByTestId('empty-dial-tick')).toHaveLength(6);
  expect(dial.getByTestId('empty-dial-mark')).toBeTruthy();
  expect(screen.queryByTestId('budget-dial-chart')).toBeNull();
});

it('empties the cash flow, recurring, calendar and transactions cards', async () => {
  await renderWithClient(<FinanceScreen />);

  const flow = within(await screen.findByTestId('flow-card'));
  expect(flow.getByTestId('flow-empty')).toHaveTextContent(
    /Needs income and spending/,
  );
  expect(flow.queryByTestId('flow-view')).toBeNull();

  const rec = within(screen.getByTestId('recurring-empty'));
  expect(rec.getAllByTestId('ghost-row')).toHaveLength(3);
  expect(rec.getByText('No recurring charges')).toBeTruthy();
  expect(rec.getByTestId('recurring-add-first')).toHaveTextContent(
    'Add recurring charge',
  );

  expect(text('payments-due')).toHaveTextContent('Nothing scheduled');

  const tx = within(screen.getByTestId('tx-ledger-empty'));
  expect(tx.getByText('0 transactions')).toBeTruthy();
  expect(tx.getAllByTestId('ghost-row')).toHaveLength(4);
  expect(tx.getByTestId('tx-add-first')).toHaveTextContent(
    'Add your first transaction',
  );
  expect(screen.queryByTestId('tx-view')).toBeNull();
});
