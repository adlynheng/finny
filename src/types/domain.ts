/**
 * Hand-written types on top of the generated `database.ts` (regenerate that with `yarn db:types`).
 *
 * Postgres check constraints do not reach the generated types, so every enumerated text column
 * comes back as `string`. The const arrays below are the TypeScript side of those constraints;
 * src/types/__tests__/domain.test.ts fails if they drift from the migrations.
 */

import type { Tables, TablesInsert, TablesUpdate } from './database';
import { cardThemes, type CardThemeName } from '@/theme/gradients';

export type SettingsRow = Tables<'settings'>;
export type SettingsInsert = TablesInsert<'settings'>;
export type SettingsUpdate = TablesUpdate<'settings'>;

export type AssetClassRow = Tables<'asset_class'>;
export type AssetClassInsert = TablesInsert<'asset_class'>;
export type AssetClassUpdate = TablesUpdate<'asset_class'>;

export type AccountRow = Tables<'account'>;
export type AccountInsert = TablesInsert<'account'>;
export type AccountUpdate = TablesUpdate<'account'>;

export type CardRow = Tables<'card'>;
export type CardInsert = TablesInsert<'card'>;
export type CardUpdate = TablesUpdate<'card'>;

export type CategoryRow = Tables<'category'>;
export type CategoryInsert = TablesInsert<'category'>;
export type CategoryUpdate = TablesUpdate<'category'>;

export type GoalRow = Tables<'goal'>;
export type GoalInsert = TablesInsert<'goal'>;
export type GoalUpdate = TablesUpdate<'goal'>;

export type InstrumentRow = Tables<'instrument'>;
export type InstrumentInsert = TablesInsert<'instrument'>;
export type InstrumentUpdate = TablesUpdate<'instrument'>;

export type RecurringChargeRow = Tables<'recurring_charge'>;
export type RecurringChargeInsert = TablesInsert<'recurring_charge'>;
export type RecurringChargeUpdate = TablesUpdate<'recurring_charge'>;

export type IncomeSourceRow = Tables<'income_source'>;
export type IncomeSourceInsert = TablesInsert<'income_source'>;
export type IncomeSourceUpdate = TablesUpdate<'income_source'>;

export type TxnRow = Tables<'txn'>;
export type TxnInsert = TablesInsert<'txn'>;
export type TxnUpdate = TablesUpdate<'txn'>;

export type PositionRow = Tables<'position'>;
export type PositionInsert = TablesInsert<'position'>;
export type PositionUpdate = TablesUpdate<'position'>;

export type LotRow = Tables<'lot'>;
export type LotInsert = TablesInsert<'lot'>;
export type LotUpdate = TablesUpdate<'lot'>;

export type SaleRow = Tables<'sale'>;
export type SaleInsert = TablesInsert<'sale'>;
export type SaleUpdate = TablesUpdate<'sale'>;

export type NetWorthSnapshotRow = Tables<'net_worth_snapshot'>;
export type NetWorthSnapshotInsert = TablesInsert<'net_worth_snapshot'>;
export type NetWorthSnapshotUpdate = TablesUpdate<'net_worth_snapshot'>;

export type NetWorthSnapshotClassRow = Tables<'net_worth_snapshot_class'>;
export type NetWorthSnapshotClassInsert = TablesInsert<'net_worth_snapshot_class'>;
export type NetWorthSnapshotClassUpdate = TablesUpdate<'net_worth_snapshot_class'>;

export type WatchlistItemRow = Tables<'watchlist_item'>;
export type WatchlistItemInsert = TablesInsert<'watchlist_item'>;
export type WatchlistItemUpdate = TablesUpdate<'watchlist_item'>;

/** `account.type`, in the order the Settings panel groups accounts. */
export const ACCOUNT_TYPES = ['Savings', 'CPF', 'Broker', 'Credit card'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** `account.cpf_type`: which CPF account a CPF-type account is. */
export const CPF_TYPES = ['OA', 'SA', 'MA'] as const;
export type CpfType = (typeof CPF_TYPES)[number];

/** `card.card_type` */
export const CARD_TYPES = ['credit', 'debit'] as const;
export type CardType = (typeof CARD_TYPES)[number];

/** `category.kind`: expense categories and deposit categories share one table. */
export const CATEGORY_KINDS = ['expense', 'deposit'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** `txn.kind`: transfers are excluded from income and expense totals. */
export const TXN_KINDS = ['expense', 'deposit', 'transfer'] as const;
export type TxnKind = (typeof TXN_KINDS)[number];

/** `goal.src`: the pot a goal draws from. */
export const GOAL_SOURCES = ['savings', 'investment'] as const;
export type GoalSource = (typeof GOAL_SOURCES)[number];

/** `recurring_charge.frequency` and `income_source.frequency` */
export const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

/** `custom_unit` on both recurring tables, used when the frequency is 'custom'. */
export const CUSTOM_UNITS = ['days', 'weeks', 'months'] as const;
export type CustomUnit = (typeof CUSTOM_UNITS)[number];

/** `income_source.type` */
export const INCOME_TYPES = ['salary', 'freelance', 'other'] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

/** `instrument.kind`, as the trade form's Instrument control offers it. */
export const INSTRUMENT_KINDS = ['Stock', 'ETF', 'REIT'] as const;
export type InstrumentKind = (typeof INSTRUMENT_KINDS)[number];

/** `card.color_theme`, keyed to the card face gradients. */
export const CARD_THEMES = Object.keys(cardThemes) as CardThemeName[];
export type CardTheme = CardThemeName;

/**
 * Narrows a column read from the database to its union. Use it wherever a row's enumerated
 * column is branched on, and treat `false` as unknown data rather than casting.
 */
export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
