import {
  byIndustry,
  capitalSeries,
  byType,
  holdingsOf,
  pnlSeries,
  totalsOf,
} from '../portfolio';
import { RATE, positions, quotes } from '../../../../test/tradingFixtures';

const book = () => holdingsOf(positions, quotes, RATE);
const find = (symbol: string) => book().find(h => h.symbol === symbol)!;

describe('holdingsOf', () => {
  it('values a US listing in S$ at the rate', () => {
    const nvda = find('NVDA');
    expect(nvda).toMatchObject({
      currency: 'USD',
      quantity: 25,
      avgCostCents: 9_712, // (15 × 82.60 + 10 × 118.90) / 25
      priceCents: 17_840,
      fx: RATE,
      valueCents: 602_635,
      costCents: 328_071,
      pnlCents: 274_564,
    });
    expect(nvda.pnlPercent).toBeCloseTo(83.69, 2);
  });

  it('leaves an SGX listing in S$', () => {
    expect(find('D05')).toMatchObject({
      currency: 'SGD',
      fx: 1,
      valueCents: 882_400,
      costCents: 724_500,
      pnlCents: 157_900,
    });
  });

  it('weighs each holding by market value', () => {
    const weights = book().map(h => h.weight);
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(find('VWRA').weight).toBeCloseTo(0.4752, 4);
  });

  it('lists lots oldest first', () => {
    const shuffled = [
      { ...positions[4]!, lots: [...positions[4]!.lots].reverse() },
    ];
    expect(
      holdingsOf(shuffled, quotes, RATE)[0]!.lots.map(l => l.purchased_at),
    ).toEqual(['2024-03-12', '2024-10-03', '2026-06-18']);
  });

  it('holds an unquoted symbol at cost, with no price', () => {
    const rest = { ...quotes };
    delete rest.TSLA;
    const tsla = holdingsOf(positions, rest, RATE).find(
      h => h.symbol === 'TSLA',
    )!;
    expect(tsla.priceCents).toBeNull();
    expect(tsla.valueCents).toBe(tsla.costCents);
    expect(tsla.pnlCents).toBe(0);
  });

  it('leaves out a position with no lots', () => {
    const closed = [...positions, { ...positions[0]!, id: 9, lots: [] }];
    expect(holdingsOf(closed, quotes, RATE)).toHaveLength(5);
  });
});

it('totals the book', () => {
  const totals = totalsOf(book());
  expect(totals).toMatchObject({
    valueCents: 4_258_941,
    costCents: 3_446_230,
    pnlCents: 812_711,
  });
  expect(totals.pnlPercent).toBeCloseTo(23.58, 2);
  expect(totalsOf([]).pnlPercent).toBe(0);
});

