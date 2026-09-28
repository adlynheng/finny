import {
  cashFlowSeries,
  groupCategories,
  incomeName,
  monthTotals,
  savingsRate,
  type CashFlowTxn,
} from '../cashflow';

const categories = [
  { id: 1, name: 'Food' },
  { id: 2, name: 'Transport' },
  { id: 3, name: 'Refunds' },
];

function txn(
  date: string,
  kind: CashFlowTxn['kind'],
  amount_cents: number,
  category_id: number | null = null,
  description = '',
): CashFlowTxn {
  return { date, kind, amount_cents, category_id, description };
}

const september = [
  txn('2026-09-01', 'deposit', 500_000, null, 'September salary'),
  txn('2026-09-02', 'deposit', 2_000, 3, 'GST voucher'),
  txn('2026-09-03', 'expense', -1_000, 1),
  txn('2026-09-04', 'expense', -3_000, 1),
  txn('2026-09-05', 'expense', -2_000, 2),
  txn('2026-09-06', 'transfer', -100_000),
  txn('2026-09-06', 'transfer', 100_000),
];

describe('monthTotals', () => {
  it('totals money in and out, excluding transfers from both sides', () => {
    expect(monthTotals(september)).toEqual({
      inCents: 502_000,
      outCents: 6_000,
      netCents: 496_000,
    });
  });

  it('keeps to one month when given', () => {
    const mixed = [...september, txn('2026-08-31', 'expense', -9_000, 1)];

    expect(monthTotals(mixed, '2026-08')).toEqual({
      inCents: 0,
      outCents: 9_000,
      netCents: -9_000,
    });
  });

  it('is all zeros for an empty month', () => {
    expect(monthTotals([])).toEqual({ inCents: 0, outCents: 0, netCents: 0 });
  });
});

describe('savingsRate', () => {
  it('is the share of income kept', () => {
    expect(
      savingsRate({ inCents: 400_000, outCents: 100_000, netCents: 300_000 }),
    ).toBe(0.75);
  });

  it('clamps to zero when spending exceeds income', () => {
    expect(
      savingsRate({ inCents: 100_000, outCents: 150_000, netCents: -50_000 }),
    ).toBe(0);
  });

  it('is zero with no income', () => {
    expect(savingsRate({ inCents: 0, outCents: 5_000, netCents: -5_000 })).toBe(
      0,
    );
    expect(savingsRate({ inCents: 0, outCents: 0, netCents: 0 })).toBe(0);
  });
});

describe('cashFlowSeries', () => {
  it('returns one point per month, oldest first, ending on the given month', () => {
    const txns = [
      ...september,
      txn('2026-08-10', 'deposit', 400_000),
      txn('2026-08-11', 'expense', -50_000, 1),
      txn('2026-04-30', 'expense', -1, 1),
    ];

    const series = cashFlowSeries(txns, '2026-09', 6);

    expect(series.map(p => p.month)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(series[4]).toEqual({
      month: '2026-08',
      inCents: 400_000,
      outCents: 50_000,
      netCents: 350_000,
    });
    expect(series[1]).toMatchObject({ inCents: 0, outCents: 0 });
  });
});

describe('incomeName', () => {
  it.each([
    ['September SALARY', 'Salary'],
    ['NVDA dividend', 'Dividends'],
    ['Freelance – logo job', 'Freelance'],
  ])(
    'names "%s" %s from its description, ahead of the category',
    (description, name) => {
      expect(incomeName(description, 'Refunds')).toBe(name);
    },
  );

  it('falls back to the category name', () => {
    expect(incomeName('GST voucher', 'Refunds')).toBe('Refunds');
  });

  it('falls back to Other income', () => {
    expect(incomeName('Found money', null)).toBe('Other income');
  });
});

describe('groupCategories', () => {
  const groups = groupCategories(september, categories);

  it('groups spending by category, largest first, with counts', () => {
    expect(groups.spending.totalCents).toBe(6_000);
    expect(groups.spending.rows.map(r => [r.label, r.count, r.cents])).toEqual([
      ['Food', 2, 4_000],
      ['Transport', 1, 2_000],
    ]);
  });

  it('gives each row its fraction of the total and of the largest row', () => {
    const [food, transport] = groups.spending.rows;

    expect(food).toMatchObject({
      fractionOfTotal: 4_000 / 6_000,
      fractionOfMax: 1,
    });
    expect(transport).toMatchObject({
      fractionOfTotal: 2_000 / 6_000,
      fractionOfMax: 0.5,
    });
  });

  it('names income rows through the fallback chain', () => {
    expect(groups.income.rows.map(r => [r.label, r.count, r.cents])).toEqual([
      ['Salary', 1, 500_000],
      ['Refunds', 1, 2_000],
    ]);
  });

  it('leaves transfers out of both groups', () => {
    const counts = [...groups.spending.rows, ...groups.income.rows].map(
      r => r.count,
    );
    expect(counts.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('names spending with no category Uncategorised', () => {
    const rows = groupCategories(
      [txn('2026-09-01', 'expense', -100)],
      categories,
    ).spending.rows;
    expect(rows).toEqual([
      {
        label: 'Uncategorised',
        categoryId: null,
        count: 1,
        cents: 100,
        fractionOfTotal: 1,
        fractionOfMax: 1,
      },
    ]);
  });

  it('is empty for an empty month', () => {
    expect(groupCategories([], categories)).toEqual({
      spending: { totalCents: 0, rows: [] },
      income: { totalCents: 0, rows: [] },
    });
  });
});
