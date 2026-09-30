begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into account (name, type, balance_cents) values ('Test savings', 'Savings', 0);
insert into account (name, type, cpf_type, balance_cents) values ('Test OA', 'CPF', 'OA', 0);
insert into recurring_charge (name, amount_cents, frequency, start_date)
values ('Test charge', 1000, 'monthly', current_date);
insert into income_source (name, type, base_income_cents, frequency, start_date)
values ('Test pay', 'salary', 100000, 'monthly', current_date);

create function test_id(text) returns bigint language sql as
$$ select id from account where name = $1 $$;

insert into txn (account_id, date, description, kind, amount_cents, recurring_id)
select test_id('Test savings'), current_date, 'Test charge', 'expense', -1000, id
from recurring_charge where name = 'Test charge';
select throws_ok(
  $$ insert into txn (account_id, date, description, kind, amount_cents, recurring_id)
     select test_id('Test savings'), current_date, 'Test charge', 'expense', -1000, id
     from recurring_charge where name = 'Test charge' $$,
  '23505', null, 'a charge posts once a date'
);

insert into txn (account_id, date, description, kind, amount_cents, income_id)
select a, current_date, 'Test pay', k, c, (select id from income_source where name = 'Test pay')
from (values (test_id('Test savings'), 'deposit', 80000::bigint), (test_id('Test OA'), 'transfer', 23000::bigint)) as t (a, k, c);
select is(
  (select count(*) from txn where income_id = (select id from income_source where name = 'Test pay')),
  2::bigint,
  'a salary posts once per account on its date'
);
select throws_ok(
  $$ insert into txn (account_id, date, description, kind, amount_cents, income_id)
     select test_id('Test OA'), current_date, 'Test pay', 'transfer', 23000, id
     from income_source where name = 'Test pay' $$,
  '23505', null, 'and not twice into the same account'
);

insert into txn (account_id, date, description, kind, amount_cents)
values (test_id('Test savings'), current_date, 'Lunch', 'expense', -1500),
       (test_id('Test savings'), current_date, 'Lunch', 'expense', -1500);
select is(
  (select count(*) from txn where description = 'Lunch'),
  2::bigint,
  'hand-entered transactions are not limited'
);

select * from finish();
rollback;