describe('pnlSeries', () => {
  const bar = (date: string, closeCents: number) => ({ date, closeCents });

  it('sums each holding’s value at the close less its cost, in S$', () => {
    const [nvda, d05] = [find('NVDA'), find('D05')];
    const { dates, values } = pnlSeries([nvda, d05], {
      NVDA: [bar('2026-09-23', 17_000), bar('2026-09-24', 17_840)],
      D05: [bar('2026-09-23', 4_300), bar('2026-09-24', 4_412)],
    });
    expect(dates).toEqual(['2026-09-23', '2026-09-24']);
    expect(values).toEqual([
      Math.round(17_000 * 25 * RATE - 328_071 + 4_300 * 200 - 724_500),
      Math.round(17_840 * 25 * RATE - 328_071 + 4_412 * 200 - 724_500),
    ]);
  });

  it('ends on the holdings’ own P&L at today’s prices', () => {
    const today = Object.fromEntries(
      Object.entries(quotes).map(([s, q]) => [
        s,
        [bar('2026-09-24', q.priceCents)],
      ]),
    );
    expect(pnlSeries(book(), today).values).toEqual([
      totalsOf(book()).pnlCents,
    ]);
  });

  it('adds today at the latest price when the closes stop at the last session', () => {
    const [nvda, d05] = [find('NVDA'), find('D05')];
    const closes = {
      NVDA: [bar('2026-09-23', 17_000)],
      D05: [bar('2026-09-23', 4_300)],
    };
    const { dates, values } = pnlSeries([nvda], closes, '2026-09-24');
    expect(dates).toEqual(['2026-09-23', '2026-09-24']);
    expect(values[1]).toBe(nvda.pnlCents);
    // With no price, or no closes to lead up to it, nothing is added.
    const unpriced = { ...d05, priceCents: null };
    expect(pnlSeries([unpriced], closes, '2026-09-24').dates).toEqual([
      '2026-09-23',
    ]);
    expect(pnlSeries([nvda], {}, '2026-09-24').dates).toEqual([]);
  });

  it('carries a missing day forward, and counts nothing before the first', () => {
    const d05 = find('D05');
    const { values } = pnlSeries([d05], {
      D05: [bar('2026-09-23', 4_000)],
    });
    expect(values).toEqual([4_000 * 200 - 724_500]);
    const both = pnlSeries([find('NVDA'), d05], {
      NVDA: [bar('2026-09-22', 17_840), bar('2026-09-24', 17_840)],
      D05: [bar('2026-09-23', 4_000)],
    });
    const nvda = Math.round(17_840 * 25 * RATE - 328_071);
    expect(both.values).toEqual([
      nvda,
      nvda + 4_000 * 200 - 724_500,
      nvda + 4_000 * 200 - 724_500,
    ]);
  });

  it('is empty with no closes', () => {
    expect(pnlSeries(book(), {})).toEqual({ dates: [], values: [] });
  });
});

describe('capitalSeries', () => {
  it('steps up on each lot’s purchase date, in S$', () => {
    const nvda = find('NVDA'); // 15 on 7 Aug 2024 at 82.60, 10 on 22 Apr 2025 at 118.90
    expect(
      capitalSeries(
        [nvda],
        ['2024-08-06', '2024-08-07', '2025-04-21', '2025-04-22', '2026-09-24'],
      ),
    ).toEqual([
      0,
      Math.round(15 * 8_260 * RATE),
      Math.round(15 * 8_260 * RATE),
      Math.round((15 * 8_260 + 10 * 11_890) * RATE),
      Math.round((15 * 8_260 + 10 * 11_890) * RATE),
    ]);
  });

  it('ends on the book’s cost basis once every lot is bought', () => {
    const [last] = capitalSeries(book(), ['2026-09-24']);
    expect(Math.abs(last! - totalsOf(book()).costCents)).toBeLessThanOrEqual(5);
  });

  it('is empty with no days', () => {
    expect(capitalSeries(book(), [])).toEqual([]);
  });
});

it('splits by instrument type, stocks first', () => {
  const types = byType(book());
  expect(types.map(t => [t.kind, t.count, t.cents])).toEqual([
    ['Stock', 3, 882_400 + 602_635 + 326_045],
    ['ETF', 1, 2_023_861],
    ['REIT', 1, 424_000],
  ]);
  expect(types.reduce((s, t) => s + t.share, 0)).toBeCloseTo(1, 10);
});

it('splits by industry, largest first, scaled to the largest', () => {
  const industries = byIndustry(book());
  expect(industries.map(i => [i.name, i.symbols])).toEqual([
    ['Broad market', ['VWRA']],
    ['Financials', ['D05']],
    ['Tech', ['NVDA']],
    ['Real estate', ['C38U']],
    ['Consumer', ['TSLA']],
  ]);
  expect(industries[0]!.ofLargest).toBe(1);
  expect(industries[1]!.ofLargest).toBeCloseTo(882_400 / 2_023_861, 10);
  expect(industries.reduce((s, i) => s + i.share, 0)).toBeCloseTo(1, 10);
});
