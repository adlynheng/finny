import { Platform, processColor } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { TradingScreen } from '../TradingScreen';
import { classes } from '../../../../test/classes';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import { testIDsInOrder } from '../../../../test/sheetCases';
import type { SupabaseStub } from '../../../../test/supabaseStub';
import { respondTrading } from '../../../../test/tradingFixtures';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;
const MINUS = '−';

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
  respondTrading(stub, accounts);
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

const text = (id: string) => screen.getByTestId(id);
// An SVG text's string sits in its span.
const svgText = (id: string) =>
  screen
    .getByTestId(id, { includeHiddenElements: true })
    .children.map(c => (typeof c === 'string' ? c : String(c.props.content)))
    .join('');
const flex = (id: string) =>
  classes(screen.getByTestId(id)).filter(c => /^(grow|basis)/.test(c));

describe('on macOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'macos'));

  it('lays out the design’s grid: 1.7fr 1fr over a 1.08fr panel', async () => {
    await open();
    expect(flex('trading-hero-cell')).toEqual(['grow-[1.7]', 'basis-0']);
    expect(flex('trading-health-cell')).toEqual(['grow', 'basis-0']);
    expect(flex('trading-panel-cell')).toEqual(['grow-[1.08]', 'basis-0']);
  });

  describe('the hero', () => {
    it('reads the whole book’s value in Growth mode, its P&L under it', async () => {
      await open();
      // S$42,589.41 worth on S$34,462.30 of cost.
      expect(text('trading-value')).toHaveTextContent('42,589');
      expect(text('trading-pnl-label')).toHaveTextContent(
        'Unrealised P&L · all positions',
      );
      expect(text('trading-pnl')).toHaveTextContent(
        '+S$8,127 (S$34,462 invested)',
      );
      expect(text('trading-pnl-sub')).toHaveTextContent('+23.6% on cost');
      expect(text('trading-period')).toHaveTextContent(/ over 6M$/);
      expect(screen.queryByTestId('symbol-picker')).toBeNull();
    });

    it('charts the capital invested beside the P&L, to date', async () => {
      await open();
      expect(
        screen.getByTestId('trading-chart-capital', {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
      // The legend names the lines only, right under the range toggle.
      expect(text('trading-legend')).toHaveTextContent(
        'Unrealised P&LCapital invested',
      );
      expect(classes(text('trading-legend'))).toContain('top-full');
      // Every open lot's cost, in S$: the book's cost basis.
      expect(text('trading-invested')).toHaveTextContent('(S$34,462 invested)');
    });

    it('charts one holding in Position mode, picked from the dropdown', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('trading-mode-position'));
      // The first holding until one is picked.
      expect(text('symbol-picker')).toHaveTextContent('C38U', { exact: false });
      expect(text('trading-pnl-label')).toHaveTextContent(
        'Unrealised P&L · C38U',
      );

      await fireEvent.press(text('symbol-picker'));
      const nvda = await screen.findByTestId('symbol-option-NVDA');
      expect(nvda).toHaveTextContent('NVDANVIDIA14%', { exact: false });
      await fireEvent.press(nvda);

      expect(screen.queryByTestId('symbol-picker-list')).toBeNull();
      expect(text('trading-pnl-label')).toHaveTextContent(
        'Unrealised P&L · NVDA',
      );
      // 25 × 178.40 × 1.3512, on 25 × 97.12 × 1.3512 of cost.
      expect(text('trading-value')).toHaveTextContent('6,026');
      expect(text('trading-pnl')).toHaveTextContent(
        '+S$2,746 (S$3,281 invested)',
      );
      expect(text('trading-pnl-sub')).toHaveTextContent('+83.7% on cost');
    });

    it('closes the dropdown on a press outside it', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('trading-mode-position'));
      await fireEvent.press(text('symbol-picker'));
      await fireEvent.press(await screen.findByTestId('symbol-picker-dismiss'));
      expect(screen.queryByTestId('symbol-picker-list')).toBeNull();
      expect(text('symbol-picker')).toHaveTextContent('C38U', { exact: false });
    });

    it('switches range', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('trading-range-1M'));
      await waitFor(() =>
        expect(text('trading-period')).toHaveTextContent(/ over 1M$/),
      );
      expect(useUiStore.getState().tradingRange).toBe('1M');
      // The strip starts 29 days back.
      expect(text('trading-strip-0')).toHaveTextContent('26 Aug', {
        exact: false,
      });
    });

    it('points at a strip sample, and the readout follows', async () => {
      await open();
      const first = text('trading-strip-0');
      expect(first).toHaveTextContent('Start of range', { exact: false });
      await fireEvent(text('trading-strip-3'), 'hoverIn');
      // 6M: 182 days from 27 Mar, the fourth sample 78 days in.
      expect(text('trading-pnl-label')).toHaveTextContent(
        'Unrealised P&L on 13 Jun',
      );
      // The value that day is its P&L on top of the cost.
      const pnl = Number(
        String(text('trading-pnl').props.children[0]).replace(/[^0-9]/g, ''),
      );
      const value = Number(
        String(text('trading-value').props.children).replace(/[^0-9]/g, ''),
      );
      // Each is rounded to the dollar on its own.
      expect(Math.abs(value - pnl - 34_462)).toBeLessThanOrEqual(1);
      expect(screen.getByTestId('trading-chart-halo')).toBeTruthy();
      await fireEvent(text('trading-strip-3'), 'hoverOut');
      expect(text('trading-pnl-label')).toHaveTextContent(
        'Unrealised P&L · all positions',
      );
    });
  });

  describe('portfolio health', () => {
    it('scores the book on the rings and gives a verdict', async () => {
      await open();
      expect(text('health-diversification')).toHaveTextContent('64', {
        exact: false,
      });
      expect(text('health-riskBalance')).toHaveTextContent('85', {
        exact: false,
      });
      expect(text('health-goalPace')).toHaveTextContent('81', { exact: false });
      expect(svgText('health-rings-score')).toBe('77');
      expect(text('health-verdict')).toHaveTextContent(
        'Healthy, slightly concentrated',
        { exact: false },
      );
    });

    it('lists the three ideas from the book', async () => {
      await open();
      expect(text('idea-Rebalance')).toHaveTextContent('Trim D05 toward 8%', {
        exact: false,
      });
      expect(text('idea-Review')).toHaveTextContent('TSLA is below your cost', {
        exact: false,
      });
      // S$62,450 in Interactive Brokers less S$42,589 held.
      expect(text('idea-Idea')).toHaveTextContent(
        'S$19,861 is sitting uninvested in Interactive Brokers.',
        { exact: false },
      );
    });

    it('shows Ask Finny faded and inert', async () => {
      await open();
      const ask = text('ask-finny');
      expect(ask.props.accessibilityState).toEqual({ disabled: true });
      expect(classes(ask)).toContain('opacity-disabled');
      expect(ask.props.onPress).toBeUndefined();
    });
  });

  describe('the Positions tab', () => {
    it('counts the holdings, the realised P&L and shows the rate', async () => {
      await open();
      expect(text('trading-tab-line')).toHaveTextContent(
        `5 holdings · Interactive Brokers · realised +US$413 · click a row for lots`,
        { exact: false },
      );
      expect(text('trading-rate')).toHaveTextContent('1.3512', {
        exact: false,
      });
    });

    it('stacks US$ over S$, exact in each holding’s own currency', async () => {
      await open();
      const nvda = within(text('position-NVDA'));
      expect(nvda.getByText('US$178.40')).toBeTruthy();
      expect(nvda.getByText('(S$241.05)')).toBeTruthy();
      const d05 = within(text('position-D05'));
      expect(d05.getByText('US$32.65')).toBeTruthy();
      expect(d05.getByText('(S$44.12)')).toBeTruthy();
      // A loss turns danger and has no lime dot.
      const tsla = within(text('position-TSLA'));
      expect(tsla.queryByTestId('pnl-up')).toBeNull();
      expect(classes(tsla.getByText(`${MINUS}US$235`))).toContain(
        'text-danger',
      );
    });

    it('colours only the P&L percentage: green up, red down', async () => {
      await open();
      const pct = (id: string) =>
        classes(within(text(id)).getByText(/^[+−]\d[\d.,]*%$/));
      expect(pct('position-NVDA')).toContain('text-gain');
      expect(pct('position-TSLA')).toContain('text-danger');
      expect(pct('positions-totals')).toContain('text-gain');
      // The money stays ink on a gain.
      expect(
        classes(within(text('position-NVDA')).getByText(/^\+US\$/)),
      ).toContain('text-ink');
    });

    it('opens a row onto its lots oldest first, then its sales', async () => {
      await open();
      await fireEvent.press(text('position-NVDA'));
      const ids = testIDsInOrder(text('position-NVDA-sub-area')).filter(id =>
        /^position-NVDA-(lot|sale)-/.test(id),
      );
      expect(ids).toEqual([
        'position-NVDA-lot-5',
        'position-NVDA-lot-6',
        'position-NVDA-sale-1',
      ]);
      expect(text('position-NVDA-lot-5')).toHaveTextContent(
        'Bought 7 Aug 2024Lot 1',
        { exact: false },
      );
      const sale = text('position-NVDA-sale-1');
      expect(sale).toHaveTextContent('Sold 14 Jul 2026Realised', {
        exact: false,
      });
      expect(sale).toHaveTextContent(`${MINUS}5`, { exact: false });
      expect(sale).toHaveTextContent('sale price', { exact: false });
      expect(sale).toHaveTextContent('+US$413', { exact: false });
    });

    it('gives each holding its total cost', async () => {
      await open();
      const nvda = within(text('position-NVDA'));
      // 15 × 82.60 + 10 × 118.90 = US$2,428.
      expect(nvda.getByText('US$2,428')).toBeTruthy();
      expect(nvda.getByText('(S$3,281)')).toBeTruthy();
    });

    it('totals cost, value and P&L', async () => {
      await open();
      const totals = text('positions-totals');
      expect(totals).toHaveTextContent('US$25,505', { exact: false });
      expect(totals).toHaveTextContent('(S$42,589)', { exact: false });
      expect(totals).toHaveTextContent('+US$6,015+23.6%(+S$8,127)', {
        exact: false,
      });
    });

    it('charts a holding from its row', async () => {
      await open();
      await fireEvent.press(text('position-D05-chart'));
      expect(useUiStore.getState()).toMatchObject({
        tradingMode: 'position',
        tradingSymbol: 'D05',
      });
      expect(text('symbol-picker')).toHaveTextContent('D05', { exact: false });
      expect(classes(text('position-D05'))).toContain('bg-row-selected');
      // The press did not open the row.
      expect(screen.queryByTestId('position-D05-sub-area')).toBeNull();
    });
  });

  describe('the Watchlist tab', () => {
    beforeEach(() => useUiStore.setState({ tradingTab: 'watchlist' }));

    it('lists held symbols, then those only watched', async () => {
      await open();
      const ids = testIDsInOrder(text('trading-panel')).filter(id =>
        /^watch-[A-Z0-9]+$/.test(id),
      );
      expect(ids).toEqual([
        'watch-C38U',
        'watch-D05',
        'watch-NVDA',
        'watch-TSLA',
        'watch-VWRA',
        'watch-QQQ',
      ]);
      expect(within(text('watch-NVDA')).getByTestId('watch-held')).toBeTruthy();
      expect(within(text('watch-QQQ')).queryByTestId('watch-held')).toBeNull();
    });

    it('charts a held symbol; an unheld one does nothing', async () => {
      await open();
      expect(text('watch-QQQ').props.accessibilityState).toMatchObject({
        disabled: true,
      });
      await fireEvent.press(text('watch-NVDA'));
      expect(useUiStore.getState().tradingSymbol).toBe('NVDA');
    });

    it('colours the day change and the trend by direction', async () => {
      await open();
      await screen.findByTestId('watch-TSLA-spark-line');
      expect(
        within(text('watch-TSLA')).getByText(`${MINUS}1.92%`),
      ).toBeTruthy();
      const stroke = (id: string) =>
        (screen.getByTestId(id).props.stroke as { payload: unknown }).payload;
      expect(stroke('watch-TSLA-spark-line')).toBe(processColor('#b4532f'));
      expect(stroke('watch-NVDA-spark-line')).toBe(processColor('#1c1c1a'));
    });
  });

  describe('the Portfolio tab', () => {
    beforeEach(() => useUiStore.setState({ tradingTab: 'portfolio' }));

    it('splits by type, adding up to 100%', async () => {
      await open();
      expect(text('trading-tab-line')).toHaveTextContent(
        '3 instrument types · 5 industries',
        { exact: false },
      );
      expect(text('mix-type-Stock')).toHaveTextContent(
        'Stocks3 holdings42.5%',
        { exact: false },
      );
      expect(text('mix-type-ETF')).toHaveTextContent('ETFs1 holding47.5%', {
        exact: false,
      });
      expect(text('mix-type-REIT')).toHaveTextContent('REITs1 holding10.0%', {
        exact: false,
      });
    });

    const layOut = (height: number) =>
      fireEvent(text('mix-ring-cell'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height } },
      });

    it('fills the tab’s height with the ring, up to 300, centred', async () => {
      await open();
      expect(classes(text('mix-ring-cell'))).toEqual(
        expect.arrayContaining(['justify-center', 'self-stretch']),
      );
      await layOut(240);
      expect(text('mix-ring').parent!.props.style).toEqual({
        width: 240,
        height: 240,
      });
      await layOut(420);
      expect(text('mix-ring').parent!.props.style).toEqual({
        width: 300,
        height: 300,
      });
    });

    it('dims the other types on hover and shows the type in the ring', async () => {
      await open();
      await layOut(260);
      await fireEvent(text('mix-type-ETF'), 'hoverIn');
      expect(classes(text('mix-type-Stock'))).toContain('opacity-[.45]');
      expect(classes(text('mix-type-ETF'))).not.toContain('opacity-[.45]');
      expect(svgText('mix-ring-primary')).toBe('48%');
      await fireEvent(text('mix-type-ETF'), 'hoverOut');
      expect(svgText('mix-ring-primary')).toBe('S$42.6k');
    });

    it('bars each industry against the largest', async () => {
      await open();
      expect(text('industry-Broad market-bar').props.style).toEqual({
        width: '100%',
      });
      const d05 = (882_400 / 2_023_861) * 100;
      expect(text('industry-Financials-bar').props.style).toEqual({
        width: `${d05}%`,
      });
    });
  });
});

