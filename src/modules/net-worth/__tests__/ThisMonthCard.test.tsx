import { fireEvent, screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { ThisMonthCard } from '../ThisMonthCard';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

function txn(kind: string, amount_cents: number) {
  return {
    date: '2026-09-10',
    kind,
    amount_cents,
    category_id: null,
    description: '',
  };
}

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
});

afterEach(resetToday);

it('shows this month’s money in and out, leaving transfers out', async () => {
  stub.respond('txn', {
    data: [
      txn('deposit', 786_200),
      txn('expense', -466_000),
      txn('transfer', -150_000),
      txn('transfer', 150_000),
    ],
    error: null,
  });
  await renderWithClient(<ThisMonthCard />);

  expect(await screen.findByTestId('month-in')).toHaveTextContent('S$7,862');
  expect(screen.getByTestId('month-out')).toHaveTextContent('S$4,660');
  expect(screen.getByText('Sep 2026 · transfers excluded')).toBeTruthy();
  expect(screen.getByTestId('month-spent')).toHaveTextContent(
    '59% of income spent',
  );
  expect(screen.getByTestId('month-net')).toHaveTextContent('Net +S$3,202');
  expect(screen.getByTestId('month-bar')).toHaveStyle({
    width: `${(466_000 / 786_200) * 100}%`,
  });
  expect(stub.chainsFor('txn')[0]).toEqual(
    expect.arrayContaining([
      ['gte', 'date', '2026-09-01'],
      ['lt', 'date', '2026-10-01'],
    ]),
  );
});

it('fills the bar when spending outruns income', async () => {
  stub.respond('txn', {
    data: [txn('deposit', 100_000), txn('expense', -150_000)],
    error: null,
  });
  await renderWithClient(<ThisMonthCard />);

  expect(await screen.findByTestId('month-spent')).toHaveTextContent(
    '150% of income spent',
  );
  expect(screen.getByTestId('month-bar')).toHaveStyle({ width: '100%' });
});

it('with no income, fills the bar rather than dividing by zero', async () => {
  stub.respond('txn', { data: [txn('expense', -12_000)], error: null });
  await renderWithClient(<ThisMonthCard />);

  expect(await screen.findByTestId('month-out')).toHaveTextContent('S$120');
  expect(screen.getByTestId('month-bar')).toHaveStyle({ width: '100%' });
  expect(screen.getByTestId('month-spent')).toHaveTextContent('No income yet');
  expect(screen.getByTestId('month-net')).toHaveTextContent('Net −S$120');
});

it('opens the new-transaction form', async () => {
  stub.respond('txn', { data: [], error: null });
  await renderWithClient(<ThisMonthCard />);

  await fireEvent.press(await screen.findByTestId('month-add'));
  expect(useUiStore.getState().newTransactionOpen).toBe(true);
});
