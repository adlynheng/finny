import type { IncomeSourceRow, RecurringChargeRow } from '@/types/domain';
import {
  chargePostings,
  incomePostings,
  paydays,
  type IncomeContext,
} from '../posting';

const charge = (
  over: Partial<RecurringChargeRow> = {},
): RecurringChargeRow => ({
  id: 1,
  name: 'Netflix',
  category_id: 6,
  account_id: 2,
  amount_cents: 1_998,
  frequency: 'monthly',
  custom_every: null,
  custom_unit: null,
  start_date: '2026-08-22',
  end_date: null,
  is_active: true,
  last_posted_date: '2026-09-01',
  ...over,
});

const income = (over: Partial<IncomeSourceRow> = {}): IncomeSourceRow => ({
  id: 7,
  name: 'Acme',
  employer: null,
  type: 'salary',
  base_income_cents: 1_000_000,
  frequency: 'monthly',
  custom_every: null,
  custom_unit: null,
  start_date: '2026-01-10',
  payday: 25,
  account_id: 1,
  is_active: true,
  last_posted_date: '2026-08-31',
  ...over,
});

const context: IncomeContext = {
  settings: {
    cpf_employee_rate: 0.2,
    cpf_oa_rate: 0.23,
    cpf_sa_rate: 0.06,
    cpf_ma_rate: 0.08,
  },
  accounts: [
    { id: 1, type: 'Savings', cpf_type: null, is_active: true },
    { id: 3, type: 'CPF', cpf_type: 'OA', is_active: true },
    { id: 4, type: 'CPF', cpf_type: 'SA', is_active: true },
    { id: 5, type: 'CPF', cpf_type: 'MA', is_active: true },
  ],
  categories: [
    { id: 1, name: 'Salary' },
    { id: 2, name: 'Freelance' },
  ],
};

describe('paydays', () => {
  it('each month’s pay day after the last posted, today included', () => {
    expect(paydays(25, '2026-07-25', '2026-09-25')).toEqual([
      '2026-08-25',
      '2026-09-25',
    ]);
  });

  it('a short month pays on its last day', () => {
    expect(paydays(31, '2026-01-31', '2026-03-31')).toEqual([
      '2026-02-28',
      '2026-03-31',
    ]);
    expect(paydays(null, '2026-01-31', '2026-02-28')).toEqual(['2026-02-28']);
  });

  it('nothing once today is posted', () => {
    expect(paydays(25, '2026-09-30', '2026-09-30')).toEqual([]);
  });
});

describe('chargePostings', () => {
  it('an expense on its account for each due date since it last posted', () => {
    expect(chargePostings(charge(), '2026-09-30')).toEqual([
      {
        account_id: 2,
        date: '2026-09-22',
        description: 'Netflix',
        category_id: 6,
        kind: 'expense',
        amount_cents: -1_998,
        recurring_id: 1,
      },
    ]);
  });

  it('catches up on days the app was closed, each on its own date', () => {
    const weekly = charge({ frequency: 'weekly', start_date: '2026-09-05' });
    expect(chargePostings(weekly, '2026-09-30').map(t => t.date)).toEqual([
      '2026-09-05',
      '2026-09-12',
      '2026-09-19',
      '2026-09-26',
    ]);
  });

  it('a charge that has never posted starts today', () => {
    const fresh = charge({ last_posted_date: null });
    expect(chargePostings(fresh, '2026-09-22').map(t => t.date)).toEqual([
      '2026-09-22',
    ]);
    expect(chargePostings(fresh, '2026-09-23')).toEqual([]);
  });

  it('nothing before its first payment, after its end, paused or with no account', () => {
    const later = charge({ start_date: '2026-10-22', last_posted_date: null });
    expect(chargePostings(later, '2026-09-22')).toEqual([]);
    expect(
      chargePostings(charge({ end_date: '2026-09-01' }), '2026-09-30'),
    ).toEqual([]);
    expect(chargePostings(charge({ is_active: false }), '2026-09-30')).toEqual(
      [],
    );
    expect(chargePostings(charge({ account_id: null }), '2026-09-30')).toEqual(
      [],
    );
  });
});

describe('incomePostings', () => {
  it('a salary: take-home to its account, and each CPF account its share of the gross', () => {
    expect(incomePostings(income(), context, '2026-09-30')).toEqual([
      {
        account_id: 1,
        date: '2026-09-25',
        description: 'Salary · Acme',
        category_id: 1,
        kind: 'deposit',
        amount_cents: 800_000,
        income_id: 7,
      },
      ...[
        [3, 230_000],
        [4, 60_000],
        [5, 80_000],
      ].map(([account_id, amount_cents]) => ({
        account_id,
        date: '2026-09-25',
        description: 'CPF contribution · Acme',
        category_id: null,
        kind: 'transfer',
        amount_cents,
        income_id: 7,
      })),
    ]);
  });

  it('skips a CPF account the user does not have', () => {
    const noMa = { ...context, accounts: context.accounts.slice(0, 3) };
    expect(
      incomePostings(income(), noMa, '2026-09-30').map(t => t.account_id),
    ).toEqual([1, 3, 4]);
  });

  it('other streams pay in full, on their schedule, with no CPF', () => {
    const retainer = income({
      type: 'freelance',
      name: 'Studio',
      base_income_cents: 85_000,
      payday: null,
      start_date: '2026-06-15',
    });
    expect(incomePostings(retainer, context, '2026-09-30')).toEqual([
      {
        account_id: 1,
        date: '2026-09-15',
        description: 'Freelance · Studio',
        category_id: 2,
        kind: 'deposit',
        amount_cents: 85_000,
        income_id: 7,
      },
    ]);
    const rent = income({
      type: 'other',
      name: 'Rental income',
      payday: null,
      start_date: '2026-09-01',
    });
    expect(incomePostings(rent, context, '2026-09-30')[0]).toMatchObject({
      description: 'Rental income',
      category_id: null,
    });
  });

  it('nothing before the stream was added, or with no account', () => {
    const added = income({
      start_date: '2026-09-26',
      last_posted_date: '2026-08-31',
    });
    expect(incomePostings(added, context, '2026-09-30')).toEqual([]);
    expect(
      incomePostings(income({ account_id: null }), context, '2026-09-30'),
    ).toEqual([]);
  });
});
