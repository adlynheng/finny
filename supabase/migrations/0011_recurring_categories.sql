-- Recurring-charge categories are expense categories marked for the recurring-charge form, so a
-- posted charge still counts as spending under its category. Settings lists them in their own
-- panel. The form's old fixed list starts out marked.
alter table category
  add column is_recurring boolean not null default false;

update category
set is_recurring = true
where kind = 'expense'
  and name in ('Subscriptions', 'Bills', 'Insurance', 'Housing', 'Health', 'Services', 'Other');
