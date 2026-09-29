/**
 * View state shared between components: selections, toggles and hovers that one card sets and
 * another reads. Nothing here is saved, so nothing survives a relaunch (no `persist`), and
 * nothing duplicates a Supabase row.
 */

import { create } from 'zustand';

import type { BarRange, SnapshotWindow } from '@/lib/queryKeys';
import { today } from '@/lib/today';

export type TradingMode = 'growth' | 'position';
export type TradingTab = 'positions' | 'watchlist' | 'portfolio';
export type TransactionsFilter = 'all' | 'in' | 'out' | 'transfers';
export type TransactionsView = 'list' | 'categories';
export type CashFlowView = 'savings' | 'cashflow';
export type SettingsPanel = 'accounts' | 'expenditure' | 'deposit' | 'fixed';

type UiFields = {
  /** Overview net worth history card. */
  historyRange: SnapshotWindow;
  /** Overview sphere and share-of-assets card, hovered together. */
  hoveredAssetClassId: number | null;
  /** Settings accounts panel and share-of-assets card, hovered together. */
  hoveredAccountId: number | null;

  tradingMode: TradingMode;
  /** The holding charted in Position mode. */
  tradingSymbol: string | null;
  tradingRange: BarRange;
  /** The Trading panel's Positions / Watchlist / Portfolio tab. */
  tradingTab: TradingTab;
  /** Positions rows open to show their lots, by symbol. */
  expandedSymbols: string[];

  /** Personal Finance transactions card, `YYYY-MM`. */
  transactionsMonth: string;
  transactionsFilter: TransactionsFilter;
  transactionsSearch: string;
  transactionsView: TransactionsView;
  cashFlowView: CashFlowView;
  /** Upcoming payments calendar, `YYYY-MM`. */
  calendarMonth: string;

  settingsPanel: SettingsPanel;
  selectedCardId: number | null;

  /** The new-transaction form: the FAB and the This month card's button both open it. */
  newTransactionOpen: boolean;
};

type UiActions = {
  /** Sets any of the fields above. */
  set: (patch: Partial<UiFields>) => void;
  /** Picking a holding charts it, which only Position mode does. */
  selectTradingSymbol: (symbol: string) => void;
  toggleExpanded: (symbol: string) => void;
};

/** How the app opens: the design's defaults, with this month selected. */
export function initialUiState(): UiFields {
  const month = today().slice(0, 7);
  return {
    historyRange: 24,
    hoveredAssetClassId: null,
    hoveredAccountId: null,
    tradingMode: 'growth',
    tradingSymbol: null,
    tradingRange: '1M',
    tradingTab: 'positions',
    expandedSymbols: [],
    transactionsMonth: month,
    transactionsFilter: 'all',
    transactionsSearch: '',
    transactionsView: 'list',
    cashFlowView: 'savings',
    calendarMonth: month,
    settingsPanel: 'accounts',
    selectedCardId: null,
    newTransactionOpen: false,
  };
}

export const useUiStore = create<UiFields & UiActions>()(set => ({
  ...initialUiState(),
  set: patch => set(patch),
  selectTradingSymbol: symbol =>
    set({ tradingSymbol: symbol, tradingMode: 'position' }),
  toggleExpanded: symbol =>
    set(state => ({
      expandedSymbols: state.expandedSymbols.includes(symbol)
        ? state.expandedSymbols.filter(s => s !== symbol)
        : [...state.expandedSymbols, symbol],
    })),
}));
