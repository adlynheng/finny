-- Local development data: the design's Overview and Personal Finance mock data, so every screen
-- has something to show on the local stack. It hangs together: recurring charges and the salary
-- source generate their own past transactions, the card's balance is this month's card spend,
-- and every snapshot's liabilities is its month's card spend. `supabase db reset` loads it after
-- the migrations (config.toml [db.seed]); `supabase db push` never sends it to the cloud.
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
set
  monthly_savings_cents = 395000,
  monthly_investment_cents = 200000,
  monthly_expenditure_cents = 350000,
  payday = '25th'
where id = 1;

-- Balances sum to the newest snapshot below: cash 42,300, CPF 65,170 and investments 78,950
-- (assets 186,420). The card's balance is this month's card spend, set once the transactions
-- are in.
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
    ('DBS Altitude', 'Credit card', null, null, 0, true)
) as a (name, type, cpf_type, class, cents, liability);

-- Icons are icon-registry keys; Freelance has none of its own, so it shows Other.
insert into category (name, kind, icon)
values
  ('Salary', 'deposit', 'Salary'),
  ('Freelance', 'deposit', null),
  ('Dividends', 'deposit', 'Dividends'),
  ('Refunds', 'deposit', 'Refunds'),
  ('Bills', 'expense', 'Bills'),
  ('Dining', 'expense', 'Food'),
  ('Groceries', 'expense', 'Groceries'),
  ('Health', 'expense', 'Health'),
  ('Housing', 'expense', 'Housing'),
  ('Insurance', 'expense', 'Insurance'),
  ('Services', 'expense', 'Services'),
  ('Shopping', 'expense', 'Shopping'),
  ('Subscriptions', 'expense', 'Subscriptions'),
  ('Transport', 'expense', 'Transport');

-- The ledger covers the twelve months ending this month; nothing is dated after today.
create temporary table seed_months as
select
  i,
  (date_trunc('month', current_date) - make_interval(months => 11 - i))::date as month
from generate_series(0, 11) as i;

-- The design's recurring charges, anchored in this month (or the next, for the insurance).
insert into recurring_charge (name, category_id, account_id, amount_cents, frequency, start_date)
select
  name,
  (select id from category where name = cat),
  (select id from account where name = acct),
  cents,
  frequency,
  (date_trunc('month', current_date) + make_interval(months => month_offset))::date + day - 1
from (
  values
    ('HDB home loan', 'Housing', 'DBS Multiplier', 114000, 'monthly', 0, 1),
    ('Home cleaner', 'Services', 'DBS Multiplier', 6000, 'weekly', 0, 5),
    ('S&CC town council', 'Bills', 'DBS Multiplier', 7200, 'monthly', 0, 3),
    ('iCloud+', 'Subscriptions', 'UOB One', 398, 'monthly', 0, 12),
    ('SP Group', 'Bills', 'DBS Multiplier', 12455, 'monthly', 0, 20),
    ('Netflix', 'Subscriptions', 'UOB One', 1998, 'monthly', 0, 22),
    ('Spotify', 'Subscriptions', 'UOB One', 1098, 'monthly', 0, 26),
    ('Singtel mobile', 'Bills', 'UOB One', 4500, 'monthly', 0, 28),
    ('Anytime Fitness', 'Health', 'UOB One', 9800, 'monthly', 0, 29),
    ('Great Eastern term life', 'Insurance', 'DBS Multiplier', 18600, 'quarterly', 1, 5),
    ('AIA HealthShield', 'Insurance', 'DBS Multiplier', 62400, 'yearly', 1, 15)
) as r (name, cat, acct, cents, frequency, month_offset, day);

-- Every charge's past payments, on the dates its schedule gives (stepped from the anchor, as the
-- app's recurrence does, so a charge on the 29th pays on the 28th in February).
insert into txn (account_id, date, description, category_id, kind, amount_cents, recurring_id)
select r.account_id, o.date, r.name, r.category_id, 'expense', -r.amount_cents, r.id
from recurring_charge r
cross join lateral (
  select case r.frequency
    when 'weekly' then r.start_date + 7 * n
    when 'monthly' then (r.start_date + make_interval(months => n))::date
    when 'quarterly' then (r.start_date + make_interval(months => 3 * n))::date
    else (r.start_date + make_interval(months => 12 * n))::date
  end as date
  from generate_series(-60, 0) as n
) o
where o.date between (select min(month) from seed_months) and current_date;

