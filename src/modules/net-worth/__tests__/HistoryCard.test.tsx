import { fireEvent, screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { HistoryCard } from '../HistoryCard';
import { assetClasses } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;
const [cash, cpf] = assetClasses;

function snapshot(date: string, total_cents: number) {
  return {
    date,
    total_cents,
    liabilities_cents: 0,
    classes: [
      { amount_cents: total_cents / 2, asset_class: cash },
      { amount_cents: total_cents / 4, asset_class: cpf },
    ],
  };
}

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
});

afterEach(resetToday);

it('shows the change over the range, from its first month to its last', async () => {
  stub.respond('net_worth_snapshot', {
    data: [
      snapshot('2026-07-01', 10_000_000),
      snapshot('2026-08-01', 11_000_000),
      snapshot('2026-09-01', 12_500_000),
    ],
    error: null,
  });
  await renderWithClient(<HistoryCard />);

  expect(await screen.findByTestId('history-change')).toHaveTextContent(
    '+S$25,000',
  );
  expect(screen.getByText('since Jul 2026')).toBeTruthy();
  expect(screen.getByText('Jul 2026')).toBeTruthy();
  expect(screen.getByText('Sep 2026')).toBeTruthy();
  expect(screen.getByTestId('history')).toBeTruthy();
});

it('re-reads the snapshots for a new range, from the store', async () => {
  stub.respond('net_worth_snapshot', {
    data: [snapshot('2026-08-01', 1), snapshot('2026-09-01', 2)],
    error: null,
  });
  await renderWithClient(<HistoryCard />);
  await screen.findByTestId('history-change');

  await fireEvent.press(screen.getByTestId('history-range-6'));

  expect(useUiStore.getState().historyRange).toBe(6);
  await screen.findByTestId('history-change');
  expect(
    stub
      .chainsFor('net_worth_snapshot')
      .map(chain => chain.find(c => c[0] === 'gte')),
  ).toEqual([
    ['gte', 'date', '2024-10-01'],
    ['gte', 'date', '2026-04-01'],
  ]);
});

it.each([
  ['no snapshots', []],
  ['one snapshot', [snapshot('2026-09-01', 12_500_000)]],
])(
  'with %s, is the empty card: the latest figure, no history yet, and no range toggle',
  async (_, data) => {
    stub.respond('net_worth_snapshot', { data, error: null });
    await renderWithClient(<HistoryCard />);

    expect(await screen.findByTestId('history-empty')).toHaveTextContent(
      /Finny takes a snapshot at the end of each month/,
    );
    const card = screen.getByTestId('history-card');
    expect(card).toHaveTextContent(
      new RegExp(data.length ? 'S\\$125,000' : 'S\\$0'),
    );
    expect(card).toHaveTextContent(/no history yet/);
    expect(screen.queryByTestId('history')).toBeNull();
    expect(screen.queryByTestId('history-change')).toBeNull();
    expect(screen.queryByTestId('history-range')).toBeNull();
  },
);
