-- Reference data every screen assumes exists. Both inserts skip rows that are already there,
-- so re-running this against a database in use never overwrites Adlyn's edits.

-- Asset classes, in display order (ids follow insert order). Cash, CPF and Investments come from
-- the Overview sphere's breakdown; Property from reconciliation item 8. Other is the fallback
-- bucket for accounts with no class, so the sphere never silently drops a balance.
insert into asset_class (label)
values ('Cash'), ('CPF'), ('Investments'), ('Property'), ('Other')
on conflict (label) do nothing;

-- The singleton settings row. CPF rates are the Singapore defaults: employee 20%, employer 17%,
-- and the 37% total split OA 23% / SA 6% / MA 8%. The name is a placeholder until it is edited in
-- Settings.
insert into settings (
  id, name, cpf_employee_rate, cpf_employer_rate, cpf_oa_rate, cpf_sa_rate, cpf_ma_rate
)
values (1, 'Adlyn', 0.20, 0.17, 0.23, 0.06, 0.08)
on conflict (id) do nothing;
