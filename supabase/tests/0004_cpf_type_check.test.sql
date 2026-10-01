begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select lives_ok(
  $$insert into account (name, type, cpf_type) values ('CPF Ordinary', 'CPF', 'OA')$$,
  'a CPF account takes OA'
);
select lives_ok(
  $$insert into account (name, type) values ('DBS', 'Savings')$$,
  'a non-CPF account leaves cpf_type null'
);
select lives_ok(
  $$insert into account (name, type, cpf_type) values ('CPF Retirement', 'CPF', 'RA')$$,
  'a CPF account takes RA (migration 0010)'
);
select throws_ok(
  $$insert into account (name, type, cpf_type) values ('CPF Other', 'CPF', 'XA')$$,
  '23514', null,
  'account.cpf_type rejects an unknown value'
);

select * from finish();
rollback;
