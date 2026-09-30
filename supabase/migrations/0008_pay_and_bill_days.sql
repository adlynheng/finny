-- Days of the month, as numbers the app can put on a calendar and post by. A day past a short
-- month's end falls on its last day, so 31 means the last day of every month.
--
-- income_source.payday was free text ("25th", "Last day of month"): its first number becomes the
-- day, and text without one becomes 31, the last day it meant.
alter table income_source
  alter column payday type smallint using (
    case
      when payday is null then null
      when substring(payday from '\d{1,2}')::int between 1 and 31
        then substring(payday from '\d{1,2}')::smallint
      else 31
    end
  );

alter table income_source
  add constraint income_source_payday_check check (payday between 1 and 31);

-- A credit card's billing cycle: the statement closes on statement_day, and the bill for that
-- cycle is due on bill_due_day, the next time that day comes round. The payments calendar shows
-- each bill on its day with what the cycle spent.
alter table card
  add column statement_day smallint,
  add column bill_due_day smallint,
  add constraint card_statement_day_check check (statement_day between 1 and 31),
  add constraint card_bill_due_day_check check (bill_due_day between 1 and 31);
