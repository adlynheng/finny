# Finny — Database Schema Design

Status: agreed, not yet migrated
Date: 2026-09-25
Type: schema audit + redesign, documented for reference

## Context

`finny.db` (SQLite, Drizzle-managed) already existed in the repo with 19
tables. This document records the audit of that schema against the full
Finny design (Claude Design project id
`4d314f69-0cec-436b-b849-7de25709c8fc`, every page — Overview, Personal
Finance, Trading, Goals & Planner, Settings/Settings2, Ask Finny, and their
mobile variants) and the resulting target schema, so the reasoning behind
each table doesn't need to be re-derived later.

**Important correction made mid-review, worth stating explicitly:** the
Settings design exists in two versions — `FinnySettings.dc.html` (v1) and
`FinnySettings2.dc.html` (v2) — gated in `FinnyOverview.dc.html` by
`settingsV1`/`settingsV2`. `Pages.dc.html`'s Turn 6 copy confirms v2 is
current ("the Subscription card is replaced by share of assets across
accounts" — describing the v1→v2 change). Several early schema additions
were sourced from v1 without noticing it was superseded, and were later
removed once caught: `budget_rollover_enabled`, `budget_warn` (any form),
`export_default_*`, `include_cpf_in_net_worth`, `card.sync_enabled`,
`card.expiry`, plus a region/date-format section — none of these exist in
v2. Anything in the final schema below was checked against v2, not v1.

## Conventions applied throughout

- **Money:** integer cents on every ledger amount (accounts, cards, goals,
  transactions, recurring charges, income). Market data (instrument prices,
  FX rates) is out of scope entirely — see "Removed" below.
- **Dates:** `text`, SQLite's idiomatic choice (no native date/datetime
  type). Calendar-only dates as `'YYYY-MM-DD'`; timestamps as
  `'YYYY-MM-DD HH:MM:SS'` (what `datetime('now')` already produces
  throughout the original schema). Lexicographic sort order matches
  chronological order, and it works directly with SQLite's `date()`/
  `datetime()`/`strftime()` functions.
- **Ask Finny (chat) is not built this round.** Buttons that open it are
  disabled; day-2 feature. `ai_thread`/`ai_message` removed entirely rather
  than kept unused.
- **No notifications feature.** All notification-preference fields omitted.
- **Transfers** are two independently-generated `txn` rows (money out of the
  source account, money in to the destination, default description naming
  the other account) — application logic, not a schema concern. `txn` only
  needs a `kind` marker so transfer rows can be excluded from income/expense
  aggregates; no `to_account_id` pairing column.
- **Derive, don't cache, anything computable from a lower-level table.**
  Applied to: `goal.share` (derivable from target amount + target date),
  `position.quantity`/`avg_cost_cents` (derivable from open `lot` rows),
  `position.opened_at` (derivable as `MIN(lot.purchased_at)`). Rationale:
  a maintained cache is a second source of truth that must be kept in sync
  on every write path; for numbers this cheap to compute, that's a bug
  surface with no performance payoff.
- **Only schema what the current (v2) design actually shows.** Several
  fields were cut after being traced to demo/template content or the
  superseded v1 mockup rather than the real screens — see "Removed" below.

## Removed from the original schema, and why

- **`profile`** — merged into `settings` (single settings table, singleton
  row, rather than two).
- **`budget`** — dropped. The app doesn't limit spend by category; the
  single overall monthly allowance is `settings.monthly_expenditure_cents`.
  (Note: v2's category-edit drawer does have an *optional* per-category
  "Monthly limit" field with a progress bar — this is a deliberate scope cut
  against the mockup, not an oversight.)
- **`ai_recommendation`** — dropped. Trading's "AI ideas" are generated live
  and displayed, never persisted.
- **`fx_rate`, `quote`, `price_history`** — dropped. All fetched live from
  an external market-data API for display; not stored locally.
- **`ai_thread`, `ai_message`** — dropped. Ask Finny is a day-2 feature, not
  included this build at all.
- **`net_worth_annotation`** — dropped. No screen anywhere in the design has
  a UI for creating or editing a user-authored annotation on the net worth
  chart; the chart's only interactive elements are the hover tooltip and
  (on Goals & Planner) auto-computed goal-ETA pins, neither of which is a
  persisted note.