-- Salary, paid on the 25th into DBS Multiplier.
insert into income_source (name, employer, type, base_income_cents, frequency, start_date, payday, account_id)
values (
  'Salary', 'Acme Pte Ltd', 'salary', 680000, 'monthly',
  date_trunc('month', current_date)::date + 24, '25th',
  (select id from account where name = 'DBS Multiplier')
);

insert into txn (account_id, date, description, category_id, kind, amount_cents, income_id)
select s.account_id, m.month + 24, 'Salary · Acme Pte Ltd',
  (select id from category where name = 'Salary'), 'deposit', s.base_income_cents, s.id
from income_source s, seed_months m
where m.month + 24 <= current_date;

-- Everyday spending: the same shops each month, each amount swinging with the month, plus a few
-- one-off purchases. Card spend goes on DBS Altitude.
insert into txn (account_id, date, description, category_id, kind, amount_cents)
select
  (select id from account where name = acct),
  m.month + day - 1,
  description,
  (select id from category where name = cat),
  'expense',
  -round(cents * (1 + 0.3 * sin(m.i * k + 0.7)))::bigint
from seed_months m
cross join (
  values
    ('FairPrice Finest', 'Groceries', 'DBS Altitude', 4, 8640, 1.1),
    ('Cold Storage', 'Groceries', 'DBS Altitude', 14, 11285, 0.7),
    ('NTUC FairPrice', 'Groceries', 'DBS Altitude', 24, 9420, 1.9),
    ('Toast Box', 'Dining', 'UOB One', 9, 680, 0.5),
    ('Din Tai Fung', 'Dining', 'DBS Altitude', 18, 7230, 1.3),
    ('Hawker lunches', 'Dining', 'DBS Altitude', 27, 9580, 2.3),
    ('Grab', 'Transport', 'DBS Altitude', 11, 1820, 1.7),
    ('SimplyGo', 'Transport', 'DBS Altitude', 17, 4500, 0.9),
    ('Shopee', 'Shopping', 'DBS Altitude', 13, 3890, 1.5),
    ('Uniqlo', 'Shopping', 'DBS Altitude', 20, 5990, 2.9),
    ('Guardian', 'Health', 'UOB One', 16, 2460, 0.8)
) as t (description, cat, acct, day, cents, k)
where m.month + day - 1 <= current_date;

insert into txn (account_id, date, description, category_id, kind, amount_cents)
select
  (select id from account where name = acct),
  m.month + day - 1,
  description,
  (select id from category where name = cat),
  'expense',
  -cents
from (
  values
    (3, 'IKEA', 'Shopping', 'DBS Altitude', 21, 60000),
    (8, 'Klook', 'Shopping', 'DBS Altitude', 15, 32000),
    (10, 'Zara', 'Shopping', 'DBS Altitude', 16, 8900),
    (11, 'Dinner at Burnt Ends', 'Dining', 'DBS Altitude', 6, 32000),
    (11, 'Courts', 'Shopping', 'DBS Altitude', 22, 45000)
) as t (i, description, cat, acct, day, cents)
join seed_months m using (i)
where m.month + day - 1 <= current_date;

-- Other income: a December bonus, freelance work, the STI ETF's half-yearly dividends and a
-- refund.
insert into txn (account_id, date, description, category_id, kind, amount_cents)
select
  (select id from account where name = acct),
  m.month + day - 1,
  description,
  (select id from category where name = cat),
  'deposit',
  cents
