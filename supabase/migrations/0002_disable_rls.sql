-- Finny is single user, so its tables have no row level security (build plan, Global constraints).
-- Access is controlled by grants instead: 0001 revokes everything from `anon`, and new sign-ups
-- are disabled (supabase/config.toml), so the only role that reaches these tables is Adlyn's
-- signed-in session.
--
-- The cloud project was created with Supabase's automatic RLS option, which installs an event
-- trigger that enables RLS on every new table in `public`. With no policies that locks the
-- tables to everyone but the service role. Remove the trigger so later migrations' tables are
-- not locked, then turn RLS off on the tables it already caught. Both are no-ops locally.

drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();

alter table settings disable row level security;
alter table asset_class disable row level security;
alter table account disable row level security;
alter table card disable row level security;
alter table category disable row level security;
alter table goal disable row level security;
alter table instrument disable row level security;
alter table recurring_charge disable row level security;
alter table income_source disable row level security;
alter table txn disable row level security;
alter table position disable row level security;
alter table lot disable row level security;
alter table sale disable row level security;
alter table net_worth_snapshot disable row level security;
alter table net_worth_snapshot_class disable row level security;
alter table watchlist_item disable row level security;
