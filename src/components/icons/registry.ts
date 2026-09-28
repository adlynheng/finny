/**
 * Every icon in the design, as the single SVG path string it draws on a
 * 16×16 viewBox (stroked, never filled). Paths are copied from the design
 * files, not redrawn, apart from their dots (see OTHER).
 *
 * `category.icon` stores a registry key (`'Groceries'`), never a path, so the
 * icon set can change without a data migration. Every lookup falls back to
 * `Other`, so an unknown or missing key never renders as an empty box.
 */

import type { AccountType, CategoryKind, TxnKind } from '@/types/domain';

/**
 * The design draws dots as zero-length lines (`M4 8h.01`), which render only
 * as wide as the stroke. Each is redrawn as a circle of radius .55, which the
 * 1.1 stroke fills into a solid dot twice that size.
 */
const OTHER =
  'M3.45 8a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0 M7.45 8a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0 M11.45 8a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0';

/** Expenditure categories, in the Settings picker's order. */
export const expenseIcons = {
  Food: 'M3 6h8v4a3 3 0 01-3 3H6a3 3 0 01-3-3z M11 7h1.5a1.5 1.5 0 010 3H11 M5.5 2.5v1.5 M8.5 2.5v1.5',
  Groceries: 'M3.5 5.5h9l-.8 8h-7.4z M6 5.5V4.5a2 2 0 014 0v1',
  Transport:
    'M2.5 10.5v-2l1.5-3.5h8l1.5 3.5v2z M2.5 10.5v2h2v-2 M11.5 10.5v2h2v-2 M4.5 8.5h1 M10.5 8.5h1',
  Shopping:
    'M2.5 8.5V2.5h6l5 5-6 6z M4.95 5.5a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0',
  Utilities: 'M9 1.5L3.5 9H8l-1 5.5L12.5 7H8z',
  Subscriptions: 'M4 2.5h6l2.5 2.5v8.5h-8.5z M10 2.5V5h2.5 M6 8h4 M6 10.5h4',
  Health: 'M6 2.5h4V6h3.5v4H10v3.5H6V10H2.5V6H6z',
  Housing: 'M2.5 7.5L8 3l5.5 4.5 M4 6.5v7h8v-7 M6.5 13.5v-3.5h3v3.5',
  Travel: 'M2 9.5l12-5-3 9-3-3.5z M8 10l-1.5 3',
  // Insurance, Bills and Services are in the Personal Finance design's set,
  // not the Settings picker's.
  Insurance: 'M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z',
  Bills: 'M4 2.5h8v11l-2-1-2 1-2-1-2 1z M6 6h4 M6 8.5h4',
  Services:
    'M8 2v3.5 M8 10.5V14 M2 8h3.5 M10.5 8H14 M4.5 4.5l1.5 1.5 M10 10l1.5 1.5 M11.5 4.5L10 6 M6 10l-1.5 1.5',
  Other: OTHER,
} as const;

/** Deposit categories, from the Settings design's deposit panel. */
export const depositIcons = {
  Salary:
    'M2 4.5h12v7H2z M7.45 8a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0 M4.5 6.5v3 M11.5 6.5v3',
  Bonus:
    'M3 7h10v6.5H3z M2.5 4.5h11V7h-11z M8 4.5v9 M8 4.5C6.5 2 4.5 2.5 5 4.5 M8 4.5c1.5-2.5 3.5-2 3-.01',
  Dividends: 'M2.5 12.5l3.5-4 3 2.5 4.5-6 M10 5h3.5v3.5',
  Interest:
    'M4 12l8-8 M4.45 5a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0 M10.45 11a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0',
  Refunds: 'M3 6.5h7.5a3 3 0 010 6H7 M5.5 4L3 6.5 5.5 9',
  Transfers: 'M2.5 5.5h10 M10 3l2.5 2.5L10 8 M13.5 10.5h-10 M6 8l-2.5 2.5L6 13',
  Other: OTHER,
} as const;

