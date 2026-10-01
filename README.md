# Finny

Finny is a personal finance dashboard for one person. It runs as a **macOS desktop app** and an **iOS companion app** from a single React Native codebase, both reading the same Supabase database. It tracks accounts, cards, CPF, everyday spending, recurring charges, an investment portfolio, net worth history and savings goals.

The app is built for its owner's own devices only. It isn't on the App Store, and both apps are signed with a free Apple ID (see [Distribution](#distribution-and-signing)).

---

## Contents

- [Tech stack](#tech-stack)
- [External APIs](#external-apis)
- [Architecture at a glance](#architecture-at-a-glance)
- [Pages](#pages)
- [File structure](#file-structure)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Supabase](#supabase)
- [Authentication and the Apple Keychain](#authentication-and-the-apple-keychain)
- [Distribution and signing](#distribution-and-signing)
- [Notes for developers](#notes-for-developers)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI framework | React Native 0.81 (New Architecture / Fabric, Hermes) and react-native-macos 0.81 |
| Language | TypeScript 5 |
| Styling | NativeWind 4 (Tailwind 3 classes), themed from `src/theme/tokens.ts` |
| Navigation | `@react-navigation/native` 7 with a custom tab navigator (no `react-native-screens`) |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 (`uiStore`, `planStore`) |
| Backend | Supabase: Postgres, Auth, Edge Functions (Deno) |
| Animation | Reanimated 4 and Worklets (patched for macOS) |
| Graphics | react-native-svg 15 for every chart, dial, ring and sphere |
| Gestures | react-native-gesture-handler 2 |
| Blur | `expo-blur` on iOS; a custom `NSVisualEffectView` pod on macOS |
| Secure storage | `react-native-keychain` (the Supabase session lives in the Apple Keychain) |
| Dates | `date-fns` 4 (all date maths) |
| Font | Urbanist (bundled in `assets/fonts`, OFL) |
| Testing | Jest 29 and React Native Testing Library; pgTAP for the database |
| Tooling | Yarn 3 (Berry), ESLint, Prettier 2, Supabase CLI, CocoaPods |

Expo is installed only to provide `expo-blur` and its module system. The app is a bare React Native project, not an Expo-managed one.

---

## External APIs

| API | Used for | Called from | Key needed |
| --- | --- | --- | --- |
| **Supabase** (PostgREST, Auth, Functions) | All app data and sign-in | The app, via `src/lib/supabase.ts` | The anon key, inlined at build time. It grants no table access by itself. |
| **Alpaca Market Data** (`data.alpaca.markets`, free IEX feed) | Latest stock quotes and day change; daily closes for the P&L chart and watchlist sparklines | **Edge Functions only** (`market-data-quote`, `market-data-bars`) | Yes. `ALPACA_KEY_ID` and `ALPACA_SECRET_KEY` are Supabase secrets and never in the app. |
| **exchangerate.fun** (`api.exchangerate.fun/latest?base=USD`) | The live USD to SGD rate for converting US holdings | The app (`src/lib/marketData.ts`) | No |
| **Nasdaq Trader symbol directory** (`nasdaqlisted.txt`, `otherlisted.txt`) | All US-listed stocks and ETFs, for the Add position symbol search | The app (`src/lib/listings.ts`). It downloads both files once a day and searches them on the device. | No |

Alpaca only covers US listings. An SGX or LSE symbol such as `D05` therefore has no quote and no closes. The Edge Functions never send such symbols to Alpaca, because Alpaca rejects the whole request over one non-US ticker.

Prices and exchange rates are passed straight through to the app. They are never written to a table.

---

## Architecture at a glance

```
┌──────────────── macOS app / iOS app (same JS bundle) ───────────────┐
│  SessionGate ── RootNavigator (5 screens) ── NewTransactionSheet    │
│        │                │                                           │
│        │         hooks/use*.ts  (TanStack Query, one per table)     │
│        │                │                                           │
│        │         utils/derive/* (pure maths: budget, net worth,     │
│        │                         FIFO lots, recurrence, plan …)     │
│        ▼                ▼                                           │
│  keychainStorage ◄── lib/supabase.ts ──► functions.invoke(...)      │
└────────────────────────────┬──────────────────────┬─────────────────┘
                             │ PostgREST / Auth     │ Edge Functions
                             ▼                      ▼
                    Supabase Postgres       market-data-quote / -bars
                    (triggers move              │
                     account balances)          ▼
                                          Alpaca Market Data
```

- **Data hooks** (`src/hooks`) wrap one table each with TanStack Query. Mutations go through `src/lib/save.ts` and invalidate by the keys in `src/lib/queryKeys.ts`.
- **Derived numbers live in `src/utils/derive`.** These are pure functions: net worth, budget pace, cash flow, goal ETAs, FIFO sale lots, recurrence schedules, the monthly plan and portfolio health. Values that can be computed, such as a position's quantity or average cost, are never stored.
- **The database keeps balances correct.** A trigger (`txn_apply_to_balance`) adds each transaction's signed amount to its account. Sales go through one atomic RPC (`record_sale`).
- **Two app-wide effects** run once the user is signed in, from `RootNavigator`:
  - `usePostDue` posts any recurring charges and income payments that have come due.
  - `useSnapshotSync` writes this month's net-worth snapshot.

---

## Pages

The desktop app shows the five pages as tabs in a header pill. The iOS app shows them in a floating bottom bar with a centre **+** button for a new transaction. Each page has its own desktop grid and a single scrolling column on mobile, both built from the design files.

### Overview (`src/modules/net-worth`)
The net-worth home page.
- **Net worth hero:** the total, with chips for the change since the last snapshot and for liabilities.
- **Asset sphere:** an SVG sphere ringed by asset class (Cash, CPF, Investments, Property, Other). On macOS you can hover a class to inspect it; on iOS you tap the chips instead.
- **Share of assets:** each class's proportion as a hatched bar.
- **Net worth history:** a multi-strand chart over 6, 12 or 24 months, built from the monthly snapshots. Hover it on macOS or scrub it on iOS.
- **This month:** money in against money out, excluding transfers but including recurring charges.
- **Savings goals:** each goal's progress, ETA and monthly contribution.

### Personal Finance (`src/modules/finance`)
Everyday spending against a monthly limit.
- **Budget hero and dial:** what is left of the monthly limit and a per-day spend dial with an even-pace marker. Stats show spent so far, the daily average and what is safe to spend each remaining day. You can edit the limit inline. **The budget leaves out posted recurring charges**, which still move account balances.
- **Income vs expenses:** a savings-rate view and a 6- or 12-month cash-flow chart.
- **Transactions:** a month-by-month ledger with search and a kind filter. A transfer, stored as two rows, is shown once.
- **Recurring charges:** add, edit, pause or delete subscriptions and bills. A charge can be paid from a bank account or a credit card. Its category is chosen from the recurring categories set up in Settings.
- **Upcoming payments calendar:** recurring charges, credit-card bill due dates and paydays for this month and the next three.

### Trading (`src/modules/trading`)
A manually tracked investment portfolio.
- **Hero:** portfolio value in SGD with a P&L chart over 1M, 3M, 6M or 1Y. US holdings are converted at the live USD/SGD rate.
- **Portfolio health:** three scores on concentric rings, an overall verdict and "Today's ideas", all computed from the current holdings. The Ask Finny button is disabled in this build.
- **Panel tabs:**
  - *Positions:* the open lots.
  - *Portfolio:* the allocation ring.
  - *Watchlist:* 30-day sparklines.
- **Add position:** search all US listings by symbol or name.
- **Sell:** a FIFO lot consumer. The `record_sale` RPC writes the sale, the lot changes and the proceeds deposit in one transaction.

### Goals & Planner (`src/modules/planner`)
The monthly money plan.
- **Plan hero:** shows gross income less CPF and fixed commitments. Three allocation sliders (savings, investments, expenditure) are coupled to typed amounts, and a dial shows the split. **Save plan** writes the amounts to `settings`.
- **Goals:** create goals with a target, the amount saved, a date and a funding pot. A live line shows the monthly contribution and the ETA. Allocating money to a goal is manual.
- **Fixed commitments:** recurring charges as monthly equivalents, grouped by category.

### Settings (`src/modules/settings`)
Where the reference data is set up.
- **Profile header:** the name (edited in place), email, and chips for cards, accounts and currency.
- **Card fan:** a swipeable fan of card faces, with the selected card's figures below it. A credit card shows its limit, statement day and bill due day.
- **Five panels:**
  - **Accounts:** bank, CPF (OA, SA, MA or RA), investment and property accounts, and credit cards. A credit card's balance is stored negative while money is owed.
  - **Expenditure categories.**
  - **Recurring categories:** expense categories flagged `is_recurring`, which are the ones the recurring-charge form offers.
  - **Deposit categories.**
  - **Fixed variables:** salary streams, with their pay day, CPF rates and take-home pay.
- **Share of assets:** the same card as on the Overview.

### Sign-in (`src/modules/auth/SessionGate.tsx`)
A plain email and password form. Sign-ups are disabled, so only the owner's account can sign in.

---

## File structure

```
finny/
├── index.js                    # Entry: URL polyfill, registers App
├── src/
│   ├── App.tsx                 # Providers → SessionGate → NavigationContainer → RootNavigator
│   ├── global.css              # Tailwind entry for NativeWind
│   ├── components/
│   │   ├── AppProviders.tsx    # QueryClient, gesture root, safe area, portal host
│   │   ├── charts/             # SVG charts: Sphere, EchoLine, MultiStrandLine, RadialDial,
│   │   │                       #   Rings, MixRing, Sparkline, StrandsFlow… + pure *Layout.ts maths
│   │   ├── icons/              # Icon component and category icon registry
│   │   └── ui/                 # Design-system primitives: Card, Glass, Sheet, Button, Input,
│   │                           #   Segmented, Toggle, Calendar, DatePicker, ConfirmDialog, Table…
│   │                           #   *.macos.tsx files are macOS-specific implementations
│   ├── config/                 # appSettings.ts
│   ├── hooks/                  # One TanStack Query hook per table, plus usePostDue,
│   │                           #   useQuotes / useBars / useUsdSgd / useUsListings
│   ├── lib/                    # supabase client, keychainStorage, marketData, listings,
│   │                           #   queryClient, queryKeys, save, today, unwrap
│   ├── modules/                # One folder per page (see Pages)
│   │   ├── auth/  finance/  net-worth/  planner/  settings/  trading/  transactions/
│   ├── navigation/             # Custom tab navigator, DesktopHeader, BottomBar, routes
│   ├── stores/                 # Zustand: uiStore (UI state), planStore (planner drafts)
│   ├── theme/                  # tokens.ts (single source of design values), gradients, motion
│   ├── types/                  # database.ts (generated), domain.ts (app types and enums)
│   └── utils/
│       ├── derive/             # Pure business maths (budget, cashflow, networth, plan, goals,
│       │                       #   positions/FIFO, portfolio, posting, recurrence, ideas)
│       └── format/             # Money and date formatting
├── supabase/
│   ├── config.toml             # Local stack config (ports 553xx, sign-ups off)
│   ├── migrations/             # 0001–0011, applied in order
│   ├── tests/                  # pgTAP tests, one per migration
│   ├── seed.sql                # Local-only seed data and user
│   └── functions/
│       ├── _shared/alpaca.ts   # Deno-free logic (parsing, caching) so Jest can test it
│       ├── market-data-quote/  # POST { symbols } → latest quotes
│       └── market-data-bars/   # POST { symbol, range } → daily closes
├── macos/
│   ├── finny-macOS/            # AppDelegate, Info.plist, finny.entitlements
│   ├── FinnyBlur/              # Local pod: NSVisualEffectView backdrop blur
│   ├── FinnyHover/             # Local pod: NSTrackingArea mouse-move events
│   └── Podfile
├── ios/
│   ├── Finny/                  # AppDelegate.swift (with SceneDelegate), Info.plist
│   └── Podfile                 # Includes the Xcode 27 fmt / deployment-target fixes
├── scripts/
│   ├── build-ipa.sh            # Unsigned Release .ipa for SideStore
│   ├── build-macos.sh          # Signed Release Finny.app (no Metro needed)
│   ├── start-local.sh          # Metro against the local Supabase stack
│   ├── build-env.js            # Which env vars Babel inlines (Supabase URL and anon key only)
│   └── babel-plugin-expo-os.js # Inlines process.env.EXPO_OS for expo-blur
├── .yarn/patches/              # react-native-worklets macOS display-link patch
├── test/                       # Jest setup, stubs and shared fixtures
├── assets/fonts/               # Urbanist
├── docs/superpowers/           # Specs, build plan and spike notes (design history)
└── finny.db                    # The original SQLite prototype, kept as a schema reference
```

The `@/` import alias maps to `src/`. It is configured in three places that must agree: `babel.config.js`, `tsconfig.json` and `jest.config.js`.

---

## Getting started

### Prerequisites
- macOS with Xcode. This project is developed on macOS 27 / Xcode 27 on Apple silicon.
- Node 20 or later and Yarn 3, via corepack.
- Ruby with Bundler for CocoaPods. The `Gemfile` pins `nkf`, which Ruby 4 no longer bundles.
- Docker, for the local Supabase stack.

### Setup
```sh
yarn install
cp .env.example .env            # fill in SUPABASE_URL and SUPABASE_ANON_KEY
bundle install
(cd ios && bundle exec pod install)
(cd macos && bundle exec pod install)
```

### Run in development
```sh
yarn start                      # Metro against the database in .env
yarn macos                      # build + launch the macOS Debug app
yarn ios                        # build + launch on the iOS simulator
```

To develop against a local database instead of the cloud:
```sh
yarn supabase start             # local stack on ports 553xx
yarn supabase db reset --local  # apply migrations + seed.sql
yarn start:local                # Metro with the local URL and key (cache reset)
```
`start:local` only serves the JavaScript, so launch the already-built Debug app yourself. To go back to the cloud, restart Metro with `yarn start --reset-cache`.

---

## Scripts

| Script | What it does |
| --- | --- |
| `yarn start` / `yarn start:local` | Metro, against `.env` or the local Supabase stack |
| `yarn macos` / `yarn ios` | Debug builds that load JS from Metro |
| `yarn macos:release` | Signed Release `build/Finny.app` with the bundle embedded; prints the profile expiry |
| `yarn ios:ipa` | Unsigned Release `build/Finny.ipa` for SideStore |
| `yarn test` | Jest (components, hooks, derive maths, Edge Function logic) |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | ESLint with zero warnings allowed |
| `yarn db:test` | pgTAP tests against the local database |
| `yarn db:types` | Regenerate `src/types/database.ts` from the local schema |

A change is done when `yarn test`, `yarn typecheck`, `yarn lint` and (for schema changes) `yarn db:test` all pass, and the UI has been checked on both macOS and iOS.

---

## Supabase

### Database
There are 16 tables, defined in `0001_initial_schema.sql` (the design is in `docs/superpowers/specs/2026-09-25-db-schema-design.md`):
- `settings` (a single row)
- `asset_class`, `account`, `card`
- `category`, `txn`, `recurring_charge`, `income_source`
- `goal`
- `instrument`, `position`, `lot`, `sale`, `watchlist_item`
- `net_worth_snapshot`, `net_worth_snapshot_class`

Conventions:
- **Money is integer cents** (`bigint`), and dates are `date`.
- **Signs are meaningful.** An expense is negative and a deposit positive; a transfer is two rows, one leg on each account. A credit card's balance is negative while money is owed. Spending on the card makes it more negative, and a transfer from a bank account pays it down. The UI shows liabilities as absolute values.
- **Single user, so no RLS.** Access is controlled by grants instead:
  - `0001` revokes every privilege from `anon`.
  - `0002` drops the cloud project's auto-RLS trigger.
  - Sign-ups are disabled.

  The only role that reaches the tables is the owner's signed-in session.

| Migration | Purpose |
| --- | --- |
| 0001 | Initial schema |
| 0002 | Disable RLS / remove the auto-RLS event trigger |
| 0003 | Reference data: asset classes, settings row with Singapore CPF rates |
| 0004 / 0010 | `account.cpf_type` check (OA, SA, MA, RA) |
| 0005 | `record_sale` RPC: an atomic FIFO sale that refuses changed or mismatched lots |
| 0006 | `txn_apply_to_balance` trigger: transactions move account balances |
| 0007 | Unique keys so a recurring payment posts once per date even if both devices open at once |
| 0008 | Numeric pay days, card statement and bill-due days |
| 0009 | Credit-card balances stored negative; removed `card.include_in_budget` |
| 0011 | `category.is_recurring` for recurring-charge categories |

### Edge Functions
These hold the third-party secret so it never ships in the app bundle. Both are called with `supabase.functions.invoke`, as the signed-in user.

- **`market-data-quote`**: `POST { symbols: string[] }` returns `{ quotes: { [symbol]: { priceCents, dayChangePercent } | null } }`.
  - Reads Alpaca's multi-symbol snapshots.
  - Answers are cached per symbol for about 45 seconds, so the Mac and the phone asking together hit Alpaca once.
  - Accepts at most 100 symbols.
- **`market-data-bars`**: `POST { symbol, range: '1M'|'3M'|'6M'|'1Y' }` returns `{ bars: [{ date, closeCents }] }`.
  - Daily closes, split-adjusted and paginated.
  - Cached for about 12 hours per symbol and range.

The logic lives in `supabase/functions/_shared/alpaca.ts`, free of Deno APIs so it can be unit-tested with Jest. Each `index.ts` is a thin Deno handler around it.

Secrets: locally, `supabase/functions/.env` (git-ignored). In the cloud, `supabase secrets set ALPACA_KEY_ID=… ALPACA_SECRET_KEY=…`.

### Workflow
The cloud project is the **real** database. Every migration is applied and pgTAP-tested on the local stack first (`yarn supabase db reset --local`, `yarn db:test`), then pushed with `yarn supabase db push --linked` once it's approved.
- Never run `db reset` or other destructive commands against the linked project.
- Snapshot affected rows before any data-changing migration.

The local stack uses ports **553xx** (API 55321, DB 55322, Studio 55323) so it can run beside another project on the default 543xx ports.

---

## Authentication and the Apple Keychain

- Sign-in is email and password through Supabase Auth (`SessionGate`).
- **The session is stored only in the Apple Keychain**, never in AsyncStorage. `src/lib/keychainStorage.ts` is the `auth.storage` adapter for supabase-js. Each storage key becomes a generic-password item under the service `finny.<key>`, saved with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. That lets a background token refresh work and keeps the item out of backups.
- The adapter's `getItem` never throws. A locked Keychain at launch is treated as "signed out" rather than crashing.
- **No `accessGroup` is ever passed.** SideStore rewrites the iOS bundle identifier (it appends the team ID), so only the app's default access group is reliable.
- **On macOS** the target must be team-signed with the `keychain-access-groups` entitlement (`macos/finny-macOS/finny.entitlements`). react-native-keychain uses the data-protection keychain, which fails with `-34018` under ad-hoc signing.
- Token auto-refresh runs only while the app is in the foreground (`AppState` listener in `lib/supabase.ts`).
- Signing out clears the TanStack Query cache, so no data from the old session leaks into the next one.

---

## Distribution and signing

Both apps are signed with a **free Apple ID (Personal Team)**. That means there is no App Store, no TestFlight, and provisioning profiles last **7 days**.

### iOS: SideStore
1. `yarn ios:ipa` builds an **unsigned** Release `build/Finny.ipa`, with the Hermes bundle embedded so no Metro is needed.
2. Install it on the iPhone with **SideStore**, which signs it on the device with the free Apple ID and refreshes it before the 7-day expiry.
3. SideStore changes the bundle ID to `com.adlynheng.finny.<TEAMID>`, so never hardcode the bundle ID or the keychain access group.

### macOS: Release build
1. `yarn macos:release` runs `xcodebuild` (Release, `-allowProvisioningUpdates`) and checks that `main.jsbundle` is embedded.
2. It copies the result to `build/Finny.app` and prints the profile's expiry date. Drag the app to `/Applications`.
3. The first codesign may show a Keychain access prompt; choose **Always Allow**.
4. Rebuild before the profile expires. Xcode reuses a profile while it's still valid.

### Build-time config
The Supabase URL and anon key are **inlined into the JS bundle by Babel** (`transform-inline-environment-variables`, limited to the names in `scripts/build-env.js`). Values from the shell override `.env`. Nothing else in `process.env` is inlined, which keeps secrets out of the bundle.

`metro.config.js` keys Metro's transform cache on those values, so editing `.env` takes effect without `--reset-cache`. `start-local.sh` resets the cache anyway.

---

## Notes for developers

### Patches and toolchain workarounds
- **`react-native-worklets` (Yarn patch, `.yarn/patches/`).** On react-native-macos, `setPaused:` on the display link stops and restarts a `CVDisplayLink`, which spawns a CoreVideo thread every time, and a stopped link reports a zero timestamp. Together these broke Reanimated animations and froze JS timers. The patch keeps the link running while there are callbacks and uses `CACurrentMediaTime()` for the target timestamp.
- **`ios/Podfile` post-install:**
  - Raises pod deployment targets to Xcode 27's minimum.
  - Forces `fmt`'s non-`consteval` path, because Xcode 27's clang rejects fmt 11.0.2's consteval format checks.
  - `macos/Podfile` does the same deployment-target floor.
- **`Gemfile`:** adds `nkf` (removed from Ruby 4's default gems, needed by CocoaPods).
- **iOS uses the UIScene lifecycle** (`SceneDelegate` creates the window). `AppDelegate.swift` calls `bindReactNativeFactory`, without which the app traps in `ExpoAppDelegate.recreateRootView`.
- **`scripts/babel-plugin-expo-os.js`** inlines `process.env.EXPO_OS` for `expo-blur`, instead of adopting the whole Expo Babel preset.

### Custom native code on macOS
No third-party library supported these on react-native-macos, so they are small local CocoaPods:
- **`macos/FinnyBlur`:** an `RCTViewManager` wrapping `NSVisualEffectView` for the glass surfaces. It is used by `src/components/ui/Glass.macos.tsx`; iOS uses `expo-blur`.
- **`macos/FinnyHover`:** an `NSTrackingArea` view that emits `onHoverMove` and `onHoverEnd` with coordinates. react-native-macos only reports enter and leave for a whole view, never mouse movement. It is wrapped by `HoverSurface.macos.tsx`, and on macOS `ScrubSurface` re-exports it. On iOS, `ScrubSurface` uses a gesture-handler pan instead.

### react-native-macos traps (each crashes or misbehaves)
- **Never put `overflow: hidden` and `boxShadow` on the same view.** It crashes when children mount. Clip an inner layer and cast the shadow from the outer one; `GlassBase` shows the pattern.
- **Never pass `pointerEvents` to `FinnyBlur` or `FinnyHover` views.** It aborts on an unrecognised selector, so the native views override `hitTest:` instead.
- **`secureTextEntry` never emits text on macOS**, so the sign-in password field is visible on the Mac only (`secureTextEntry={Platform.OS !== 'macos'}`).
- **Percentage `transformOrigin` is ignored**, so a view scales about its centre. Position a small view centred on the pivot instead.
- **Keep hover state local.** Holding a chart's hover index in a page-level component re-renders every chart on each mouse move. Charts keep their own pointer state and report up through `startTransition`.
- `console.log` from JS doesn't reach the macOS unified log. To measure something, render it on screen.
- NativeWind has no cursor classes. Use `style={{ cursor: 'crosshair' }}` on the view that contains the hover surface.

### Design choices
- **A custom navigator.** React Navigation's ready-made navigators need `react-native-screens`, which doesn't support macOS. `RootNavigator` builds a small navigator on `TabRouter` that draws no chrome of its own.
- **Platform files.** `*.macos.tsx` sits beside `*.tsx` for components that differ: Glass, Sheet, DatePicker, HoverSurface, ScrubSurface. Screens branch on `Platform.OS === 'macos'` for the desktop grid versus the mobile column.
- **Styling is NativeWind `className` only.** Inline `style` is reserved for `boxShadow`, animated or data-driven values, and the macOS cursor. Every colour, size and radius comes from `src/theme/tokens.ts`, which `tailwind.config.js` also imports, so classes and JS values can't drift apart. Build from the design's values rather than estimates.
- **Derived data is never stored.** Positions' quantities and costs come from their lots, budgets and cash flow from the ledger, and goal shares from targets. The derive functions are pure and unit-tested.
- **Balances are authoritative in the database.** `account.balance_cents` is the truth, and the trigger applies each transaction's signed amount on insert, update or delete. Rows from before the trigger existed were left alone.
- **Recurring posting is idempotent.** `usePostDue` posts due charges and salary payments (take-home pay to the bank plus CPF contributions to each CPF account) when the app opens. Unique keys from `0007` make a second device's attempt harmless.
- **The budget excludes recurring charges.** `useBudget` filters `recurring_id === null`; the Overview's money in and out still includes them.
- **Card bills are not auto-paid.** A credit-card payment is recorded as a transfer from a bank account to the card.
- **Calendars and date pickers are bespoke** (no calendar library), and all date maths goes through `date-fns`.
- **Destructive actions confirm** through `ConfirmDialog`.
- **Ask Finny** (an AI chat) has a tab slot and a button in the design but no screen in this build. Both are shown disabled.

### Further reading
`docs/superpowers/` holds the design history:
- the architecture and DB schema specs
- the stack recommendation
- the phased build plan
- the macOS spike and SideStore smoke-test reports, which explain most of the workarounds above
