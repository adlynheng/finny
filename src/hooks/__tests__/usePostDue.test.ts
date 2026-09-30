import { supabase } from '@/lib/supabase';
import { postDue } from '../usePostDue';
import type { SupabaseStub } from '../../../test/supabaseStub';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;
const ok = (data: unknown) => ({ data, error: null });

const netflix = {
  id: 5,
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
};
const salary = {
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
  last_posted_date: '2026-09-01',
};

beforeEach(() => {
  stub.reset();
  stub.respond('recurring_charge', ok([netflix]));
  stub.respond('income_source', ok([salary]));
  stub.respond(
    'account',
    ok([{ id: 3, type: 'CPF', cpf_type: 'OA', is_active: true }]),
  );
  stub.respond(
    'settings',
    ok({
      cpf_employee_rate: 0.2,
      cpf_oa_rate: 0.23,
      cpf_sa_rate: 0.06,
      cpf_ma_rate: 0.08,
    }),
  );
  stub.respond('category', ok([{ id: 1, name: 'Salary' }]));
});

const upserts = () =>
  stub
    .chainsFor('txn')
    .map(chain => chain[0] as [string, { date: string }[], object]);

it('posts what fell due, skipping any already posted, then marks both posted through today', async () => {
  expect(await postDue('2026-09-30')).toBe(true);

  const [charges, incomes] = upserts();
  expect(charges![1].map(t => t.date)).toEqual(['2026-09-22']);
  expect(charges![2]).toEqual({
    onConflict: 'recurring_id,date',
    ignoreDuplicates: true,
  });
  expect(incomes![1]).toHaveLength(2);
  expect(incomes![2]).toEqual({
    onConflict: 'income_id,account_id,date',
    ignoreDuplicates: true,
  });

  for (const [table, id] of [
    ['recurring_charge', 5],
    ['income_source', 7],
  ] as const) {
    expect(stub.chainsFor(table)).toContainEqual([
      ['update', { last_posted_date: '2026-09-30' }],
      ['in', 'id', [id]],
    ]);
  }
});

it('does nothing on a second run the same day', async () => {
  stub.respond(
    'recurring_charge',
    ok([{ ...netflix, last_posted_date: '2026-09-30' }]),
  );
  stub.respond(
    'income_source',
    ok([{ ...salary, last_posted_date: '2026-09-30' }]),
  );

  expect(await postDue('2026-09-30')).toBe(false);
  expect(upserts()).toEqual([]);
  expect(stub.chainsFor('recurring_charge')).toHaveLength(1);
});

it('leaves a row with no account unposted, so it starts once one is picked', async () => {
  stub.respond(
    'income_source',
    ok([{ ...salary, account_id: null, last_posted_date: null }]),
  );
  stub.respond('recurring_charge', ok([]));

  expect(await postDue('2026-09-25')).toBe(false);
  expect(stub.chainsFor('income_source')).toHaveLength(1);
});
