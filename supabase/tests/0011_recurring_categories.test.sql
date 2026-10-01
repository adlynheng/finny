begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

select col_default_is('category', 'is_recurring', 'false', 'a new category is not recurring');
select lives_ok(
  $$insert into category (name, kind, is_recurring) values ('Gym', 'expense', true)$$,
  'an expense category can be marked recurring'
);

select * from finish();
rollback;
