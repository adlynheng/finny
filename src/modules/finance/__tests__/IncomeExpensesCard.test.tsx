import { Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { CashflowArea } from '@/components/charts/CashflowArea';
import { StrandsFlow } from '@/components/charts/StrandsFlow';
import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { IncomeExpensesCard } from '../IncomeExpensesCard';
import { august, september, TODAY } from '../../../../test/financeFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

// The charts are their own tests'; here, only what they are given.
jest.mock('@/components/charts/CashflowArea', () => ({
  CashflowArea: jest.fn(() => null),
}));
jest.mock('@/components/charts/StrandsFlow', () => ({
  StrandsFlow: jest.fn(() => null),
}));

const stub = supabase as unknown as SupabaseStub;
const area = () => jest.mocked(CashflowArea).mock.lastCall![0];

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  jest.replaceProperty(Platform, 'OS', 'macos');
  useUiStore.setState(initialUiState());
  stub.respond('txn', { data: [...september, ...august], error: null });
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

describe('Savings view', () => {
  it('shows this month’s savings rate against last month’s', async () => {
    await renderWithClient(<IncomeExpensesCard />);

    // (8,162 − 1,366.38) / 8,162 this month; (6,800 − 3,000) / 6,800 in August.
    expect(await screen.findByTestId('flow-rate')).toHaveTextContent('83.3%');
    expect(screen.getByTestId('flow-rate-vs')).toHaveTextContent(
      '+27.4 pts vs August',
    );
    expect(jest.mocked(StrandsFlow).mock.lastCall![0].rate).toBeCloseTo(
      679_562 / 816_200,
    );
  });

  it('shows income, expenses and net cash flow in its tiles, transfers left out', async () => {
    await renderWithClient(<IncomeExpensesCard />);

    expect(await screen.findByTestId('flow-income-value')).toHaveTextContent(
      'S$8,162',
    );
    expect(screen.getByTestId('flow-expenses-value')).toHaveTextContent(
      'S$1,366',
    );
    expect(screen.getByTestId('flow-net-value')).toHaveTextContent('+S$6,796');
  });

  it('shows a fall in the rate with a minus', async () => {
    // August's salary alone: a 100% rate.
    stub.respond('txn', { data: [...september, august[0]], error: null });
    await renderWithClient(<IncomeExpensesCard />);

    expect(await screen.findByTestId('flow-rate-vs')).toHaveTextContent(
      '−16.7 pts vs August',
    );
  });

  it('shows the month and no range toggle', async () => {
    await renderWithClient(<IncomeExpensesCard />);
    await screen.findByTestId('flow-rate');

    expect(screen.getByText('Sep 2026')).toBeTruthy();
    expect(screen.queryByTestId('flow-range')).toBeNull();
  });
});

describe('Cash flow view', () => {
  beforeEach(() => useUiStore.setState({ cashFlowView: 'cashflow' }));

  it('charts twelve months to this one, headlining this one', async () => {
    await renderWithClient(<IncomeExpensesCard />);

    expect(await screen.findByTestId('flow-month')).toHaveTextContent(
      'Net cash flow · Sep 2026',
    );
    expect(screen.getByTestId('flow-month-net')).toHaveTextContent('+S$6,796');
    expect(area().labels).toEqual([
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
    ]);
    expect(area().income.slice(-2)).toEqual([680_000, 816_200]);
    expect(area().expense.slice(-2)).toEqual([300_000, 136_638]);
    expect(area().max).toBeCloseTo(816_200 * 1.07);
  });

  it('switches to six months', async () => {
    await renderWithClient(<IncomeExpensesCard />);
    await fireEvent.press(await screen.findByTestId('flow-range-6'));

    expect(area().labels).toEqual(['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']);
  });

  it('headlines the hovered month, and this one again when the pointer leaves', async () => {
    await renderWithClient(<IncomeExpensesCard />);
    await screen.findByTestId('flow-month');

    await act(() => area().onHover!(10));
    expect(screen.getByTestId('flow-month')).toHaveTextContent(
      'Net cash flow · Aug 2026',
    );
    expect(screen.getByTestId('flow-month-net')).toHaveTextContent('+S$3,800');
    expect(screen.getByText('In S$6,800')).toBeTruthy();
    expect(screen.getByText('Out S$3,000')).toBeTruthy();

    await act(() => area().onHover!(null));
    expect(screen.getByTestId('flow-month')).toHaveTextContent(
      'Net cash flow · Sep 2026',
    );
  });

  it('keeps the view in the UI store', async () => {
    await renderWithClient(<IncomeExpensesCard />);
    await fireEvent.press(await screen.findByTestId('flow-view-savings'));

    expect(useUiStore.getState().cashFlowView).toBe('savings');
    expect(await screen.findByTestId('flow-rate')).toBeTruthy();
  });
});
