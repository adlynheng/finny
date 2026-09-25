# Finny — App Architecture & Development Plan

Status: agreed, not yet implemented
Date: 2026-09-25
Type: architecture/development plan, documented for reference

## Context

Finny has two prior specs: [`2026-09-25-rn-stack-recommendation.md`](./2026-09-25-rn-stack-recommendation.md)
(library choices: react-native-macos, React Native Reusables + NativeWind,
react-native-svg, Reanimated + Gesture Handler, TanStack Query, zustand,
React Navigation, Supabase) and
[`2026-09-25-db-schema-design.md`](./2026-09-25-db-schema-design.md) (the
16-table target schema, written in SQLite syntax since it was designed
against the pre-existing `finny.db`).

This document plans how those decisions become an actual buildable app:
project structure, design-token/component architecture, the data layer
(including two external APIs), how the SQLite schema spec translates to the
real runtime database, and how `finny.db`'s existing data gets carried over.
No code has been written yet.

## Decisions confirmed for this plan

- **Single-user.** No `user_id` column or Row Level Security on any table —
  Supabase Auth only gates login (session persisted via
  `react-native-keychain`, per the stack spec). Revisit if Finny is ever
  meant to hold more than one person's data.
- **External market data:**
  - **FX rates: `exchangerate.fun`** (`GET https://api.exchangerate.fun/latest?base=USD`).
    No API key, no rate limit, updates hourly. Called directly from the
    client.
  - **Stock/ETF/REIT quotes: Alpaca.** Requires brokerage-linked API
    key/secret, which must never ship inside the app bundle — needs a
    server-side proxy (see §4).
- **Migration scope: `txn` rows only.** Every other table (accounts,
  categories, recurring charges, income sources, goals, instruments,
  positions) is populated fresh through the app itself, not migrated from
  `finny.db`.

## 1. Project structure

**A single React Native project, not a monorepo.** Scaffold with the
standard RN CLI, then run `react-native-macos-init` to add a `macos/` native
folder alongside the generated `ios/` one. One JS codebase serves both
platforms — that's the entire value proposition of `react-native-macos`.
There's no separate web app and no custom backend server (Supabase is BaaS),
so a monorepo (pnpm workspaces, Turborepo) would only add tooling weight
with nothing to actually separate into packages. Platform divergence (e.g.
the blur fallback) is handled with `.ios.tsx` / `.macos.tsx` file-extension
overrides on individual components, not separate packages.

Internal organization is module-based:

```
src/
  modules/{net-worth,accounts,transactions,goals,trading,settings}/
  components/ui/       ← RN Reusables primitives (rn-primitives + NativeWind)
  components/charts/   ← bespoke SVG: Sphere, MultiStrandLine, RadialDial
  theme/                ← design tokens (see §2)
  lib/                  ← supabase client, query client, market-data fetchers
  hooks/                ← react-query hooks per resource (useAccounts, useTxns...)
  stores/               ← zustand, UI-only state (dial drag position, selected range)
  utils/                ← money/date formatting, derive functions (see §7)
  navigation/
  types/                ← generated Supabase types + domain types
```

## 2. Design tokens & component architecture

One source of truth, as a plain TS object (`src/theme/tokens.ts`): colors
(`#1c1c1a`, `#d8f23a`, `#efefec`, `#6b6a65`...), spacing, radii, gradient
stops, blur recipes — pulled from the design files. `tailwind.config.js`
imports this object to extend its theme, so NativeWind `className`s stay in
sync with it automatically.

The reason it can't live *only* in Tailwind config: the bespoke SVG charts
(`react-native-svg` props) and Reanimated interpolations need actual JS
color/number values, not class strings — components import the same token
object directly for those.

`components/ui/` holds the copied-in RN Reusables primitives (buttons,
sheets, tabs); `components/charts/` holds the three hand-rolled chart
primitives (`Sphere`, `MultiStrandLine`, `RadialDial`), each a self-contained
unit — data in, no knowledge of where its data comes from.

## 3. Data layer — Supabase as source of truth

All persisted domain data (accounts, transactions, goals, positions, lots,
etc.) lives in Supabase Postgres, queried through `supabase-js`, wrapped
one-hook-per-resource in `hooks/` (`useAccounts`, `useTransactions`,
`useGoals`...) using TanStack Query — mutations invalidate the relevant
query key, no manual cache-patching.

Being single-user removes the need for `user_id`/RLS on every query — see
"Decisions confirmed" above.

## 4. External market data

- **`exchangerate.fun`** — called directly from the client (no key, no
  limit). A `useFxRates()` hook, `staleTime` ~1 hour (matches its hourly
  update cadence).
