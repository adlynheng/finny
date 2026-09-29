import {
  healthScores,
  ideasFor,
  idleCash,
  overallScore,
  verdict,
} from '../ideas';
import { holdingsOf, totalsOf } from '../portfolio';
import { accounts } from '../../../../test/overviewFixtures';
import { RATE, positions, quotes } from '../../../../test/tradingFixtures';

const MINUS = '−';
const book = holdingsOf(positions, quotes, RATE);
const totals = totalsOf(book);

describe('healthScores', () => {
  it('scores the book', () => {
    // HHI .3159, tech 14.1%; single stocks 42.5%; 23.6% on cost.
    expect(healthScores(book, totals)).toEqual({
      diversification: 64,
      riskBalance: 85,
      goalPace: 81,
    });
  });

  it('penalises one holding and all-tech', () => {
    const nvda = book
      .filter(h => h.symbol === 'NVDA')
      .map(h => ({ ...h, weight: 1 }));
    // No diversification, less 40 for tech; single stocks at 100%; the NVDA return.
    expect(healthScores(nvda, totalsOf(nvda))).toEqual({
      diversification: 0,
      riskBalance: 0,
      goalPace: 93,
    });
  });

  it('holds every score to 0–100', () => {
    const scores = healthScores(book, { ...totals, pnlPercent: 900 });
    expect(scores.goalPace).toBe(100);
  });
});

it('averages the scores into the overall', () => {
  expect(overallScore([64, 85, 81])).toBe(77);
  expect(overallScore([70, 71, 71])).toBe(71);
  expect(overallScore([120, 100, -30])).toBe(67);
  expect(overallScore([])).toBe(0);
});

it('gives a verdict across two thresholds', () => {
  expect(verdict(80)).toBe('In good shape');
  expect(verdict(79)).toBe('Healthy, slightly concentrated');
  expect(verdict(65)).toBe('Healthy, slightly concentrated');
  expect(verdict(64)).toBe('Needs rebalancing');
});

describe('idleCash', () => {
  it('is the holdings’ account balance less their value', () => {
    expect(idleCash(book, accounts)).toEqual({
      accountName: 'Interactive Brokers',
      cents: 6_245_000 - totals.valueCents,
    });
  });

  it('is never negative, and null with no account', () => {
    const poor = accounts.map(a => ({ ...a, balance_cents: 0 }));
    expect(idleCash(book, poor)!.cents).toBe(0);
    expect(
      idleCash(
        book.map(h => ({ ...h, accountId: null })),
        accounts,
      ),
    ).toBeNull();
  });
});

describe('ideasFor', () => {
  const [trim, review, cash] = ideasFor(book, totals, {
    accountName: 'Interactive Brokers',
    cents: 420_000,
  });

  it('trims the largest single stock toward 8%, into the largest ETF', () => {
    // D05 is 20.7%: 12.7% of S$42,589 is about S$5,400.
    expect(trim).toEqual({
      tag: 'Rebalance',
      title: 'Trim D05 toward 8%',
      body: 'Now 21% of the portfolio and +22% on cost. Moving about S$5,400 into VWRA keeps single-stock risk in check.',
    });
  });

  it('reviews the worst performer on cost', () => {
    expect(review).toEqual({
      tag: 'Review',
      title: 'TSLA is below your cost',
      body: `${MINUS}8.9% on cost after a 1.9% drop today. Decide on an exit level.`,
    });
  });

  it('points idle cash at the largest ETF', () => {
    expect(cash).toEqual({
      tag: 'Idea',
      title: 'Put idle cash to work',
      body: 'S$4,200 is sitting uninvested in Interactive Brokers. VWRA would put it to work without adding single-stock risk.',
    });
  });

  it('says so when nothing is idle, or no stock is over 8%', () => {
    const spread = book.map(h => ({ ...h, weight: 0.05 }));
    const [calm, , invested] = ideasFor(spread, totals, {
      accountName: 'Interactive Brokers',
      cents: 5_000,
    });
    expect(calm!.title).toBe('No stock above 8%');
    expect(invested!.title).toBe('Cash is fully invested');
  });

  it('says a winner is closest to cost', () => {
    const winners = book.filter(h => h.pnlPercent > 0);
    expect(ideasFor(winners, totals, null)[1]!.title).toBe(
      'C38U is closest to your cost',
    );
  });

  it('has nothing to say about an empty book', () => {
    expect(ideasFor([], totals, null)).toEqual([]);
  });
});
