begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into account (name, type, balance_cents) values ('Test savings', 'Savings', 100000);
insert into account (name, type, balance_cents) values ('Test other', 'Savings', null);
insert into account (name, type, balance_cents, is_liability)
values ('Test card', 'Credit card', -5000, true);

create function test_balance(text) returns bigint language sql as
$$ select balance_cents from account where name = $1 $$;

insert into txn (account_id, date, description, kind, amount_cents)
select id, current_date, 'Lunch', 'expense', -1500 from account where name = 'Test savings';
select is(test_balance('Test savings'), 98500::bigint, 'an expense takes money off');

insert into txn (account_id, date, description, kind, amount_cents)
select id, current_date, 'Refund', 'deposit', 2500 from account where name = 'Test other';
select is(test_balance('Test other'), 2500::bigint, 'a deposit onto a null balance starts it from zero');

insert into txn (account_id, date, description, kind, amount_cents)
select id, current_date, 'Dinner', 'expense', -3000 from account where name = 'Test card';
select is(test_balance('Test card'), -8000::bigint, 'spending on a card grows what is owed');

insert into txn (account_id, date, description, kind, amount_cents)
select a.id, current_date, t.d, 'transfer', t.c
from (values ('Test savings', 'Pay card', -8000::bigint), ('Test card', 'Payment', 8000::bigint)) as t (n, d, c)
join account a on a.name = t.n;
select is(test_balance('Test savings'), 90500::bigint, 'a transfer takes money from its source');
select is(test_balance('Test card'), 0::bigint, 'and puts it on its destination');

update txn set amount_cents = -2000
where description = 'Lunch' and account_id = (select id from account where name = 'Test savings');
select is(test_balance('Test savings'), 90000::bigint, 'changing an amount moves the difference');

update txn set account_id = (select id from account where name = 'Test other')
where description = 'Lunch' and account_id = (select id from account where name = 'Test savings');
select results_eq(
  $$ select balance_cents from account where name in ('Test savings', 'Test other') order by name $$,
  $$ values (500::bigint), (92000::bigint) $$,
  'moving a row to another account moves its amount with it'
);

delete from txn where description = 'Lunch'
  and account_id = (select id from account where name = 'Test other');
select is(test_balance('Test other'), 2500::bigint, 'deleting a row puts its amount back');

select * from finish();
rollback;