- **Alpaca** — needs a proxy: a Supabase Edge Function
  (`market-data-quote`) holds the Alpaca API key/secret as a Supabase
  secret; the client calls it via `supabase.functions.invoke()`. The
  function does a short cache (e.g. 30–60s) so macOS and iOS hitting it
  around the same time don't double-call Alpaca. A `useQuotes(symbols)`
  hook wraps that with a matching `staleTime`, refetching on screen focus.

Neither price nor FX data is ever written to a table — pure passthrough,
per the schema spec's "Removed" list (`fx_rate`, `quote`, `price_history`
were all dropped for exactly this reason).

## 5. Schema translation: SQLite → Postgres

The `db-schema-design.md` spec was written in SQLite syntax because
`finny.db` is SQLite — but the actual runtime database is Supabase
Postgres, so a few conventions change in translation (the reasoning that
justified them for SQLite doesn't hold for Postgres):

- `integer PRIMARY KEY AUTOINCREMENT` → `bigint generated always as
  identity primary key` (plain bigint IDs are fine — single-user, no need
  for UUIDs).
- Text dates (`'YYYY-MM-DD'` / `'YYYY-MM-DD HH:MM:SS'`) → native `date` for
  calendar-only columns, `timestamptz` for timestamp columns (`created_at`,
  `added_at`). Postgres has real date types; there's no reason to keep the
  SQLite text workaround.
- Everything else (integer-cents money, table/column names, FKs, the
  removed/kept table list from `db-schema-design.md`) carries over
  unchanged.

The actual Postgres DDL migration file gets written during implementation,
not in this spec — this section records the mapping rule, not the SQL.

## 6. Migrating `finny.db`'s `txn` data

Only the 55 `txn` rows carry over. `txn` references `account_id` /
`category_id` / `recurring_id` / `income_id`, but those parent rows in the
new DB will have different (freshly generated) IDs than the old ones in
`finny.db`, since the parent tables aren't being migrated. So this script
only makes sense to run **after** the corresponding accounts, categories,
recurring charges, and income sources have been recreated in the app by
hand, using the same names as before.

A one-time script (`scripts/migrate-txns.ts`, not shipped in the app),
using `better-sqlite3` to read `finny.db` and `supabase-js` with a
service-role key to write to Supabase:

1. Reads the 55 `txn` rows from `finny.db`.
2. For each old FK (`account_id` → old `account.name`, `category_id` → old
   `category.name`, etc.), looks up the matching row in the new Supabase
   tables **by name**, not by ID.
3. Inserts the `txn` row with the resolved new IDs; if a name doesn't match
   anything in the new DB, inserts with that FK left `NULL` and logs it to
   a report so it can be fixed by hand afterward.
4. Converts amounts to the integer-cents convention if the old
   `txn.amount` wasn't already stored that way — verify the original
   column's convention during implementation before assuming.

This is a standalone script run whenever ready, not a gate on getting the
app running.

## 7. Domain logic / derived-calculation helpers

Distinct from generic formatting utils, these encode business rules the
schema deliberately doesn't store (per the "derive, don't cache" principle
already agreed in the schema spec):

- `position.avg_cost_cents` / `quantity` from open `lot` rows.
- FIFO lot consumption on a sale.
- Goal progress % from `target_amount_cents` / `current_amount_cents`.
- Next-due-date for a `recurring_charge` / `income_source` from
  `frequency` + `last_posted_date`.

These live in `src/utils/derive/`, pure functions, unit-testable without
any DB or network dependency.

## 8. Build sequence

1. **macOS risk spikes first** (per the stack spec's open-risks list):
   `expo-blur` BlurView, animated `react-native-svg` paths,
   `react-native-keychain` — all on `react-native-macos` specifically,
   before investing in full screens.
2. Scaffold project + design tokens + NativeWind config.
3. Supabase project: apply translated Postgres schema (empty — no bulk
   migration gating this).
4. Data layer: Supabase client, query hooks, zustand stores.
5. Navigation shell + `components/ui` primitives.
6. Feature screens, roughly in the design's own order: Overview → Personal
   Finance → Trading → Goals & Planner → Settings. Master data (accounts,
   categories, recurring charges, income sources) gets entered through
   these screens as they're built.
7. External data integration: `exchangerate.fun` hook, Alpaca edge
   function + `useQuotes`.
8. `txn` migration script — run once accounts/categories exist in the new
   app, backfilling transaction history.
9. iOS companion pass — same screens, mobile-restacked layouts already in
   the design files.
