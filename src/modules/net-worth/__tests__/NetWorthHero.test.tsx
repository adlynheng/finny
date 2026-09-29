import { screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { NetWorthHero } from '../NetWorthHero';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

function account(
  id: number,
  balance_cents: number,
  { is_liability = false, is_active = true } = {},
) {
  return {
    id,
    name: `Account ${id}`,
    type: is_liability ? 'Credit card' : 'Savings',
    asset_class_id: null,
    balance_cents,
    is_liability,
    is_active,
  };
}

function snapshot(date: string, total_cents: number) {
  return { date, total_cents, liabilities_cents: 0, classes: [] };
}

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  stub.respond('account', {
    data: [
      account(1, 21_207_000),
      account(2, 6_400_000, { is_liability: true }),
      account(3, 99_900, { is_active: false }),
    ],
    error: null,
  });
});

afterEach(resetToday);

it('shows net worth from the accounts, with the liabilities', async () => {
  stub.respond('net_worth_snapshot', {
    data: [
      snapshot('2026-08-01', 14_000_000),
      snapshot('2026-09-01', 14_807_000),
    ],
    error: null,
  });
  await renderWithClient(<NetWorthHero />);

  expect(await screen.findByTestId('net-worth')).toHaveTextContent('148,070');
  expect(screen.getByTestId('net-worth-liabilities')).toHaveTextContent(
    'Liabilities −S$64.0k',
  );
});

it('compares the last two snapshots in money and against the named month', async () => {
  stub.respond('net_worth_snapshot', {
    data: [
      snapshot('2026-07-01', 13_000_000),
      snapshot('2026-08-01', 14_000_000),
      snapshot('2026-09-01', 14_266_000),
    ],
    error: null,
  });
  await renderWithClient(<NetWorthHero />);

  expect(await screen.findByTestId('net-worth-delta')).toHaveTextContent(
    '+S$2,660',
  );
  expect(screen.getByTestId('net-worth-percent')).toHaveTextContent(
    '1.9% vs August',
  );
});

it('signs a fall', async () => {
  stub.respond('net_worth_snapshot', {
    data: [
      snapshot('2026-08-01', 14_000_000),
      snapshot('2026-09-01', 13_860_000),
    ],
    error: null,
  });
  await renderWithClient(<NetWorthHero />);

  expect(await screen.findByTestId('net-worth-delta')).toHaveTextContent(
    '−S$1,400',
  );
  expect(screen.getByTestId('net-worth-percent')).toHaveTextContent(
    '−1.0% vs August',
  );
});

it.each([
  ['no snapshots', []],
  ['one snapshot', [snapshot('2026-09-01', 14_807_000)]],
])(
  'with %s, shows net worth alone rather than a zero delta',
  async (_, data) => {
    stub.respond('net_worth_snapshot', { data, error: null });
    await renderWithClient(<NetWorthHero />);

    expect(await screen.findByTestId('net-worth')).toHaveTextContent('148,070');
    expect(screen.queryByTestId('net-worth-delta')).toBeNull();
    expect(screen.queryByTestId('net-worth-percent')).toBeNull();
    expect(screen.getByTestId('net-worth-liabilities')).toBeTruthy();
  },
);

it('shows a negative net worth with a minus', async () => {
  stub.respond('account', {
    data: [account(1, 100_000), account(2, 350_000, { is_liability: true })],
    error: null,
  });
  await renderWithClient(<NetWorthHero />);

  expect(await screen.findByTestId('net-worth')).toHaveTextContent('−2,500');
});
