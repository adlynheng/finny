-- Transactions move their account's balance. account.balance_cents stays the source of truth
-- (history before Finny does not add up to it), and from here on each transaction row adds its
-- signed amount: an expense takes money off, a deposit puts it on, and each leg of a transfer
-- moves its own account. On a credit card, where the balance is negative while money is owed,
-- spending grows what is owed and a payment in shrinks it.
--
-- Deleting a row takes its amount back off, and changing a row's amount or account moves the
-- difference. Rows written before this migration are left as they were: only changes from now on
-- move a balance.
create function txn_apply_to_balance()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.account_id is not null then
    update account
    set balance_cents = coalesce(balance_cents, 0) - old.amount_cents
    where id = old.account_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.account_id is not null then
    update account
    set balance_cents = coalesce(balance_cents, 0) + new.amount_cents
    where id = new.account_id;
  end if;
  return null;
end;
$$;

create trigger txn_balance
after insert or delete or update of account_id, amount_cents on txn
for each row execute function txn_apply_to_balance();
