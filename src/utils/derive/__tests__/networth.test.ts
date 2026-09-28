import {
  assetClassSplit,
  cardsOwedCents,
  historySeries,
  monthDelta,
  netWorth,
  shareOfAssets,
  type NetWorthAccount,
  type Snapshot,
} from '../networth';

const classes = [
  { id: 1, label: 'Cash', color: null },
  { id: 2, label: 'CPF', color: null },
  { id: 3, label: 'Investments', color: null },
  { id: 4, label: 'Property', color: null },
  { id: 5, label: 'Other', color: null },
];

let nextId = 1;
function account(
  fields: Partial<NetWorthAccount> & Pick<NetWorthAccount, 'type'>,
): NetWorthAccount {
  const id = nextId++;
  return {
    id,
    name: `Account ${id}`,
    asset_class_id: null,
    balance_cents: 0,
    is_liability: false,
    is_active: true,
    ...fields,
  };
}

const dbs = account({
  type: 'Savings',
  name: 'DBS',
  asset_class_id: 1,
  balance_cents: 3_000_000,
});
const cpf = account({
  type: 'CPF',
  name: 'CPF OA',
  asset_class_id: 2,
  balance_cents: 5_000_000,
});
const ibkr = account({
  type: 'Broker',
  name: 'IBKR',
  asset_class_id: 3,
  balance_cents: 1_500_000,
});
const loose = account({
  type: 'Savings',
  name: 'Tin',
  asset_class_id: null,
  balance_cents: 500_000,
});
const empty = account({
  type: 'Savings',
  name: 'Empty',
  asset_class_id: 1,
  balance_cents: null,
});
const closed = account({
  type: 'Savings',
  name: 'Closed',
  asset_class_id: 1,
  balance_cents: 9_000_000,
  is_active: false,
});
const visa = account({
  type: 'Credit card',
  name: 'Visa',
  balance_cents: 120_000,
  is_liability: true,
});
const amex = account({
  type: 'Credit card',
  name: 'Amex',
  balance_cents: 30_000,
  is_liability: true,
});
const accounts = [dbs, cpf, ibkr, loose, empty, closed, visa, amex];

describe('netWorth', () => {
  it('is assets minus liabilities, with null balances as zero and inactive accounts left out', () => {
    expect(netWorth(accounts)).toEqual({
      assetsCents: 10_000_000,
      liabilitiesCents: 150_000,
      netCents: 9_850_000,
    });
  });

  it('is zero with no accounts', () => {
    expect(netWorth([])).toEqual({
      assetsCents: 0,
      liabilitiesCents: 0,
      netCents: 0,
    });
  });
});

describe('assetClassSplit', () => {
  const split = assetClassSplit(accounts, classes);

  it('orders classes by amount, largest first, leaving liabilities out', () => {
    expect(split.map(s => [s.label, s.cents])).toEqual([
      ['CPF', 5_000_000],
      ['Cash', 3_000_000],
      ['Investments', 1_500_000],
      ['Other', 500_000],
    ]);
  });

  it('has fractions summing to one', () => {
    expect(split.reduce((sum, s) => sum + s.fraction, 0)).toBeCloseTo(1, 10);
    expect(split[0]!.fraction).toBe(0.5);
  });

  it('buckets an account with no class into Other', () => {
    expect(split.find(s => s.label === 'Other')).toMatchObject({
      id: 5,
      cents: 500_000,
    });
  });

  it('drops a class with no balance, so an absent Property class does not render', () => {
    expect(split.map(s => s.label)).not.toContain('Property');
  });

  it('is empty with no assets', () => {
    expect(assetClassSplit([visa], classes)).toEqual([]);
  });
});

describe('shareOfAssets', () => {
  const rows = shareOfAssets(accounts);

  it('lists active asset accounts by balance, largest first, excluding credit cards', () => {
    expect(rows.map(r => r.name)).toEqual([
      'CPF OA',
      'DBS',
      'IBKR',
      'Tin',
      'Empty',
    ]);
  });

  it('gives each account its fraction of the total', () => {
    expect(rows[0]).toMatchObject({ cents: 5_000_000, fraction: 0.5 });
    expect(rows.at(-1)).toMatchObject({ cents: 0, fraction: 0 });
  });
});

describe('cardsOwedCents', () => {
  it('totals the active credit card balances', () => {
    expect(cardsOwedCents(accounts)).toBe(150_000);
    expect(cardsOwedCents([dbs])).toBe(0);
  });
});

function snapshot(
  date: string,
  total_cents: number,
  amounts: Record<string, number>,
  liabilities_cents = 0,
): Snapshot {
  return {
    date,
    total_cents,
    liabilities_cents,
    classes: Object.entries(amounts).map(([label, amount_cents]) => ({
      amount_cents,
      asset_class: classes.find(c => c.label === label)!,
    })),
  };
}

describe('historySeries', () => {
  const snapshots = [
    snapshot('2026-09-01', 11_000, {
      Cash: 3_000,
      Investments: 2_000,
      CPF: 5_000,
      Property: 1_000,
    }),
    snapshot(
      '2026-07-01',
      9_000,
      { Cash: 2_000, Investments: 2_000, CPF: 4_500 },
      500,
    ),
    snapshot(
      '2026-08-01',
      7_000,
      { Cash: 1_000, Investments: 2_500, CPF: 4_500 },
      1_000,
    ),
  ];
  const series = historySeries(snapshots);

  it('returns the points oldest first', () => {
    expect(series.map(p => p.date)).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
    ]);
  });

  it('stacks cash, then investments, then CPF, cumulatively', () => {
    expect(series[2]).toEqual({
      date: '2026-09-01',
      cash: 3_000,
      investments: 5_000,
      cpf: 10_000,
      net: 11_000,
    });
  });

  it('nests the four bands at every index, even when net dips under the stack', () => {
    // August: the stack reaches 8,000 but net worth is only 7,000.
    expect(series[1]!.net).toBe(8_000);
    for (const p of series) {
      expect(p.cash).toBeLessThanOrEqual(p.investments);
      expect(p.investments).toBeLessThanOrEqual(p.cpf);
      expect(p.cpf).toBeLessThanOrEqual(p.net);
    }
  });
});

describe('monthDelta', () => {
  it('compares the last two snapshots and names the earlier month', () => {
    expect(
      monthDelta([
        snapshot('2026-09-01', 11_000, {}),
        snapshot('2026-08-01', 10_000, {}),
        snapshot('2026-07-01', 1, {}),
      ]),
    ).toEqual({ deltaCents: 1_000, percent: 10, previousMonth: 'Aug' });
  });

  it('has no delta with fewer than two snapshots', () => {
    expect(monthDelta([])).toBeNull();
    expect(monthDelta([snapshot('2026-09-01', 11_000, {})])).toBeNull();
  });

  it('has no percentage against a zero month', () => {
    expect(
      monthDelta([
        snapshot('2026-08-01', 0, {}),
        snapshot('2026-09-01', 500, {}),
      ]),
    ).toEqual({ deltaCents: 500, percent: null, previousMonth: 'Aug' });
  });
});
