import { screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { GoalsCard } from '../GoalsCard';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

function goal(
  id: number,
  name: string,
  src: string,
  target_amount_cents: number,
  current_amount_cents: number,
  target_date: string | null,
) {
  return {
    id,
    name,
    src,
    target_amount_cents,
    current_amount_cents,
    target_date,
    sort_order: id,
  };
}

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  // S$1,500 a month to savings, S$2,000 to investments.
  stub.respond('settings', {
    data: {
      id: 1,
      monthly_savings_cents: 150_000,
      monthly_investment_cents: 200_000,
    },
    error: null,
  });
});

afterEach(resetToday);

it('tracks each goal’s progress, ETA and contribution from its pot', async () => {
  stub.respond('goal', {
    data: [
      goal(1, 'Emergency fund', 'savings', 2_400_000, 2_100_000, '2026-11-30'),
      goal(2, 'Home renovation', 'investment', 3_000_000, 1_840_000, '2027-03-31'),
      goal(3, 'Japan trip', 'savings', 100_000, 120_000, '2026-12-01'),
      goal(4, 'Someday', 'savings', 500_000, 0, null),
    ],
    error: null,
  });
  await renderWithClient(<GoalsCard />);

  expect(await screen.findByTestId('goal-1')).toHaveTextContent(
    'Emergency fund88%S$21,000 / S$24,000Nov 2026 · S$1,500/mo',
  );
  expect(screen.getByTestId('goal-1-fill')).toHaveStyle({ width: '87.5%' });
  expect(screen.getByTestId('goal-2-eta')).toHaveTextContent(
    'Mar 2027 · S$1,933/mo',
  );
  expect(screen.getByTestId('goal-3')).toHaveTextContent(/^Japan trip100%/);
  expect(screen.getByTestId('goal-3-fill')).toHaveStyle({ width: '100%' });
  expect(screen.getByTestId('goal-3-eta')).toHaveTextContent('Reached');
  expect(screen.getByTestId('goal-4-eta')).toHaveTextContent(
    'No contribution',
  );
  expect(screen.getByTestId('goals-summary')).toHaveTextContent(
    '3 active · S$40,600 saved',
  );
});

it('prompts for a first goal rather than showing an empty card', async () => {
  stub.respond('goal', { data: [], error: null });
  await renderWithClient(<GoalsCard />);

  expect(await screen.findByTestId('goals-empty')).toBeTruthy();
  expect(screen.queryByTestId('goals-summary')).toBeNull();
});
