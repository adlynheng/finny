begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select col_type_is('income_source', 'payday', 'smallint', 'a pay day is a day of the month');
select col_type_is('card', 'statement_day', 'smallint', 'a card has a statement day');
select col_type_is('card', 'bill_due_day', 'smallint', 'and a bill due day');

select throws_ok(
  $$ insert into income_source (name, type, base_income_cents, frequency, start_date, payday)
     values ('Test pay', 'salary', 100000, 'monthly', current_date, 32) $$,
  '23514', null, 'a pay day is 1 to 31'
);

insert into account (name, type) values ('Test card', 'Credit card');
select throws_ok(
  $$ insert into card (account_id, bank, product_name, card_type, bill_due_day)
     select id, 'Test', 'Credit', 'credit', 0 from account where name = 'Test card' $$,
  '23514', null, 'so is a bill day'
);

select * from finish();
rollback;
