import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { FinanceScreen } from '../FinanceScreen';
import { classes } from '../../../../test/classes';
import {
  categories,
  charges,
  september,
  settings,
  TODAY,
} from '../../../../test/financeFixtures';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import { testIDsInOrder } from '../../../../test/sheetCases';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  stub.respond('txn', { data: september, error: null });
  stub.respond('settings', { data: settings(), error: null });
  stub.respond('recurring_charge', { data: charges, error: null });
  stub.respond('category', { data: categories, error: null });
  stub.respond('account', { data: accounts, error: null });
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

const flex = (testID: string) =>
  classes(screen.getByTestId(testID)).filter(c => /^(grow|basis)/.test(c));

describe('on macOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'macos'));

  it('lays out the design’s grid: 5.4fr 1.66fr 2.9fr 4.1fr, the top row 300px', async () => {
    await renderWithClient(<FinanceScreen />);
    await screen.findByTestId('budget-dial');

    // Spanning cells grow by both their columns and start from one gap.
    expect(flex('finance-hero')).toEqual(['grow-[7.06]', 'basis-frame-gap']);
    expect(flex('finance-flow')).toEqual(['grow-[7]', 'basis-frame-gap']);
    expect(flex('finance-tx')).toEqual(['grow-[5.4]', 'basis-0']);
    expect(flex('finance-rec')).toEqual(['grow-[4.56]', 'basis-frame-gap']);
    expect(flex('finance-cal')).toEqual(['grow-[4.1]', 'basis-0']);
    expect(classes(screen.getByTestId('finance-hero').parent!)).toContain(
      'h-finance-row',
    );
  });
});

describe('on iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  it('stacks every card in one column, in the design’s order', async () => {
    await renderWithClient(<FinanceScreen />);
    await screen.findByTestId('budget-dial');

    const order = [
      'budget-summary',
      'budget-dial',
      'budget-stats',
      'flow-card',
      'tx-card',
      'payments-card',
      'recurring-card',
    ];
    expect(
      testIDsInOrder(screen.getByTestId('finance-column')).filter(id =>
        order.includes(id),
      ),
    ).toEqual(order);
    expect(screen.queryByTestId('finance-grid')).toBeNull();
  });

  it('clears the tab bar', async () => {
    await renderWithClient(<FinanceScreen />);
    expect(
      screen.getByTestId('finance-column').props.contentContainerClassName,
    ).toContain('pb-mobile-bottom');
  });
});
