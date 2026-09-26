begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

select is(
  (select count(*)::int from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'),
  16,
  'public has exactly 16 tables'
);

select tables_are('public', array[
  'settings', 'asset_class', 'account', 'card', 'category', 'goal', 'instrument',
  'recurring_charge', 'income_source', 'txn', 'position', 'lot', 'sale',
  'net_worth_snapshot', 'net_worth_snapshot_class', 'watchlist_item'
]);

-- settings is a singleton
insert into settings (name) values ('Adlyn');
select throws_ok(
  $$insert into settings (id, name) values (2, 'Second')$$,
  '23514', null,
  'a second settings row fails the check constraint'
);

select has_column('public', 'income_source', 'payday', 'income_source carries its own payday');
select has_column('public', 'settings', 'payday', 'settings keeps the headline payday');

-- enumerated text columns reject typos
insert into asset_class (label) values ('Cash');
insert into account (name, type) values ('DBS', 'Savings');

select throws_ok(
  $$insert into card (account_id, bank, product_name, card_type)
    values ((select id from account limit 1), 'DBS', 'Altitude', 'Credit')$$,
  '23514', null, 'card.card_type rejects an unknown value'
);
select throws_ok(
  $$insert into category (name, kind) values ('Food', 'expenses')$$,
  '23514', null, 'category.kind rejects an unknown value'
);
select throws_ok(
  $$insert into goal (name, target_amount_cents, src) values ('House', 100, 'saving')$$,
  '23514', null, 'goal.src rejects an unknown value'
);
select throws_ok(
  $$insert into txn (date, description, kind, amount_cents) values ('2026-09-26', 'x', 'income', 100)$$,
  '23514', null, 'txn.kind rejects an unknown value'
);
select throws_ok(
  $$insert into recurring_charge (name, amount_cents, frequency, start_date)
    values ('Netflix', 1598, 'monthy', '2026-09-01')$$,
  '23514', null, 'recurring_charge.frequency rejects an unknown value'
);
select throws_ok(
  $$insert into recurring_charge (name, amount_cents, frequency, custom_every, custom_unit, start_date)
    values ('Haircut', 3000, 'custom', 6, 'fortnights', '2026-09-01')$$,
  '23514', null, 'recurring_charge.custom_unit rejects an unknown value'
);
select throws_ok(
  $$insert into income_source (name, type, base_income_cents, frequency, start_date)
    values ('Job', 'wages', 500000, 'monthly', '2026-09-01')$$,
  '23514', null, 'income_source.type rejects an unknown value'
);
select throws_ok(
  $$insert into income_source (name, type, base_income_cents, frequency, start_date)
    values ('Job', 'salary', 500000, 'fortnightly', '2026-09-01')$$,
  '23514', null, 'income_source.frequency rejects an unknown value'
);
select throws_ok(
  $$insert into income_source (name, type, base_income_cents, frequency, custom_every, custom_unit, start_date)
    values ('Job', 'salary', 500000, 'custom', 2, 'fortnights', '2026-09-01')$$,
  '23514', null, 'income_source.custom_unit rejects an unknown value'
);
select lives_ok(
  $$insert into txn (date, description, kind, amount_cents) values ('2026-09-26', 'Lunch', 'expense', -1250)$$,
  'a valid txn inserts'
);

select has_index('public', 'txn', 'idx_txn_account_date', array['account_id', 'date']);
select has_index('public', 'txn', 'idx_txn_date', array['date']);
select has_index('public', 'lot', 'idx_lot_position', array['position_id']);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity),
  0,
  'no table has row level security enabled'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'),
  0,
  'anon has no privileges on any public table'
);

select ok(
  has_table_privilege('authenticated', 'public.txn', 'select, insert, update, delete'),
  'authenticated can read and write txn'
);

select * from finish();
rollback;
