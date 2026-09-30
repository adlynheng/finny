-- The app posts each recurring charge and income payment on its due date (usePostDue). Mac and
-- iPhone can both open on the same morning, so a payment is keyed by what it pays and when:
-- a charge posts once a date, and a salary once a date per account (the take-home to the bank
-- and a contribution to each CPF account). Hand-entered transactions carry neither id, and
-- nulls never clash, so they are not limited.
alter table txn
  add constraint txn_recurring_date_unique unique (recurring_id, date);

alter table txn
  add constraint txn_income_account_date_unique unique (income_id, account_id, date);