- **`card.expiry`, `card.sync_enabled`** — both traced to the superseded v1
  Settings mockup; v2's card model doesn't have them (v2 has one toggle,
  "Count toward monthly budget" — no "Sync transactions" toggle, no expiry
  shown on the card face).
- **`goal.share`, `goal.color`** — `share` is now derived (see above);
  `color` removed at the user's request.
- **`income_source.cpf_oa_rate`/`cpf_sa_rate`/`cpf_ma_rate`** — moved to
  `settings` as global constants (CPF rates are constant across all salaried
  income, not per income source).
- **`recurring_charge.icon`** — moved to `category` (icon is a per-category
  constant, not a per-recurring-charge override).

## Final schema

```sql
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,                          -- singleton, id = 1
	`name` text NOT NULL,
	`email` text,
	`payday` text,
	`base_currency` text DEFAULT 'SGD' NOT NULL,
	`monthly_investment_cents` integer DEFAULT 0 NOT NULL,
	`monthly_savings_cents` integer DEFAULT 0 NOT NULL,
	`monthly_expenditure_cents` integer DEFAULT 0 NOT NULL,
	`cpf_employee_rate` real DEFAULT 0.20 NOT NULL,
	`cpf_employer_rate` real DEFAULT 0.17 NOT NULL,
	`cpf_oa_rate` real DEFAULT 0.23 NOT NULL,
	`cpf_sa_rate` real DEFAULT 0.06 NOT NULL,
	`cpf_ma_rate` real DEFAULT 0.08 NOT NULL
);

CREATE TABLE `asset_class` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`color` text
);
CREATE UNIQUE INDEX `asset_class_label_unique` ON `asset_class` (`label`);

CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`cpf_type` text,
	`asset_class_id` integer,
	`note` text,
	`mask` text,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`interest_rate` real DEFAULT 0 NOT NULL,
	`balance_cents` integer,
	`is_liability` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`asset_class_id`) REFERENCES `asset_class`(`id`)
);

CREATE TABLE `card` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`bank` text NOT NULL,
	`product_name` text NOT NULL,
	`network` text,
	`last4` text,
	`card_type` text NOT NULL,                                   -- credit / debit
	`credit_limit_cents` integer,
	`statement_date` text,
	`rewards_program` text,
	`rewards_earned_display` text,                                -- free text: "2,570 mi" or "S$18.40"
	`color_theme` text,
	`include_in_budget` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`)
);

CREATE TABLE `category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'expense' NOT NULL,
	`icon` text
);
CREATE UNIQUE INDEX `category_name_unique` ON `category` (`name`);

CREATE TABLE `goal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_amount_cents` integer NOT NULL,
	`current_amount_cents` integer DEFAULT 0 NOT NULL,
	`target_date` text,
	`src` text NOT NULL,                                          -- 'savings' | 'investment'
	`sort_order` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `instrument` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`name` text,
	`exchange` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`kind` text,                                                  -- Stock / ETF / REIT
	`sector` text
);
CREATE UNIQUE INDEX `instrument_symbol_unique` ON `instrument` (`symbol`);

CREATE TABLE `recurring_charge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category_id` integer,
	`account_id` integer,
	`amount_cents` integer NOT NULL,
	`frequency` text NOT NULL,                                    -- 'weekly'|'monthly'|'quarterly'|'yearly'|'custom'
	`custom_every` integer,
	`custom_unit` text,                                           -- 'days'|'weeks'|'months'
	`start_date` text NOT NULL,
	`end_date` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_posted_date` text,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`),
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`)
);

CREATE TABLE `income_source` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`employer` text,
	`type` text NOT NULL,                                         -- 'salary' | 'freelance' | 'other'
	`base_income_cents` integer NOT NULL,
	`frequency` text NOT NULL,
	`custom_every` integer,
	`custom_unit` text,
	`start_date` text NOT NULL,
	`account_id` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_posted_date` text,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`)
);

