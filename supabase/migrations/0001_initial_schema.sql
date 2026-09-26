-- Finny initial schema: the 16 tables of docs/superpowers/specs/2026-09-25-db-schema-design.md,
-- translated from SQLite by the rules in the architecture spec §5:
--   autoincrement integer keys  -> bigint generated always as identity
--   text dates                  -> date
--   text timestamps             -> timestamptz default now()
--   real                        -> double precision
--   integer booleans            -> boolean
--   money                       -> integer cents as bigint
--
-- Single user: no user_id column and no Row Level Security on any table.
--
-- Deliberately absent — do not re-add:
--   Tables removed from the original finny.db (9): profile (merged into settings), budget,
--   ai_recommendation, fx_rate, quote, price_history, ai_thread, ai_message, net_worth_annotation.
--   Derived columns, computed in src/utils/derive/ rather than stored:
--     goal.share                      from target, saved and target date against the pot
--     position.quantity               sum of the position's open lots
--     position.avg_cost_cents         from the position's open lots
--     position.opened_at              min(lot.purchased_at)
--   Columns traced to the superseded v1 Settings design or moved elsewhere:
--     goal.color, card.expiry, card.sync_enabled,
--     recurring_charge.icon (the icon lives on category).

create table settings (
  id integer primary key default 1,
  name text not null,
  email text,
  -- Headline pay date; each salary stream also carries its own (income_source.payday).
  payday text,
  base_currency text not null default 'SGD',
  monthly_investment_cents bigint not null default 0,
  monthly_savings_cents bigint not null default 0,
  monthly_expenditure_cents bigint not null default 0,
  cpf_employee_rate double precision not null default 0.20,
  cpf_employer_rate double precision not null default 0.17,
  -- No editor in the v2 design; they attribute CPF contributions to the OA, SA and MA accounts.
  cpf_oa_rate double precision not null default 0.23,
  cpf_sa_rate double precision not null default 0.06,
  cpf_ma_rate double precision not null default 0.08,
  constraint settings_singleton check (id = 1)
);

create table asset_class (
  id bigint generated always as identity primary key,
  label text not null,
  color text,
  constraint asset_class_label_unique unique (label)
);

create table account (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null,
  cpf_type text,
  asset_class_id bigint references asset_class (id),
  note text,
  mask text,
  currency text not null default 'SGD',
  interest_rate double precision not null default 0,
  balance_cents bigint,
  is_liability boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table card (
  id bigint generated always as identity primary key,
  account_id bigint not null references account (id),
  bank text not null,
  product_name text not null,
  network text,
  last4 text,
  card_type text not null,
  credit_limit_cents bigint,
  -- Free text, not a date: the same slot shows "18 Oct" for a credit card and
  -- "Salary account" for a debit card.
  statement_date text,
  rewards_program text,
  -- Free text, not an amount: "2,570 mi" and "S$18.40" share this slot.
  rewards_earned_display text,
  color_theme text,
  include_in_budget boolean not null default true,
  constraint card_card_type_check check (card_type in ('credit', 'debit'))
);

create table category (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null default 'expense',
  icon text,
  constraint category_name_unique unique (name),
  constraint category_kind_check check (kind in ('expense', 'deposit'))
);

create table goal (
  id bigint generated always as identity primary key,
  name text not null,
  target_amount_cents bigint not null,
  current_amount_cents bigint not null default 0,
  target_date date,
  src text not null,
  sort_order integer not null default 0,
  constraint goal_src_check check (src in ('savings', 'investment'))
);

create table instrument (
  id bigint generated always as identity primary key,
  symbol text not null,
  name text,
  exchange text,
  currency text not null default 'USD',
  kind text,
  sector text,
  constraint instrument_symbol_unique unique (symbol)
);

create table recurring_charge (
  id bigint generated always as identity primary key,
  name text not null,
  category_id bigint references category (id),
  account_id bigint references account (id),
  amount_cents bigint not null,
  frequency text not null,
  custom_every integer,
  custom_unit text,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  last_posted_date date,
  constraint recurring_charge_frequency_check
    check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  constraint recurring_charge_custom_unit_check
    check (custom_unit in ('days', 'weeks', 'months'))
);

create table income_source (
  id bigint generated always as identity primary key,
  name text not null,
  employer text,
  type text not null,
  base_income_cents bigint not null,
  frequency text not null,
  custom_every integer,
  custom_unit text,
  start_date date not null,
  -- Per-stream pay day shown in the Settings income drawer (build plan, reconciliation item 1).
  payday text,
  account_id bigint references account (id),
  is_active boolean not null default true,
  last_posted_date date,
  constraint income_source_type_check check (type in ('salary', 'freelance', 'other')),
  constraint income_source_frequency_check
    check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  constraint income_source_custom_unit_check
    check (custom_unit in ('days', 'weeks', 'months'))
);

create table txn (
  id bigint generated always as identity primary key,
  account_id bigint references account (id),
  date date not null,
  description text not null,
  category_id bigint references category (id),
  kind text not null,
  -- Signed: negative is money out.
  amount_cents bigint not null,
  currency text not null default 'SGD',
  recurring_id bigint references recurring_charge (id),
  income_id bigint references income_source (id),
  created_at timestamptz not null default now(),
  constraint txn_kind_check check (kind in ('expense', 'deposit', 'transfer'))
);
create index idx_txn_account_date on txn (account_id, date);
create index idx_txn_category on txn (category_id);
-- Month navigation on Personal Finance and the Overview month totals filter by date alone.
create index idx_txn_date on txn (date);

create table position (
  id bigint generated always as identity primary key,
  instrument_id bigint not null references instrument (id),
  account_id bigint references account (id)
);
create index idx_position_instrument on position (instrument_id);

create table lot (
  id bigint generated always as identity primary key,
  position_id bigint not null references position (id) on delete cascade,
  -- Remaining open quantity.
  quantity double precision not null,
  cost_per_unit_cents bigint not null,
  purchased_at date not null,
  created_at timestamptz not null default now()
);
create index idx_lot_position on lot (position_id);

create table sale (
  id bigint generated always as identity primary key,
  instrument_id bigint not null references instrument (id),
  account_id bigint references account (id),
  quantity double precision not null,
  price_per_unit_cents bigint not null,
  proceeds_cents bigint not null,
  -- FIFO-consumed cost, snapshotted at sale time.
  cost_basis_cents bigint not null,
  realized_pnl_cents bigint not null,
  sold_at date not null,
  created_at timestamptz not null default now()
);
create index idx_sale_instrument on sale (instrument_id);

create table net_worth_snapshot (
  id bigint generated always as identity primary key,
  date date not null,
  total_cents bigint not null,
  liabilities_cents bigint not null default 0,
  constraint net_worth_snapshot_date_unique unique (date)
);

create table net_worth_snapshot_class (
  snapshot_id bigint not null references net_worth_snapshot (id) on delete cascade,
  asset_class_id bigint not null references asset_class (id),
  amount_cents bigint not null,
  primary key (snapshot_id, asset_class_id)
);

create table watchlist_item (
  id bigint generated always as identity primary key,
  instrument_id bigint not null references instrument (id),
  added_at timestamptz not null default now(),
  constraint watchlist_item_instrument_id_unique unique (instrument_id)
);

-- Access control without RLS. The anon key ships inside the app, so a request carrying only
-- that key must reach nothing; a signed-in request runs as `authenticated`, which keeps the
-- default grants. New sign-ups are disabled in the cloud dashboard, so the only authenticated
-- user is Adlyn.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
