-- account.cpf_type names which CPF account a CPF-type account is. Null for every other account.
alter table account
  add constraint account_cpf_type_check check (cpf_type in ('OA', 'SA', 'MA'));
