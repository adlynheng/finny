-- Local development data: the design's Overview mock data, so every screen has something to
-- show on the local stack. `supabase db reset` loads it after the migrations (config.toml
-- [db.seed]); `supabase db push` never sends it to the cloud.
--
-- Dates are relative to the day the seed runs, so this month always has transactions and the
-- newest snapshot is always this month's.

-- A local sign-in. Only the local stack has this user; the cloud has its own.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'adlynheng@gmail.com',
  crypt('finny-local', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
);
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111', 'email',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"adlynheng@gmail.com","email_verified":true}',
  now(), now(), now()
);

update settings
set monthly_savings_cents = 395000, monthly_investment_cents = 200000
where id = 1;

-- Balances sum to the newest snapshot below: cash 42,300, CPF 65,170 and investments 78,950
-- (assets 186,420), less 1,240 owed on the card: net worth 185,180.
insert into account (name, type, cpf_type, asset_class_id, balance_cents, is_liability)
select name, type, cpf_type, (select id from asset_class where label = class), cents, liability
from (
  values
    ('DBS Multiplier', 'Savings', null, 'Cash', 2840000, false),
    ('UOB One', 'Savings', null, 'Cash', 1390000, false),
    ('CPF Ordinary', 'CPF', 'OA', 'CPF', 3820000, false),
    ('CPF Special', 'CPF', 'SA', 'CPF', 1897000, false),
    ('CPF MediSave', 'CPF', 'MA', 'CPF', 800000, false),
    ('Interactive Brokers', 'Broker', null, 'Investments', 6245000, false),
    ('Endowus', 'Broker', null, 'Investments', 1650000, false),
    ('DBS Altitude', 'Credit card', null, null, -124000, true)
) as a (name, type, cpf_type, class, cents, liability);

-- Icons are icon-registry keys; Freelance has none of its own, so it shows Other.
insert into category (name, kind, icon)
values
  ('Salary', 'deposit', 'Salary'),
  ('Freelance', 'deposit', null),
  ('Housing', 'expense', 'Housing'),
  ('Groceries', 'expense', 'Groceries'),
  ('Dining', 'expense', 'Food'),
  ('Transport', 'expense', 'Transport'),
  ('Utilities', 'expense', 'Utilities'),
  ('Shopping', 'expense', 'Shopping');

-- This month: 7,862 in and 4,660 out, plus a transfer the month totals leave out.
insert into txn (account_id, date, description, category_id, kind, amount_cents)
select
  (select id from account where name = acct),
  least(date_trunc('month', current_date)::date + day - 1, current_date),
  description,
  (select id from category where name = cat),
  kind,
  cents
from (
  values
    ('DBS Multiplier', 1, 'Salary', 'Salary', 'deposit', 650000),
    ('DBS Multiplier', 12, 'Logo design', 'Freelance', 'deposit', 136200),
    ('DBS Multiplier', 2, 'Rent', 'Housing', 'expense', -250000),
    ('DBS Altitude', 4, 'FairPrice', 'Groceries', 'expense', -18640),
    ('DBS Altitude', 9, 'Cold Storage', 'Groceries', 'expense', -11280),
    ('DBS Altitude', 6, 'Dinner at Burnt Ends', 'Dining', 'expense', -32000),
    ('DBS Altitude', 15, 'Hawker lunches', 'Dining', 'expense', -9580),
    ('DBS Altitude', 3, 'EZ-Link top-up', 'Transport', 'expense', -5000),
    ('DBS Altitude', 18, 'Grab', 'Transport', 'expense', -7400),
    ('UOB One', 5, 'SP Group', 'Utilities', 'expense', -14100),
    ('DBS Altitude', 20, 'Uniqlo', 'Shopping', 'expense', -18000),
    ('DBS Altitude', 22, 'Courts', 'Shopping', 'expense', -100000),
    ('DBS Multiplier', 3, 'Transfer to Interactive Brokers', null, 'transfer', -200000),
    ('Interactive Brokers', 3, 'Transfer from DBS Multiplier', null, 'transfer', 200000)
) as t (acct, day, description, cat, kind, cents);

insert into goal (name, target_amount_cents, current_amount_cents, target_date, src, sort_order)
values
  ('Emergency fund', 2400000, 2100000, (current_date + interval '2 months')::date, 'savings', 1),
  ('Japan trip', 450000, 315000, (current_date + interval '3 months')::date, 'savings', 2),
  ('Home renovation', 3000000, 1840000, (current_date + interval '6 months')::date, 'investment', 3);

-- 24 monthly snapshots ending this month. Each class and the card's balance move from their
-- values two years ago to today's balances with a little wobble in between; the ends are
-- exact. Every snapshot's total is its classes less what is owed.
with months as (
  select
    i,
    (date_trunc('month', current_date) - make_interval(months => 23 - i))::date as date,
    case when i in (0, 23) then 0 else 1 end as wobble
  from generate_series(0, 23) as i
),
amounts as (
  select
    date,
    round((31000 + (42300 - 31000) * i / 23.0 + 1100 * wobble * sin(i * 1.3 + 0.4)) * 100)::bigint as cash,
    round((44500 + (78950 - 44500) * i / 23.0 + 3400 * wobble * sin(i * 0.9 + 1.1)) * 100)::bigint as investments,
    round((49800 + (65170 - 49800) * i / 23.0) * 100)::bigint as cpf,
    round((900 + (1240 - 900) * i / 23.0 + 400 * wobble * abs(sin(i * 1.7))) * 100)::bigint as owed
  from months
),
snapshots as (
  insert into net_worth_snapshot (date, total_cents, liabilities_cents)
  select date, cash + investments + cpf - owed, owed from amounts
  returning id, date
)
insert into net_worth_snapshot_class (snapshot_id, asset_class_id, amount_cents)
select s.id, c.id, case c.label
    when 'Cash' then a.cash
    when 'Investments' then a.investments
    else a.cpf
  end
from snapshots s
join amounts a using (date)
join asset_class c on c.label in ('Cash', 'Investments', 'CPF');
