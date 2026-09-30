/**
 * The Settings page's rows, after the design's mock data (FinnySettings2.dc.html).
 * Accounts, categories and September's transactions are the Overview and
 * Personal Finance fixtures': 1 DBS Multiplier, 2 UOB One, 3 CPF Ordinary,
 * 4 Interactive Brokers, 5 DBS Altitude (card).
 */
import type { CardRow } from '@/types/domain';
import { accounts, assetClasses } from './overviewFixtures';
import { categories, september } from './financeFixtures';
import { incomeSources as plannerIncome } from './plannerFixtures';
import type { SupabaseStub } from './supabaseStub';

function card(
  id: number,
  fields: Partial<CardRow> & Pick<CardRow, 'bank' | 'color_theme'>,
): CardRow {
  return {
    id,
    account_id: 5,
    product_name: 'Visa Signature',
    network: 'VISA',
    last4: String(4820 + id),
    card_type: 'credit',
    credit_limit_cents: null,
    statement_date: null,
    rewards_program: null,
    rewards_earned_display: null,
    include_in_budget: true,
    ...fields,
  };
}

/** The design's three cards, in its order. */
export const cards: CardRow[] = [
  card(1, {
    bank: 'DBS Altitude',
    last4: '4821',
    credit_limit_cents: 1_200_000,
    statement_date: '18 Oct',
    rewards_program: '1.3 mpd local · 2.2 mpd overseas',
    rewards_earned_display: '2,570 mi',
    color_theme: 'Green',
  }),
  card(2, {
    bank: 'UOB One',
    product_name: 'Mastercard',
    network: 'mastercard',
    last4: '7390',
    credit_limit_cents: 800_000,
    statement_date: '3 Oct',
    rewards_program: 'Up to 10% cashback on groceries & transport',
    rewards_earned_display: 'S$18.40',
    color_theme: 'Bronze',
  }),
  card(3, {
    bank: 'DBS Multiplier',
    product_name: 'Visa Debit',
    last4: '0157',
    card_type: 'debit',
    account_id: 1,
    statement_date: 'Salary account',
    rewards_program: '3.1% p.a. bonus interest with salary credit',
    rewards_earned_display: 'S$72.60',
    color_theme: 'Slate',
    include_in_budget: false,
  }),
];

/** One card on each of the six themes. */
export const themedCards: CardRow[] = (
  ['Green', 'Bronze', 'Slate', 'Mist', 'Lagoon', 'Dusk'] as const
).map((theme, i) => card(i + 1, { bank: `${theme} Bank`, color_theme: theme }));

export const settingsRow = {
  id: 1,
  name: 'Wei Ling Tan',
  email: 'weiling.tan@gmail.com',
  base_currency: 'SGD',
  cpf_employee_rate: 0.2,
  cpf_employer_rate: 0.17,
};

/** The salary, a monthly freelance retainer and a six-monthly rental share. */
export const incomes = [
  plannerIncome[0]!,
  {
    ...plannerIncome[0]!,
    id: 2,
    name: 'Design retainer',
    type: 'freelance',
    base_income_cents: 85_000,
    payday: null,
  },
  {
    ...plannerIncome[0]!,
    id: 3,
    name: 'Condo rental share',
    type: 'other',
    base_income_cents: 360_000,
    frequency: 'custom',
    custom_every: 6,
    custom_unit: 'months',
    payday: null,
  },
];

/** Every table the Settings page reads, answered with the rows above. */
export function respondSettings(
  stub: SupabaseStub,
  data: { cards?: CardRow[] } = {},
) {
  stub.respond('card', { data: data.cards ?? cards, error: null });
  stub.respond('settings', { data: settingsRow, error: null });
  stub.respond('account', { data: accounts, error: null });
  stub.respond('asset_class', { data: assetClasses, error: null });
  stub.respond('category', { data: categories, error: null });
  stub.respond('txn', { data: september, error: null });
  stub.respond('income_source', { data: incomes, error: null });
}
