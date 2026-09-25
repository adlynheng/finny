# Finny — React Native Stack Recommendation

Status: agreed, not yet implemented
Date: 2026-09-25
Type: research/recommendation (spike), documented for reference

## Context

Finny is a personal finance app: a macOS app (primary) with a companion iOS
app, built in React Native. The visual design already exists as a Claude
Design project ("Personal finance app design",
`claude.ai/design/p/4d314f69-0cec-436b-b849-7de25709c8fc`), covering Overview,
Personal Finance, Trading, Goals & Planner, Settings, Ask Finny (chat), and
mobile-restacked variants of all of them.

This document records the library/framework decisions made while working out
how to build that exact design in React Native, and the reasoning behind
each, so the choices don't need to be re-derived later.

## Platform target

**`react-native-macos`** (Microsoft's native fork) for the macOS app, sharing
the same React Native codebase with the iOS companion app. This is the
standard choice for a small team explicitly committing to real React Native
across macOS + iOS, as opposed to:

- react-native-web wrapped in Electron/Tauri — chosen by teams that don't
  actually want native RN views on desktop, more of a web-first-adds-desktop
  pattern.
- A fully separate native Swift macOS app — only pays off with dedicated
  iOS/macOS specialists willing to build every screen twice.

**Implication that recurs through this doc:** `react-native-macos` has a
smaller, less battle-tested ecosystem than iOS/Android. Any native-module
dependency below is flagged for early validation on macOS specifically before
being relied on.

## Design language driving these choices

Read from `Pages.dc.html` (index only, imports per-page components) and
`FinnyOverview.dc.html` / `FinnyMobile.dc.html` (the actual screens):

- **Frosted glass everywhere** — nav pills, chips, badges, modals:
  translucent white fills, hairline borders, backdrop blur. Structural to the
  look, not decorative.
- **Gradient "hero" cards** per financial category (net-worth-history green,
  this-month olive/brown, share-of-assets gold, goals blue-brown).
- **Fully bespoke SVG charts**, not off-the-shelf chart types:
  - A wireframe "sphere" net-worth visualization: raw trigonometry
    generating ellipses + radiating tick lines sized by asset value, animated
    meridian rotation, pulsing top dot.
  - A multi-strand net-worth history line using custom spline smoothing with
    several interpolated "echo" strands, plus a crosshair/tooltip.
  - Radial dial gauges (budget: one tick per day; goals allocation: one tick
    per S$100), custom-tick, not a stock donut chart.
- **CSS-keyframe-grade animation**: slow ambient loops (rotate, scale,
  pulse), a staggered scale/fade-in for the sphere's ticks, drag-driven dial
  updates, hover/press transitions, sheet enter/exit.
- Tabs (desktop top pill / mobile floating bottom pill), bottom-sheet modals
  with an inline calendar, light typographic chrome (Urbanist, weight 300 for
  large numbers, tabular-nums) — otherwise unremarkable.

## Decisions

### 1. Headless component library — React Native Reusables

Almost nothing in the design is a standard button/input/select — the
behavioral surface actually needed is Modal/Sheet, Tabs, Popover (date
picker), Pressable states.

**Chosen:** React Native Reusables (`rn-primitives` + NativeWind — the
shadcn-for-RN pattern: primitives copied into the repo, not one opaque
dependency). Thin, minimal native-module surface, pairs directly with
NativeWind (decision 2).

**Rejected: Tamagui.** Explained fully under "Considered and rejected"
below — its payoff (theme tokens reused across many components) doesn't
apply to ~5 bespoke, one-off cards, and it doesn't reduce macOS risk, only
relocates it into a heavier, more opaque dependency.

### 2. Styling — NativeWind (Tailwind for RN)

Resolves `className` to RN style objects; carries no macOS-specific risk
since it's pure JS. Extend the Tailwind config with this design's tokens
(`#1c1c1a`, `#d8f23a`, `#efefec`, `#6b6a65`, the blur/shadow recipes) so the
long inline-style objects in the source `.dc.html` become reusable variants.

**Open risk — glass blur:** RN has no `backdrop-filter`. Plan is `expo-blur`
(`BlurView`, native `UIVisualEffectView`) on iOS; react-native-macos support
is unproven and needs an early spike. **Explicit constraint: no Skia, even as
a fallback** (see decision 3). If `BlurView` doesn't hold up on macOS, the
fallback is to degrade gracefully — a flat semi-opaque fill + hairline
border, no blur — on macOS specifically, keeping true blur on iOS where
`expo-blur` is solid. Not a renderer swap.

### 3. Charts / drawing primitive — react-native-svg (no chart library, no Skia)

No charting library (Victory Native, `react-native-gifted-charts`,
`react-native-chart-kit`) models the wireframe sphere, multi-strand spline
lines, or custom-tick radial gauges — adopting one would mean fighting its
API and still hand-rolling the bespoke pieces anyway. What's needed is a
drawing primitive, not a chart library.

**Chosen: `react-native-svg`.** The design's actual markup already is
literal `<svg>`/`<path>`/`<ellipse>` — closest to a direct port — and it has
the most mature, longest-standing macOS support of the options considered
(declarative SVG render, no GPU canvas engine to port).

**Explicitly excluded: `@shopify/react-native-skia`**, even as a fallback.
Skia would have been the more technically capable choice (GPU canvas,
built-in blur filters that could have solved decision 2's glass problem
natively), but its macOS bindings are community/experimental, and the
decision was made to keep zero GPU-canvas dependency in the stack rather
than carry that risk. If `react-native-svg` turns out insufficient for some
effect, the answer is to find an SVG-based approach, not to reach for Skia.

### 4. Animation — react-native-reanimated + react-native-gesture-handler

The visual vocabulary is light in mechanism (~5-6 CSS-keyframe-equivalent
effects), but two interactions are gesture-driven and continuous — the
allocation dial and budget dial are drag-to-set, and the sphere rotates
continuously. Plain RN `Animated` drives that from the JS thread and would
jank against real state updates.

**Chosen:** `react-native-reanimated` + `react-native-gesture-handler`,
driving animations on the UI thread. `useAnimatedStyle` +
`withRepeat`/`withTiming` map almost directly onto the existing
`fnSpin`/`fnPulse`/`fnGrow` CSS keyframes in the source design. Of everything
in this stack, this pairing is the **lowest** macOS risk — it's well-proven
cross-platform, including in Microsoft's own products.

**Rejected: Moti.** A thin declarative wrapper over Reanimated; for ~5-6
animation types total, the extra abstraction layer isn't earning its keep.
Use Reanimated directly.

### 5. Data fetching — `@tanstack/react-query` (unchanged from web)

Transport-agnostic, no DOM dependency — same package, same API as the web
app. No RN-specific replacement needed, no macOS risk (pure JS).

### 6. Client state — `zustand` (unchanged from web)

Same package, same API as the web app. The only adjustment: the `persist`
middleware's storage adapter changes from web's `localStorage` to an RN
adapter — see decision 8 for which one and why.

### 7. Routing — `@react-navigation/native` (replaces `react-router-dom`)

The one library in this set that's a genuine conceptual shift, not a
drop-in swap. RN has no browser/URL history to route against — routing is a
tree of **navigators** (Stack, Tab, Drawer) pushed/popped programmatically
(`navigation.navigate('ScreenName', params)`) rather than `<Link to="/path">`
against an address bar. "Back" is a native gesture/hardware button; nested
layouts are nested navigators, not nested `<Route>`s.

**Chosen:** `@react-navigation/native` + required peers `react-native-screens`
and `react-native-safe-area-context`. A `Stack.Navigator` for the tab
destinations; the design's floating pill bottom bar is fully custom, so it's
implemented as a custom `tabBar` render prop rather than the default chrome.

**Rejected: Expo Router**, despite being the more web-familiar option
(file-based routing with real URL-like paths, closer to `react-router-dom`'s
feel). It requires the Expo runtime/modules, whose official platform support
is iOS/Android/Web — not the `react-native-macos` fork this project targets.
Bare React Navigation has no such dependency.

### 8. Backend — Supabase, via `@supabase/supabase-js` (unchanged client, two RN-specific additions)

The Supabase client is isomorphic — same package, same query
builder/auth/realtime API as the web app, wrapped in `@tanstack/react-query`
the same way. Two gaps to fill for RN:

- **`react-native-url-polyfill`** (required) — RN's JS environment doesn't
  fully implement `URL`, which `supabase-js` depends on internally. Imported
  once at the app entry point, before anything else runs. Pure JS, no macOS
  risk.
- **Auth session storage adapter** — `supabase-js` needs somewhere to persist
  the login session between launches (`createClient(url, key, { auth:
  { storage } })`). The default RN answer is `AsyncStorage`, but that stores
  the session token in **plaintext** on disk — unacceptable for a finance
  app holding a credential to the user's bank/brokerage data.

  **Chosen: `react-native-keychain`** as the storage adapter — backed by the
  OS Keychain (hardware-backed on iOS, Keychain Services on macOS). Same
  macOS-validation caveat as other native modules in this stack: verify
  against `react-native-macos` specifically before relying on it.

Realtime subscriptions need no extra library — Supabase Realtime runs over
standard WebSocket, which RN supports natively.

## Considered and rejected: Tamagui

Tamagui is a UI/styling framework for React Native + Web: a themed component
library, a token system (colors/spacing/radii with light/dark variants), and
a build-time compiler that statically extracts styles for near-native
performance, plus its own animation driver.

It's the right tool for building a **themed design system** — one visual
language reused across dozens of components, where token consistency across
iOS/Android/Web from one codebase matters. It's the wrong tool here, for four
reasons:

1. This design isn't a themed component system — it's ~5 bespoke, one-off
   cards, not repeated variants of a shared primitive.
2. Its compiler adds real build-tooling weight (a Babel/SWC plugin; silent
   runtime-styling fallback when something doesn't statically extract) for a
   consistency payoff this project doesn't use.
3. It doesn't reduce macOS risk — react-native-macos isn't a first-class
   Tamagui target either (iOS/Android/Web are), so the same validation work
   is still required, against a heavier, more opaque dependency.
4. It overlaps entirely with decisions already made — NativeWind (styling),
   React Native Reusables (behavior primitives), Reanimated (animation).
   Adopting it means either running two competing styling systems or ripping
   out those choices to use Tamagui's own APIs instead.

## Final stack

- Platform: `react-native-macos` (macOS, primary) + `react-native` (iOS,
  companion)
- Components: React Native Reusables (`rn-primitives` + NativeWind)
- Styling: NativeWind
- Glass/blur: `expo-blur` (iOS proven; macOS to validate — flat-fill
  fallback on macOS if needed, no renderer swap)
- Charts/drawing: `react-native-svg` (no chart library; **no Skia**, not even
  as fallback)
- Animation/gesture: `react-native-reanimated` + `react-native-gesture-handler`
- Data fetching: `@tanstack/react-query`
- Client state: `zustand`
- Routing: `@react-navigation/native` + `react-native-screens` +
  `react-native-safe-area-context`
- Backend: `@supabase/supabase-js` + `react-native-url-polyfill` +
  `react-native-keychain` (auth session storage)

## Open risks to validate early (macOS-specific)

Everything above not already proven on `react-native-macos` should be
spiked before committing to the full build:

1. `expo-blur`'s `BlurView` on react-native-macos (decision 2).
2. `react-native-svg` animated paths on react-native-macos (decision 3) —
   lower risk than Skia would have been, but not yet confirmed for this
   project.
3. `react-native-keychain` on react-native-macos (decision 8).

`react-native-reanimated`, `react-native-gesture-handler`, and
`@react-navigation/native` are the least risky native dependencies in this
list and don't need dedicated validation spikes before starting.
