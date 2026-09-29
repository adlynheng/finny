/**
 * Personal Finance rows for tests, with today frozen at 2026-09-24 (the
 * design's today). Accounts are overviewFixtures': 1 DBS Multiplier and 2 UOB
 * One (savings), 3 CPF Ordinary, 4 Interactive Brokers, 5 DBS Altitude (card).
 */

export const TODAY = '2026-09-24';

export const categories = [
  { id: 1, name: 'Salary', kind: 'deposit', icon: 'Salary' },
  { id: 2, name: 'Freelance', kind: 'deposit', icon: null },
  { id: 3, name: 'Groceries', kind: 'expense', icon: 'Groceries' },
  { id: 4, name: 'Dining', kind: 'expense', icon: 'Food' },
  { id: 5, name: 'Housing', kind: 'expense', icon: 'Housing' },
  { id: 6, name: 'Subscriptions', kind: 'expense', icon: 'Subscriptions' },
  { id: 7, name: 'Bills', kind: 'expense', icon: 'Bills' },
];

function txn(
  id: number,
  date: string,
  description: string,
  kind: 'expense' | 'deposit' | 'transfer',
  amount_cents: number,
  account_id: number,
  category_id: number | null,
) {
  return {
    id,
    date,
    description,
    kind,
    amount_cents,
    account_id,
    category_id,
    currency: 'SGD',
    recurring_id: null,
    income_id: null,
    created_at: `${date}T00:00:00Z`,
  };
}

/**
 * September to date: S$8,162 in, S$1,366.38 spent, and a transfer's two legs.
 * Newest first, as the query returns them.
 */
export const september = [
  txn(8, '2026-09-24', 'Netflix', 'expense', -1_998, 2, 6),
  txn(7, '2026-09-20', 'Dinner at Burnt Ends', 'expense', -12_000, 5, 4),
  txn(6, '2026-09-12', 'Logo design', 'deposit', 136_200, 1, 2),
  txn(5, '2026-09-04', 'FairPrice Finest', 'expense', -8_640, 5, 3),
  txn(
    4,
    '2026-09-03',
    'Transfer from DBS Multiplier',
    'transfer',
    150_000,
    4,
    null,
  ),
  txn(
    3,
    '2026-09-03',
    'Transfer to Interactive Brokers',
    'transfer',
    -150_000,
    1,
    null,
  ),
  txn(2, '2026-09-01', 'HDB home loan', 'expense', -114_000, 1, 5),
  txn(1, '2026-09-01', 'Salary · Acme Pte Ltd', 'deposit', 680_000, 1, 1),
];

/** August: S$6,800 in and S$3,000 out, a 55.9% savings rate. */
export const august = [
  txn(12, '2026-08-25', 'Salary · Acme Pte Ltd', 'deposit', 680_000, 1, 1),
  txn(11, '2026-08-10', 'IKEA', 'expense', -300_000, 5, 3),
];

export function settings(limitCents = 350_000) {
  return {
    id: 1,
    name: 'Adlyn',
    monthly_expenditure_cents: limitCents,
    monthly_savings_cents: 395_000,
    monthly_investment_cents: 200_000,
  };
}

function charge(
  id: number,
  name: string,
  category_id: number,
  account_id: number,
  amount_cents: number,
  frequency: string,
  start_date: string,
) {
  return {
    id,
    name,
    category_id,
    account_id,
    amount_cents,
    frequency,
    custom_every: null,
    custom_unit: null,
    start_date,
    end_date: null,
    is_active: true,
    last_posted_date: null,
  };
}

/**
 * In September: the loan on the 1st, the cleaner every Saturday (5, 12, 19,
 * 26) and Netflix on the 22nd; the quarterly and yearly insurance fall in
 * October. S$1,534 a month in all.
 */
export const charges = [
  charge(1, 'HDB home loan', 5, 1, 114_000, 'monthly', '2026-09-01'),
  charge(2, 'Home cleaner', 7, 1, 6_000, 'weekly', '2026-09-05'),
  charge(3, 'Great Eastern term life', 7, 1, 18_600, 'quarterly', '2026-10-05'),
  charge(4, 'AIA HealthShield', 7, 1, 62_400, 'yearly', '2026-10-15'),
  charge(5, 'Netflix', 6, 2, 1_998, 'monthly', '2026-09-22'),
];
