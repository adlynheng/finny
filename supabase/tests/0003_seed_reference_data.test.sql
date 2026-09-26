begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select results_eq(
  $$select label from asset_class order by id$$,
  $$values ('Cash'), ('CPF'), ('Investments'), ('Property'), ('Other')$$,
  'the five asset classes are seeded in display order'
);

select is((select count(*)::int from settings), 1, 'exactly one settings row');

select row_eq(
  $$select id, cpf_employee_rate, cpf_employer_rate, cpf_oa_rate, cpf_sa_rate, cpf_ma_rate from settings$$,
  row(1, 0.20::double precision, 0.17::double precision, 0.23::double precision,
      0.06::double precision, 0.08::double precision),
  'the settings row carries the Singapore CPF defaults'
);

select is((select base_currency from settings), 'SGD', 'base currency defaults to SGD');

select * from finish();
rollback;
