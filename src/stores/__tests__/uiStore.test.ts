import { initialUiState, useUiStore } from '../uiStore';
import { freezeToday, resetToday } from '@/lib/today';

afterEach(resetToday);

/** The store reset to how it opens on `date`. */
function loadStore(date = '2026-09-24') {
  freezeToday(date);
  useUiStore.setState(initialUiState());
  return useUiStore;
}

it('opens on the design’s defaults, with this month selected', () => {
  const state = loadStore().getState();

  expect(state).toMatchObject({
    historyRange: 24,
    hoveredAssetClassId: null,
    hoveredAccountId: null,
    tradingMode: 'growth',
    tradingSymbol: null,
    tradingRange: '6M',
    tradingTab: 'positions',
    expandedSymbols: [],
    transactionsMonth: '2026-09',
    transactionsFilter: 'all',
    transactionsSearch: '',
    transactionsView: 'list',
    cashFlowView: 'savings',
    calendarMonth: '2026-09',
    settingsPanel: 'accounts',
    selectedCardId: null,
    newTransactionOpen: false,
  });
});

it('switches to Position mode when a symbol is picked', () => {
  const store = loadStore();

  store.getState().selectTradingSymbol('NVDA');

  expect(store.getState()).toMatchObject({
    tradingMode: 'position',
    tradingSymbol: 'NVDA',
  });
});

it('expands and collapses position rows by symbol', () => {
  const store = loadStore();
  const { toggleExpanded } = store.getState();

  toggleExpanded('NVDA');
  toggleExpanded('AAPL');
  expect(store.getState().expandedSymbols).toEqual(['NVDA', 'AAPL']);

  toggleExpanded('NVDA');
  expect(store.getState().expandedSymbols).toEqual(['AAPL']);
});

it('keeps the transactions filter, search and month when the view changes', () => {
  const store = loadStore();
  store.getState().set({
    transactionsFilter: 'out',
    transactionsSearch: 'kopi',
    transactionsMonth: '2026-08',
  });

  store.getState().set({ transactionsView: 'categories' });
  store.getState().set({ transactionsView: 'list' });

  expect(store.getState()).toMatchObject({
    transactionsFilter: 'out',
    transactionsSearch: 'kopi',
    transactionsMonth: '2026-08',
  });
});