from seed_months m
join (
  values
    (null::int, 12, 'Year-end bonus · Acme Pte Ltd', 'Salary', 'DBS Multiplier', 20, 680000),
    (null, 2, 'STI ETF dividend', 'Dividends', 'Interactive Brokers', 21, 21240),
    (null, 8, 'STI ETF dividend', 'Dividends', 'Interactive Brokers', 21, 21240),
    (1, null, 'Freelance payout', 'Freelance', 'DBS Multiplier', 19, 85000),
    (4, null, 'Freelance payout', 'Freelance', 'DBS Multiplier', 3, 60000),
    (6, null, 'Freelance payout', 'Freelance', 'DBS Multiplier', 19, 42000),
    (7, null, 'Shopee refund', 'Refunds', 'DBS Altitude', 18, 3890),
    (9, null, 'Freelance payout', 'Freelance', 'DBS Multiplier', 3, 60000),
    (11, null, 'Logo design', 'Freelance', 'DBS Multiplier', 12, 136200)
) as t (i, calendar_month, description, cat, acct, day, cents)
  on t.i = m.i or t.calendar_month = extract(month from m.month)
where m.month + day - 1 <= current_date;

-- Transfers, each a pair of rows as the app writes them: the monthly investments (the settings'
-- S$2,000), and on the 15th paying off the card's previous month.
create temporary table seed_transfers as
select m.month + 2 as date, 'DBS Multiplier' as source, 'Interactive Brokers' as dest, 150000::bigint as cents
from seed_months m
union all
select m.month + 9, 'DBS Multiplier', 'Endowus', 50000
from seed_months m
union all
select m.month + 14, 'DBS Multiplier', 'DBS Altitude', (
  select -sum(t.amount_cents)
  from txn t
  where t.account_id = (select id from account where name = 'DBS Altitude')
    and t.kind = 'expense'
    and date_trunc('month', t.date) = m.month - interval '1 month'
)
from seed_months m;

insert into txn (account_id, date, description, category_id, kind, amount_cents)
select (select id from account where name = leg.account), t.date, leg.description, null, 'transfer', leg.cents
from seed_transfers t
cross join lateral (
  values
    (t.source, 'Transfer to ' || t.dest, -t.cents),
    (t.dest, 'Transfer from ' || t.source, t.cents)
) as leg (account, description, cents)
where t.date <= current_date and t.cents > 0;

-- The card owes this month's spend: last month's was paid on the 15th.
update account
set balance_cents = coalesce((
  select sum(amount_cents)
  from txn
  where account_id = account.id
    and kind = 'expense'
    and date >= date_trunc('month', current_date)
), 0)
where name = 'DBS Altitude';

insert into goal (name, target_amount_cents, current_amount_cents, target_date, src, sort_order)
values
  ('Emergency fund', 2400000, 2100000, (current_date + interval '2 months')::date, 'savings', 1),
  ('Japan trip', 450000, 315000, (current_date + interval '3 months')::date, 'savings', 2),
  ('Home renovation', 3000000, 1840000, (current_date + interval '6 months')::date, 'investment', 3);

