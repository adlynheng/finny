begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select hasnt_column('card', 'include_in_budget', 'the budget switch is gone');

insert into account (name, type, is_liability, balance_cents)
values ('Owed card', 'Credit card', true, -50000);
insert into txn (account_id, date, description, kind, amount_cents)
select id, current_date, 'Lunch', 'expense', -2000 from account where name = 'Owed card';
select is(
  (select balance_cents from account where name = 'Owed card'), -52000::bigint,
  'spending on a card makes its balance more negative'
);

insert into txn (account_id, date, description, kind, amount_cents)
select id, current_date, 'Pay card', 'transfer', 52000 from account where name = 'Owed card';
select is(
  (select balance_cents from account where name = 'Owed card'), 0::bigint,
  'a payment in makes it less negative'
);

select * from finish();
rollback;