CREATE TABLE `txn` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`category_id` integer,
	`kind` text NOT NULL,                                         -- 'expense' | 'deposit' | 'transfer'
	`amount_cents` integer NOT NULL,                              -- signed; negative = money out
	`currency` text DEFAULT 'SGD' NOT NULL,
	`recurring_id` integer,
	`income_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`),
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`),
	FOREIGN KEY (`recurring_id`) REFERENCES `recurring_charge`(`id`),
	FOREIGN KEY (`income_id`) REFERENCES `income_source`(`id`)
);
CREATE INDEX `idx_txn_account_date` ON `txn` (`account_id`,`date`);
CREATE INDEX `idx_txn_category` ON `txn` (`category_id`);

CREATE TABLE `position` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument_id` integer NOT NULL,
	`account_id` integer,
	FOREIGN KEY (`instrument_id`) REFERENCES `instrument`(`id`),
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`)
);
CREATE INDEX `idx_position_instrument` ON `position` (`instrument_id`);

CREATE TABLE `lot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`position_id` integer NOT NULL,
	`quantity` real NOT NULL,                                     -- remaining open quantity
	`cost_per_unit_cents` integer NOT NULL,
	`purchased_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `position`(`id`) ON DELETE cascade
);
CREATE INDEX `idx_lot_position` ON `lot` (`position_id`);

CREATE TABLE `sale` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument_id` integer NOT NULL,
	`account_id` integer,
	`quantity` real NOT NULL,
	`price_per_unit_cents` integer NOT NULL,
	`proceeds_cents` integer NOT NULL,
	`cost_basis_cents` integer NOT NULL,                          -- FIFO-consumed cost, snapshotted at sale time
	`realized_pnl_cents` integer NOT NULL,
	`sold_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `instrument`(`id`),
	FOREIGN KEY (`account_id`) REFERENCES `account`(`id`)
);
CREATE INDEX `idx_sale_instrument` ON `sale` (`instrument_id`);

CREATE TABLE `net_worth_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`total_cents` integer NOT NULL,
	`liabilities_cents` integer DEFAULT 0 NOT NULL
);
CREATE UNIQUE INDEX `net_worth_snapshot_date_unique` ON `net_worth_snapshot` (`date`);

CREATE TABLE `net_worth_snapshot_class` (
	`snapshot_id` integer NOT NULL,
	`asset_class_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	PRIMARY KEY (`snapshot_id`, `asset_class_id`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `net_worth_snapshot`(`id`) ON DELETE cascade,
	FOREIGN KEY (`asset_class_id`) REFERENCES `asset_class`(`id`)
);

CREATE TABLE `watchlist_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument_id` integer NOT NULL,
	`added_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `instrument`(`id`)
);
CREATE UNIQUE INDEX `watchlist_item_instrument_id_unique` ON `watchlist_item` (`instrument_id`);
```

`instrument` is the full universe of securities referenced by holdings,
watchlist entries, and historical sales; `watchlist_item` is only the subset
explicitly added to the watchlist — the two are independent, not a superset/
subset guarantee in either direction.

## Net change from the original `finny.db`

16 tables, down from 20 (the original audit undercounted this as 19 — the
actual original schema had 20 application tables, not counting
`__drizzle_migrations`/`sqlite_sequence`).

- **Removed (9):** `profile` (merged into `settings`), `budget`,
  `ai_recommendation`, `fx_rate`, `quote`, `price_history`, `ai_thread`,
  `ai_message`, `net_worth_annotation`.
- **Added (5):** `settings` (merged), `card`, `lot`, `sale`,
  `net_worth_snapshot_class`.
- **Kept, modified (11):** `account`, `asset_class`, `category`, `goal`,
  `income_source`, `instrument`, `net_worth_snapshot`, `position`,
  `recurring_charge`, `txn`, `watchlist_item`.

## Open items for the next pass

- `settings.budget_warn` threshold: kept as an in-app constant (80%), not a
  DB column — not user-configurable in v2.
- Category-level spend limits exist as an *optional* field in v2's mockup
  but are out of scope for this build (see "Removed" above) — revisit if a
  future pass wants per-category budgeting back.
- `budget_rollover_enabled`-style behavior (rolling unused budget into next
  month) has no home in this schema at all now that `budget` is gone —
  flag if that behavior turns out to still be wanted against the single
  `monthly_expenditure_cents` figure.