/** Transactions shown by their kind rather than their category. */
export const transactionKindIcons = {
  Transfer: 'M14 2L2 7l5 2 2 5z M14 2L7 9',
} as const;

/** `account.type`, from the Settings accounts panel. */
export const accountTypeIcons: Record<AccountType, string> = {
  Savings: 'M3 7.5a5 4.5 0 0110 0v3.5H3z M6 5h4 M5 11v2 M11 11v2',
  CPF: 'M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z',
  Broker: 'M2.5 12.5l3.5-4 3 2.5 4.5-6 M10 5h3.5v3.5',
  'Credit card': 'M2 4.5h12v8H2z M2 7h12 M4.5 10.5h2',
};

/** Portfolio health's "Today's ideas". */
export const ideaIcons = {
  Rebalance: 'M2.5 5.5h9 M9 3l2.5 2.5L9 8 M13.5 10.5h-9 M7 8l-2.5 2.5L7 13',
  Review:
    'M8 2.5l5.5 10h-11z M8 6.5v3 M7.45 11.2a.55 .55 0 1 0 1.1 0a.55 .55 0 1 0-1.1 0',
  Idea: 'M6 12.5h4 M6.5 14h3 M8 2a4 4 0 00-2.4 7.2c.5.4.9 1 .9 1.8h3c0-.8.4-1.4.9-1.8A4 4 0 008 2z',
} as const;

/** The mobile tab bar, left to right around the centre button. */
export const tabIcons = {
  overview:
    'M8 2a6 6 0 110 12A6 6 0 018 2z M2 8h12 M8 2c2.2 2 2.2 10 0 12 M8 2c-2.2 2-2.2 10 0 12',
  finance: 'M2.5 4.5h11v8h-11z M2.5 7h11 M10.5 10h1.5',
  trading: 'M2.5 12.5l3.5-4 3 2.5 4.5-6 M10 5h3.5v3.5',
  plan: 'M8 2a6 6 0 110 12A6 6 0 018 2z M8 5a3 3 0 110 6 3 3 0 010-6z M8 7.6v.8',
  finny:
    'M8 1.5l1.4 4.1 4.1 1.4-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4z M12.5 11.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z',
  settings: 'M2.5 5h11 M2.5 11h11 M5.5 3.5v3 M10.5 9.5v3',
} as const;

export type ExpenseIconKey = keyof typeof expenseIcons;
export type DepositIconKey = keyof typeof depositIcons;
export type IdeaIconKey = keyof typeof ideaIcons;
export type TabIconKey = keyof typeof tabIcons;

const categoryRegistries: Record<CategoryKind, Record<string, string>> = {
  expense: expenseIcons,
  deposit: depositIcons,
};

/** Looks a key up in a registry's own keys only, never its prototype. */
function lookup(
  registry: Record<string, string>,
  key: string | null | undefined,
): string | undefined {
  return key && Object.hasOwn(registry, key) ? registry[key] : undefined;
}

/** The keys a category drawer's icon picker offers, in order. */
export function categoryIconKeys(kind: CategoryKind): string[] {
  return Object.keys(categoryRegistries[kind]);
}

/** A category's icon, from its kind's own set; `Other` when unknown or unset. */
export function categoryIcon(
  kind: CategoryKind,
  key: string | null | undefined,
): string {
  return lookup(categoryRegistries[kind], key) ?? OTHER;
}

/** An account type's icon; `Other` for a type the app does not know. */
export function accountTypeIcon(type: string): string {
  return lookup(accountTypeIcons, type) ?? OTHER;
}

/**
 * A transaction row's icon: transfers show the Transfer icon whatever their
 * category; expenses and deposits show their category's icon.
 */
export function transactionIcon(
  kind: TxnKind,
  categoryKey: string | null | undefined,
): string {
  return kind === 'transfer'
    ? transactionKindIcons.Transfer
    : categoryIcon(kind, categoryKey);
}