describe('on iOS', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'ios'));

  it('stacks the hero, health card and panel in one column', async () => {
    await open();
    const order = ['trading-hero', 'health-card', 'trading-panel'];
    expect(
      testIDsInOrder(text('trading-column')).filter(id => order.includes(id)),
    ).toEqual(order);
    // The range sits under the chart.
    const hero = testIDsInOrder(text('trading-hero'));
    expect(hero.indexOf('trading-range')).toBeGreaterThan(
      hero.indexOf('trading-chart'),
    );
  });

  it('colours a card’s P&L percentage by its sign', async () => {
    await open();
    const pct = (id: string) =>
      classes(within(text(id)).getByText(/^[+−]\d[\d.,]*%$/));
    expect(pct('position-NVDA-toggle')).toContain('text-gain');
    expect(pct('position-TSLA-toggle')).toContain('text-danger');
    expect(pct('positions-totals')).toContain('text-gain');
  });

  it('opens a position card onto its figures, lots and actions', async () => {
    await open();
    await fireEvent.press(text('position-NVDA-toggle'));
    const details = within(text('position-NVDA-details'));
    expect(details.getByText('Avg cost')).toBeTruthy();
    expect(details.getByText('Sell')).toBeTruthy();
    expect(text('position-NVDA-lot-5')).toHaveTextContent('15 @ US$82.60', {
      exact: false,
    });
  });
});
