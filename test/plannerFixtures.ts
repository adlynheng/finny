/**
 * Goals & Planner rows for tests, with today frozen at 2026-09-24 and the
 * charges and categories from financeFixtures (S$1,533.98 a month). Gross is
 * the S$12,000 salary, so CPF at 20% takes S$2,400 and the saved plan
 * (S$2,000 + S$2,000 + S$3,500) leaves S$566 to allocate.
 */

import type { SupabaseStub } from './supabaseStub';
import { categories, charges } from './financeFixtures';

export function plannerSettings(
  plan: { investment?: number; savings?: number; expenditure?: number } = {},
) {
  return {
    id: 1,
    name: 'Adlyn',
    monthly_investment_cents: plan.investment ?? 200_000,
    monthly_savings_cents: plan.savings ?? 200_000,
    monthly_expenditure_cents: plan.expenditure ?? 350_000,
    cpf_employee_rate: 0.2,
  };
}

export const incomeSources = [
  {
    id: 1,
    name: 'Salary',
    employer: 'Acme Pte Ltd',
    type: 'salary',
    base_income_cents: 1_200_000,
    frequency: 'monthly',
    custom_every: null,
    custom_unit: null,
    start_date: '2026-09-25',
    payday: 25,
    account_id: 1,
    is_active: true,
    last_posted_date: null,
  },
];

function goal(
  id: number,
  name: string,
  target: number,
  saved: number,
  target_date: string | null,
  src: 'savings' | 'investment',
) {
  return {
    id,
    name,
    target_amount_cents: target,
    current_amount_cents: saved,
    target_date,
    src,
    sort_order: id,
  };
}

/**
 * Against the saved plan: the emergency fund needs S$1,500 a month (75% of
 * savings), the trip S$450 (22.5%), and the renovation S$1,933.33 (96.7% of
 * investments). All three on track.
 */
export const goals = [
  goal(1, 'Emergency fund', 2_400_000, 2_100_000, '2026-11-24', 'savings'),
  goal(2, 'Japan trip', 450_000, 315_000, '2026-12-24', 'savings'),
  goal(3, 'Home renovation', 3_000_000, 1_840_000, '2027-03-24', 'investment'),
];

export function respondPlanner(
  stub: SupabaseStub,
  { settings = plannerSettings(), goalRows = goals } = {},
) {
  stub.respond('settings', { data: settings, error: null });
  stub.respond('income_source', { data: incomeSources, error: null });
  stub.respond('recurring_charge', { data: charges, error: null });
  stub.respond('category', {
    data: categories.filter(c => c.kind === 'expense'),
    error: null,
  });
  stub.respond('goal', { data: goalRows, error: null });
}