-- 24 monthly snapshots ending this month. Each class moves from its value two years ago to
-- today's balances with a little wobble in between; the ends are exact. What is owed is that
-- month's card spend (so the newest is the card's balance), and each total is its classes less
-- what is owed.
with months as (
  select
    i,
    (date_trunc('month', current_date) - make_interval(months => 23 - i))::date as date,
    case when i in (0, 23) then 0 else 1 end as wobble
  from generate_series(0, 23) as i
),
card_spend as (
  select date_trunc('month', date)::date as date, -sum(amount_cents) as cents
  from txn
  where account_id = (select id from account where name = 'DBS Altitude') and kind = 'expense'
  group by 1
),
amounts as (
  select
    date,
    round((31000 + (42300 - 31000) * i / 23.0 + 1100 * wobble * sin(i * 1.3 + 0.4)) * 100)::bigint as cash,
    round((44500 + (78950 - 44500) * i / 23.0 + 3400 * wobble * sin(i * 0.9 + 1.1)) * 100)::bigint as investments,
    round((49800 + (65170 - 49800) * i / 23.0) * 100)::bigint as cpf,
    -- Before the ledger starts, about what a month on the card came to.
    coalesce(c.cents, round((900 + 400 * abs(sin(i * 1.7))) * 100)::bigint) as owed
  from months
  left join card_spend c using (date)
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

drop table seed_months, seed_transfers;

-- Trading: the design's holdings, sized to Interactive Brokers' balance. At the stub market
-- data's prices (src/lib/marketData.ts) they are worth about S$59,500 against the account's
-- S$62,450, leaving about S$2,900 of cash uninvested: the monthly S$1,500 transfers in, less
-- the lots bought this past year. Lot dates keep the design's distance from today. ES3 is the
-- SPDR STI ETF whose half-yearly dividends are in the ledger above.
insert into instrument (symbol, name, exchange, currency, kind, sector)
values
  ('VWRA', 'Vanguard FTSE All-World', 'LSE', 'USD', 'ETF', 'Broad market'),
  ('D05', 'DBS Group', 'SGX', 'SGD', 'Stock', 'Financials'),
  ('NVDA', 'NVIDIA', 'NASDAQ', 'USD', 'Stock', 'Tech'),
  ('ES3', 'SPDR STI ETF', 'SGX', 'SGD', 'ETF', 'Broad market'),
  ('C38U', 'CapitaLand Integrated Commercial Trust', 'SGX', 'SGD', 'REIT', 'Real estate'),
  ('AAPL', 'Apple', 'NASDAQ', 'USD', 'Stock', 'Tech'),
  ('MSFT', 'Microsoft', 'NASDAQ', 'USD', 'Stock', 'Tech'),
  ('TSLA', 'Tesla', 'NASDAQ', 'USD', 'Stock', 'Consumer'),
  ('QQQ', 'Invesco QQQ', 'NASDAQ', 'USD', 'ETF', 'Tech'),
  ('AMZN', 'Amazon', 'NASDAQ', 'USD', 'Stock', 'Consumer'),
  ('O39', 'OCBC Bank', 'SGX', 'SGD', 'Stock', 'Financials'),
  ('C6L', 'Singapore Airlines', 'SGX', 'SGD', 'Stock', 'Industrials');

insert into position (instrument_id, account_id)
select i.id, (select id from account where name = 'Interactive Brokers')
from instrument i
where i.symbol in ('VWRA', 'D05', 'NVDA', 'ES3', 'C38U', 'AAPL', 'MSFT', 'TSLA');

-- Prices in the instrument's own currency. NVDA's first lot was 20 before the sale below.
insert into lot (position_id, quantity, cost_per_unit_cents, purchased_at)
select p.id, l.quantity, l.cents, current_date - l.days_ago
from (
  values
    ('VWRA', 50, 10420, 926),
    ('VWRA', 40, 12150, 721),
    ('VWRA', 15, 13815, 98),
    ('D05', 150, 3450, 961),
    ('D05', 50, 4140, 314),
    ('NVDA', 15, 8260, 778),
    ('NVDA', 10, 11890, 520),
    ('ES3', 800, 328, 983),
    ('ES3', 700, 356, 449),
    ('C38U', 1200, 192, 563),
    ('C38U', 800, 206, 219),
    ('AAPL', 12, 16530, 857),
    ('AAPL', 8, 18690, 623),
    ('MSFT', 8, 40200, 386),
    ('TSLA', 6, 24800, 590),
    ('TSLA', 4, 29000, 297)
) as l (symbol, quantity, cents, days_ago)
join instrument i on i.symbol = l.symbol
join position p on p.instrument_id = i.id;

-- Five NVDA sold from the oldest lot, as the Sell form records it: cost basis 5 × US$82.60.
insert into sale (
  instrument_id, account_id, quantity, price_per_unit_cents, proceeds_cents, cost_basis_cents,
  realized_pnl_cents, sold_at
)
select id, (select id from account where name = 'Interactive Brokers'), 5, 16520, 82600, 41300,
  41300, current_date - 72
from instrument
where symbol = 'NVDA';

-- Watched: four symbols not held, and two that are.
insert into watchlist_item (instrument_id, added_at)
select i.id, now() - make_interval(days => w.days_ago)
from (
  values ('NVDA', 60), ('VWRA', 50), ('QQQ', 40), ('AMZN', 30), ('O39', 20), ('C6L', 10)
) as w (symbol, days_ago)
join instrument i on i.symbol = w.symbol;
