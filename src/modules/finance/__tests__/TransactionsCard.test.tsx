import { Platform } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { TransactionsCard } from '../TransactionsCard';
import { categories, september, TODAY } from '../../../../test/financeFixtures';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

// A deposit that names no income stream and has no category: "Other income".
const refund = {
  ...september[0]!,
  id: 9,
  date: '2026-09-18',
  description: 'Tax refund',
  kind: 'deposit',
  amount_cents: 12_000,
  category_id: null,
};

beforeEach(() => {
  stub.reset();
  freezeToday(TODAY);
  jest.replaceProperty(Platform, 'OS', 'macos');
  useUiStore.setState(initialUiState());
  stub.respond('txn', { data: [...september, refund], error: null });
  stub.respond('account', { data: accounts, error: null });
  stub.respond('category', { data: categories, error: null });
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

async function open() {
  await renderWithClient(<TransactionsCard />);
  await screen.findByTestId('tx-row-8');
}

const ids = () =>
  screen
    .queryAllByTestId(/^tx-row-\d+$/)
    .map(r => Number(r.props.testID.slice(7)));
const text = (id: string) => screen.getByTestId(id);

describe('List view', () => {
  it('lists the month newest first, a transfer once', async () => {
    await open();
    expect(ids()).toEqual([8, 7, 9, 6, 5, 3, 2, 1]);
    expect(text('tx-row-3-meta')).toHaveTextContent(
      'Transfer · DBS Multiplier → Interactive Brokers',
    );
    expect(text('tx-row-8-meta')).toHaveTextContent('Subscriptions · UOB One');
  });

  it('signs money out and in, dots money in, and leaves a transfer unsigned', async () => {
    await open();
    expect(text('tx-row-8-amount')).toHaveTextContent('−S$19.98');
    expect(screen.queryByTestId('tx-row-8-in')).toBeNull();
    expect(text('tx-row-1-amount')).toHaveTextContent('+S$6,800.00');
    expect(text('tx-row-1-in')).toBeTruthy();
    expect(text('tx-row-3-amount')).toHaveTextContent('S$1,500.00');
    expect(screen.queryByTestId('tx-row-3-in')).toBeNull();
  });

  it('sums in and out, transfers left out, and counts the rows', async () => {
    await open();
    expect(text('tx-in')).toHaveTextContent('In S$8,282.00');
    expect(text('tx-out')).toHaveTextContent('Out S$1,366.38');
    expect(text('tx-count')).toHaveTextContent('8 items');
  });

  it('composes the filter with the search, and the summary follows', async () => {
    await open();
    await fireEvent.press(text('tx-filter-out'));
    expect(ids()).toEqual([8, 7, 5, 2]);

    await fireEvent.changeText(text('tx-search'), 'dbs');
    expect(ids()).toEqual([7, 5, 2]);
    expect(text('tx-in')).toHaveTextContent('In S$0.00');
    expect(text('tx-out')).toHaveTextContent('Out S$1,346.40');
    expect(text('tx-count')).toHaveTextContent('3 items');
    expect(useUiStore.getState()).toMatchObject({
      transactionsFilter: 'out',
      transactionsSearch: 'dbs',
    });
  });

  it('says so when nothing matches', async () => {
    await open();
    await fireEvent.changeText(text('tx-search'), 'nothing like this');
    expect(ids()).toEqual([]);
    expect(text('tx-empty')).toHaveTextContent('No transactions match.');
  });

  it('steps back two months and re-queries', async () => {
    await open();
    expect(text('tx-month-next').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(text('tx-month-prev'));
    await fireEvent.press(text('tx-month-prev'));
    expect(useUiStore.getState().transactionsMonth).toBe('2026-07');
    expect(text('tx-month-prev').props.accessibilityState.disabled).toBe(true);
    expect(stub.chainsFor('txn')).toContainEqual([
      ['select', '*'],
      ['gte', 'date', '2026-07-01'],
      ['lt', 'date', '2026-08-01'],
      ['order', 'date', { ascending: false }],
      ['order', 'id', { ascending: false }],
    ]);
  });

  it('opens the new transaction form', async () => {
    await open();
    await fireEvent.press(text('tx-add'));
    expect(useUiStore.getState().newTransactionOpen).toBe(true);
  });
});

describe('Categories view', () => {
  beforeEach(() => useUiStore.setState({ transactionsView: 'categories' }));

  async function openCategories() {
    await renderWithClient(<TransactionsCard />);
    await screen.findByTestId('tx-group-expense');
  }

  it('totals spending and income, transfers excluded', async () => {
    await openCategories();
    expect(text('tx-spent')).toHaveTextContent('Spent S$1,366.38');
    expect(text('tx-received')).toHaveTextContent('Received S$8,282.00');
    expect(screen.getByText('Transfers excluded')).toBeTruthy();
  });

  it('groups each side by category, largest first, with counts', async () => {
    await openCategories();
    const spending = within(text('tx-group-expense'));
    expect(spending.getByText('4 categories')).toBeTruthy();
    const labels = spending
      .getAllByRole('button')
      .map(b => b.props.testID.replace('tx-cat-expense-', ''));
    expect(labels).toEqual(['Housing', 'Dining', 'Groceries', 'Subscriptions']);

    const income = within(text('tx-group-deposit'));
    expect(income.getByText('3 categories')).toBeTruthy();
    expect(text('tx-cat-deposit-Salary-amount')).toHaveTextContent(
      '+S$6,800.00',
    );
  });

  it('scales each bar to its group’s largest row', async () => {
    await openCategories();
    expect(text('tx-cat-expense-Housing-bar')).toHaveStyle({ width: '100%' });
    expect(text('tx-cat-deposit-Salary-bar')).toHaveStyle({ width: '100%' });
    const freelance = text('tx-cat-deposit-Freelance-bar').props.style.width;
    expect(parseFloat(freelance)).toBeCloseTo((136_200 / 680_000) * 100);
  });

  it('jumps to the list, filtered to the category', async () => {
    await openCategories();
    await fireEvent.press(text('tx-cat-expense-Dining'));

    expect(useUiStore.getState()).toMatchObject({
      transactionsView: 'list',
      transactionsFilter: 'out',
      transactionsSearch: 'Dining',
    });
    expect(ids()).toEqual([7]);
  });

  it('clears the search for Other income, which is no text in any row', async () => {
    useUiStore.setState({ transactionsSearch: 'old query' });
    await openCategories();
    await fireEvent.press(text('tx-cat-deposit-Other income'));

    expect(useUiStore.getState()).toMatchObject({
      transactionsView: 'list',
      transactionsFilter: 'in',
      transactionsSearch: '',
    });
  });

  it('says so when the month has neither', async () => {
    stub.respond('txn', { data: [], error: null });
    await renderWithClient(<TransactionsCard />);
    expect(await screen.findByTestId('tx-empty')).toHaveTextContent(
      'No spending or income this month.',
    );
  });
});
