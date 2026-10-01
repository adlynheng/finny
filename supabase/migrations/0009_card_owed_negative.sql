-- A credit card's balance is negative while money is owed, as migration 0006 assumes: spending on
-- the card makes it more negative and a payment in (a transfer from an account) less negative.
-- The account form used to save "Balance owed" as a positive number, so those cards moved the
-- wrong way; this turns every positive card balance into the amount owed it was entered as.
update account
set balance_cents = -balance_cents
where is_liability and balance_cents > 0;

-- The card's "Count toward monthly budget" switch never changed the budget, so it is gone.
alter table card drop column include_in_budget;
