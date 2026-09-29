import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { TradingScreen } from '../TradingScreen';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';
import { instruments, respondTrading } from '../../../../test/tradingFixtures';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
  respondTrading(stub, accounts);
  jest.replaceProperty(Platform, 'OS', 'macos');
});
afterEach(() => {
  resetToday();
  jest.restoreAllMocks();
});

async function open() {
  await renderWithClient(
    <>
      <TradingScreen />
      <PortalHost />
    </>,
  );
  await screen.findByTestId('trading-chart');
}

const byId = (id: string) => screen.getByTestId(id);
const has = (id: string, text: string | RegExp) =>
  expect(byId(id)).toHaveTextContent(text, { exact: false });
const field = (label: string) => screen.getByLabelText(label);
const primary = (label: string) => screen.getAllByLabelText(label).at(-1)!;

describe('selling', () => {
  async function sellNvda() {
    await open();
    await fireEvent.press(byId('position-NVDA-sell'));
    await screen.findByTestId('sell-summary');
  }

  it('opens on the holding at its latest price', async () => {
    await sellNvda();
    expect(screen.getByText('Sell NVDA')).toBeTruthy();
    has('sheet-subtitle', 'NVIDIA · you hold 25 shares');
    expect(field('Price per share').props.value).toBe('178.40');
    has('sell-alt', '≈ S$241.05 per share');
    has('sell-left', 'Enter a quantity and price · to Interactive Brokers');
  });

  it('says so, rather than only disabling, when selling more than is held', async () => {
    await sellNvda();
    await fireEvent.changeText(field('Quantity'), '30');
    has('sell-left', 'That is more than you hold');
    expect(primary('Record sale').props.accessibilityState.disabled).toBe(true);
  });

  it('closes the position when selling it all', async () => {
    await sellNvda();
    await fireEvent.press(byId('sell-all'));
    expect(field('Quantity').props.value).toBe('25');
    has('sell-left', '0 shares left after this sale · position closes');
  });

  it('prices a lot-spanning sale oldest first, and records it', async () => {
    stub.respond('rpc:record_sale', { data: 9, error: null });
    await sellNvda();
    await fireEvent.changeText(field('Quantity'), '20');
    // 20 × 178.40 = US$3,568; on 15 × 82.60 + 5 × 118.90 = US$1,833.50 of cost.
    has('sell-proceeds', 'US$3,568 (S$4,821)');
    has('sell-pnl', '+US$1,735 (+S$2,344)');
    has('sell-left', '5 shares left after this sale');

    await fireEvent.press(primary('Record sale'));
    await waitFor(() =>
      expect(screen.queryByTestId('sell-summary')).toBeNull(),
    );
    expect(stub.chainsFor('rpc:record_sale')[0]![0]).toEqual([
      'rpc',
      {
        p_instrument_id: 3,
        p_account_id: 4,
        p_quantity: 20,
        p_price_per_unit_cents: 17_840,
        p_sold_at: '2026-09-24',
        p_lots: [
          { id: 5, quantity: 15, remaining: 0 },
          { id: 6, quantity: 10, remaining: 5 },
        ],
      },
    ]);
    // The row opens to show the sale.
    expect(useUiStore.getState().expandedSymbols).toContain('NVDA');
  });

  it('sends the proceeds where chosen', async () => {
    stub.respond('rpc:record_sale', { data: 9, error: null });
    await sellNvda();
    await fireEvent.changeText(field('Quantity'), '5');
    await fireEvent.press(screen.getByLabelText('DBS Multiplier'));
    has('sell-left', 'to DBS Multiplier');
    await fireEvent.press(primary('Record sale'));
    await waitFor(() => expect(stub.rpc).toHaveBeenCalled());
    expect(
      (stub.chainsFor('rpc:record_sale')[0]![0]![1] as { p_account_id: number })
        .p_account_id,
    ).toBe(1);
  });
});

describe('adding', () => {
  async function openAdd() {
    await open();
    await fireEvent.press(byId('add-position'));
    await screen.findByText('New position');
  }

  it('starts empty, asking for a symbol', async () => {
    await openAdd();
    has('add-note', 'Pick a symbol or type one');
    expect(screen.getAllByLabelText('Add position').length).toBeGreaterThan(1);
    expect(screen.queryByTestId('add-locked')).toBeNull();
  });

  it('adds a lot to a held symbol, its market, type and industry locked', async () => {
    await openAdd();
    await fireEvent.press(screen.getByLabelText('NVDA'));
    expect(field('Symbol').props.value).toBe('NVDA');
    expect(field('Name').props.value).toBe('NVIDIA');
    expect(field('Price per share').props.value).toBe('178.40');
    has('add-note', 'Adds a lot to your NVDA position (25 shares held)');
    expect(screen.getAllByTestId('add-locked')).toHaveLength(3);
    expect(primary('Add lot')).toBeTruthy();
  });

  it('fills a watched symbol from its instrument, unlocked', async () => {
    await openAdd();
    await fireEvent.press(screen.getByLabelText('QQQ'));
    expect(field('Name').props.value).toBe('Invesco QQQ');
    has('add-note', 'Invesco QQQ · last US$512.30');
    expect(screen.queryByTestId('add-locked')).toBeNull();
    expect(
      screen.getByTestId('add-kind-ETF').props.accessibilityState.selected,
    ).toBe(true);
  });

  it('calls a symbol it has never seen a new holding, upper-cased as typed', async () => {
    await openAdd();
    await fireEvent.changeText(field('Symbol'), 'voo');
    expect(field('Symbol').props.value).toBe('VOO');
    has('add-note', 'New holding');
    // A new symbol needs its name before it saves.
    await fireEvent.changeText(field('Quantity'), '2');
    await fireEvent.changeText(field('Price per share'), '500');
    expect(primary('Add position').props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.changeText(field('Name'), 'Vanguard S&P 500');
    expect(primary('Add position').props.accessibilityState.disabled).toBe(
      false,
    );
    has('add-total', 'US$1,000 (S$1,351)');
  });

  it('saves a lot and shows it on the Positions tab', async () => {
    useUiStore.setState({ tradingTab: 'watchlist' });
    // The instrument list, then the save's lookup of NVDA.
    stub.respond(
      'instrument',
      { data: Object.values(instruments), error: null },
      { data: { id: 3, position: [{ id: 3 }] }, error: null },
      { data: Object.values(instruments), error: null },
    );
    stub.respond('lot', { data: { id: 40 }, error: null });
    await openAdd();
    await fireEvent.press(screen.getByLabelText('NVDA'));
    await fireEvent.changeText(field('Quantity'), '5');
    await fireEvent.press(primary('Add lot'));

    await waitFor(() => expect(screen.queryByText('New position')).toBeNull());
    expect(stub.chainsFor('lot')[0]![0]).toEqual([
      'insert',
      {
        position_id: 3,
        quantity: 5,
        cost_per_unit_cents: 17_840,
        purchased_at: '2026-09-24',
      },
    ]);
    expect(useUiStore.getState()).toMatchObject({
      tradingTab: 'positions',
      expandedSymbols: ['NVDA'],
    });
  });
});
