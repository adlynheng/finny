import { Platform } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { fetchBars, fetchQuotes } from '@/lib/marketData';
import { supabase } from '@/lib/supabase';
import { freezeToday, resetToday } from '@/lib/today';
import { initialUiState, useUiStore } from '@/stores/uiStore';
import { TradingScreen } from '../TradingScreen';
import { stubBars, stubQuotes } from '../../../../test/marketDataStub';
import { accounts } from '../../../../test/overviewFixtures';
import { renderWithClient } from '../../../../test/queryTestUtils';
import type { SupabaseStub } from '../../../../test/supabaseStub';
import { respondTrading } from '../../../../test/tradingFixtures';

jest.mock('@/lib/supabase', () => ({
  supabase: require('../../../../test/supabaseStub').createSupabaseStub(),
}));

const stub = supabase as unknown as SupabaseStub;
const quotesMock = fetchQuotes as jest.Mock;
const barsMock = fetchBars as jest.Mock;
const fetchMock = global.fetch as jest.Mock;

const never = () => new Promise<never>(() => {});

beforeEach(() => {
  stub.reset();
  freezeToday('2026-09-24');
  useUiStore.setState(initialUiState());
  respondTrading(stub, accounts);
  jest.replaceProperty(Platform, 'OS', 'macos');
});
afterEach(() => {
  resetToday();
  quotesMock.mockReset().mockImplementation(stubQuotes);
  barsMock.mockReset().mockImplementation(stubBars);
  fetchMock
    .mockReset()
    .mockImplementation(() => Promise.reject(new Error('No network')));
  jest.restoreAllMocks();
});

const render = () =>
  renderWithClient(
    <>
      <TradingScreen />
      <PortalHost />
    </>,
  );
const text = (id: string) => screen.getByTestId(id);
const row = (symbol: string) => within(text(`position-${symbol}`));

describe('live data', () => {
  it('asks for held and watched symbols once, deduplicated', async () => {
    await render();
    await screen.findByTestId('trading-chart');
    expect(quotesMock).toHaveBeenCalledTimes(1);
    // NVDA is both held and watched.
    expect(quotesMock).toHaveBeenCalledWith([
      'C38U',
      'D05',
      'NVDA',
      'QQQ',
      'TSLA',
      'VWRA',
    ]);
  });

  it('switching range fetches closes, not quotes', async () => {
    await render();
    await screen.findByTestId('trading-chart');
    await fireEvent.press(text('trading-range-3M'));
    await waitFor(() =>
      expect(barsMock).toHaveBeenCalledWith(expect.any(String), '3M'),
    );
    expect(quotesMock).toHaveBeenCalledTimes(1);
  });

  it('shows the live rate and when it was fetched', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rates: { SGD: 1.2764 } }),
      }),
    );
    await render();
    await waitFor(() =>
      expect(text('trading-rate')).toHaveTextContent('1.2764'),
    );
    expect(text('trading-rate-time')).not.toHaveTextContent(/stale|fallback/);
    expect(text('trading-rate-dot').props.className).toContain('bg-lime-dark');
  });
});

describe('while prices load', () => {
  beforeEach(() => quotesMock.mockImplementation(never));

  it('shows skeletons for every price-dependent figure, never a zero', async () => {
    await render();
    await screen.findByTestId('trading-chart');

    expect(screen.getByTestId('trading-value-loading')).toBeTruthy();
    expect(screen.getByTestId('trading-pnl-loading')).toBeTruthy();
    expect(screen.queryByText(/S\$0\b/)).toBeNull();
    // Price, value and P&L on each row and in the totals.
    expect(row('NVDA').getAllByTestId('skeleton')).toHaveLength(3);
    expect(
      within(text('positions-totals')).getAllByTestId('skeleton'),
    ).toHaveLength(2);
  });

  it('keeps the cost columns', async () => {
    await render();
    await screen.findByTestId('trading-chart');
    // NVDA: 25 at an average US$97.12.
    expect(row('NVDA').getByText('US$97.12')).toBeTruthy();
    expect(row('NVDA').getByText('25')).toBeTruthy();
  });

  it('skeletons the watchlist prices and the portfolio mix', async () => {
    await render();
    await screen.findByTestId('trading-chart');
    useUiStore.setState({ tradingTab: 'watchlist' });
    expect(
      await within(await screen.findByTestId('watch-QQQ')).findAllByTestId(
        'skeleton',
      ),
    ).toHaveLength(2);
    useUiStore.setState({ tradingTab: 'portfolio' });
    expect(await screen.findByTestId('mix-loading')).toBeTruthy();
    expect(screen.queryByTestId('mix-ring')).toBeNull();
  });
});

describe('when quotes fail', () => {
  beforeEach(() =>
    quotesMock.mockImplementation(() =>
      Promise.reject(new Error('FunctionsHttpError')),
    ),
  );

  it('says so quietly, dashes the prices and keeps the cost basis', async () => {
    await render();
    await screen.findByTestId('quote-error');

    expect(text('quote-error')).toHaveTextContent('Prices unavailable', {
      exact: false,
    });
    expect(text('trading-value')).toHaveTextContent('—');
    expect(text('trading-pnl')).toHaveTextContent('— (S$34,462 invested)');
    expect(row('NVDA').getAllByText('—')).toHaveLength(3);
    expect(row('NVDA').getByText('US$97.12')).toBeTruthy();
    expect(screen.queryByTestId('skeleton')).toBeNull();
  });

  it('retries on request, and prices fill in', async () => {
    await render();
    await screen.findByTestId('quote-error');
    quotesMock.mockImplementation(stubQuotes);

    await fireEvent.press(text('quote-retry'));

    await waitFor(() =>
      expect(text('trading-value')).toHaveTextContent('42,589'),
    );
    expect(screen.queryByTestId('quote-error')).toBeNull();
  });
});

it('dashes a holding with no quote, such as an SGX listing, on its own', async () => {
  quotesMock.mockImplementation(async (symbols: string[]) => {
    const all = await stubQuotes(symbols);
    delete all.D05;
    return all;
  });
  await render();
  await screen.findByTestId('trading-chart');

  expect(row('D05').getAllByText('—')).toHaveLength(3);
  // Its average cost stays, S$36.23 under its US$ figure.
  expect(row('D05').getByText(/S\$36\.2\d/)).toBeTruthy();
  expect(row('NVDA').getByText('US$178.40')).toBeTruthy();
  expect(screen.queryByTestId('quote-error')).toBeNull();
});

describe('the rate’s age', () => {
  it('names the fallback before any fetch succeeds', async () => {
    await render();
    await screen.findByTestId('trading-chart');
    expect(text('trading-rate')).toHaveTextContent('1.3512');
    expect(text('trading-rate-time')).toHaveTextContent('fallback rate');
    expect(text('trading-rate-dot').props.className).toContain('bg-danger');
  });

  it('marks a rate fetched over three hours ago stale', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rates: { SGD: 1.2764 } }),
      }),
    );
    freezeToday(new Date('2026-09-24T09:00:00'));
    await render();
    await waitFor(() =>
      expect(text('trading-rate')).toHaveTextContent('1.2764'),
    );

    freezeToday(new Date('2026-09-24T12:30:00'));
    useUiStore.setState({ tradingTab: 'watchlist' });

    await waitFor(() =>
      expect(text('trading-rate-time')).toHaveTextContent('· stale', {
        exact: false,
      }),
    );
    expect(text('trading-rate-dot').props.className).toContain('bg-danger');
  });
});
