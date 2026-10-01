-- A CPF account can also be the Retirement Account. Salary contributions go to OA, SA and MA only.
alter table account
  drop constraint account_cpf_type_check,
  add constraint account_cpf_type_check check (cpf_type in ('OA', 'SA', 'MA', 'RA'));
