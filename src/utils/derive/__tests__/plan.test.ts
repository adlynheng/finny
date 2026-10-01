import type {
  CategoryRow,
  IncomeSourceRow,
  RecurringChargeRow,
} from '@/types/domain';
import {
  allocatedCents,
  commitmentGroups,
  fixedCostsCents,
  grossIncomeCents,
  leftLabel,
  leftToAllocateCents,
  sliderCents,
  sliderFraction,
  typedAllocation,
} from '../plan';

function source(
  base_income_cents: number,
  frequency: string,
  is_active = true,
): IncomeSourceRow {
  return {
    id: 1,
    name: 'Salary',
    employer: null,
    type: 'salary',
    base_income_cents,
    frequency,
    custom_every: null,
    custom_unit: null,
    start_date: '2026-01-25',
    payday: null,
    account_id: null,
    is_active,
    last_posted_date: null,
  };
}

function charge(
  id: number,
  name: string,
  category_id: number | null,
  amount_cents: number,
  frequency: string,
  is_active = true,
): RecurringChargeRow {
  return {
    id,
    name,
    category_id,
    account_id: null,
    amount_cents,
    frequency,
    custom_every: null,
    custom_unit: null,
    start_date: '2026-09-01',
    end_date: null,
    is_active,
    last_posted_date: null,
  };
}

const categories: CategoryRow[] = [
  {
    id: 5,
    name: 'Housing',
    kind: 'expense',
    icon: 'Housing',
    is_recurring: true,
  },
  {
    id: 7,
    name: 'Insurance',
    kind: 'expense',
    icon: 'Insurance',
    is_recurring: true,
  },
];

const plan = {
  investmentCents: 200_000,
  savingsCents: 200_000,
  expenditureCents: 350_000,
};

describe('grossIncomeCents', () => {
  it('adds every active source as a monthly equivalent', () => {
    expect(
      grossIncomeCents([
        source(1_200_000, 'monthly'),
        // S$120 a week is S$520 a month.
        source(12_000, 'weekly'),
        source(999_999, 'monthly', false),
        source(50_000, 'fortnightly'),
      ]),
    ).toBe(1_252_000);
  });
});

describe('fixedCostsCents', () => {
  it('adds every active charge as a monthly equivalent, unrounded', () => {
    expect(
      fixedCostsCents([
        charge(1, 'Loan', 5, 114_000, 'monthly'),
        charge(2, 'Term life', 7, 18_600, 'quarterly'),
        charge(3, 'Old gym', 7, 9_800, 'monthly', false),
        charge(4, 'Cleaner', null, 6_000, 'weekly'),
      ]),
    ).toBeCloseTo(114_000 + 6_200 + 26_000);
  });
});

describe('commitmentGroups', () => {
  const groups = commitmentGroups(
    [
      charge(1, 'HDB home loan', 5, 114_000, 'monthly'),
      charge(2, 'AIA HealthShield', 7, 62_400, 'yearly'),
      charge(3, 'Great Eastern term life', 7, 18_600, 'quarterly'),
      charge(4, 'Home cleaner', null, 6_000, 'weekly'),
      charge(5, 'Old gym', 7, 9_800, 'monthly', false),
    ],
    categories,
  );

  it('groups by category, largest first, each with its share of the whole', () => {
    expect(groups.map(g => [g.name, Math.round(g.cents)])).toEqual([
      ['Housing', 114_000],
      ['Uncategorised', 26_000],
      ['Insurance', 11_400],
    ]);
    expect(groups[0]!.share).toBeCloseTo(114_000 / 151_400);
    expect(groups.reduce((sum, g) => sum + g.share, 0)).toBeCloseTo(1);
  });

  it('counts each group’s charges and names them largest first', () => {
    expect(groups[2]).toMatchObject({
      key: '7',
      icon: 'Insurance',
      detail: '2 charges · Great Eastern term life, AIA HealthShield',
    });
    expect(groups[1]).toMatchObject({
      key: 'none',
      icon: null,
      detail: '1 charge · Home cleaner',
    });
  });
});

describe('leftToAllocateCents', () => {
  const left = (p = plan) =>
    leftToAllocateCents({
      grossCents: 1_200_000,
      cpfCents: 240_000,
      fixedCents: 153_398.33,
      plan: p,
    });

  it('is gross less CPF, fixed costs and the three allocations, in whole dollars', () => {
    expect(allocatedCents(plan)).toBe(750_000);
    // 12,000 − 2,400 − 1,533.98 − 7,500 = 566.02.
    expect(left()).toBe(56_600);
  });

  it('lands on exactly zero, never −0, despite the fixed costs’ fractions', () => {
    expect(Object.is(left({ ...plan, expenditureCents: 406_600 }), 0)).toBe(
      true,
    );
    expect(Object.is(left({ ...plan, expenditureCents: 406_602 }), 0)).toBe(
      true,
    );
  });

  it('goes negative when the plan is over income', () => {
    expect(left({ ...plan, expenditureCents: 500_000 })).toBe(-93_400);
  });
});

describe('leftLabel', () => {
  it('reads by sign, with its own line at exactly zero', () => {
    expect(leftLabel(100)).toEqual({ text: 'left to allocate', tone: 'muted' });
    expect(leftLabel(0)).toEqual({
      text: 'All allocated · every dollar has a job',
      tone: 'ink',
    });
    expect(leftLabel(-100)).toEqual({ text: 'over income', tone: 'danger' });
  });
});

describe('the slider', () => {
  it('snaps to S$50 along a S$5,000 track, and clamps to it', () => {
    expect(sliderCents(0.5)).toBe(250_000);
    // 1/3 of S$5,000 is S$1,666.67: the nearest step is S$1,650.
    expect(sliderCents(1 / 3)).toBe(165_000);
    expect(sliderCents(0.004)).toBe(0);
    expect(sliderCents(-0.2)).toBe(0);
    expect(sliderCents(1.4)).toBe(500_000);
  });

  it('places an amount along the track, past the end at the end', () => {
    expect(sliderFraction(125_000)).toBe(0.25);
    expect(sliderFraction(700_000)).toBe(1);
  });
});

describe('typedAllocation', () => {
  it('keeps at most five digits, as whole dollars', () => {
    expect(typedAllocation('S$2,450', 1_200_000)).toEqual({
      text: '2450',
      cents: 245_000,
    });
    expect(typedAllocation('1234567', 9_999_900)).toEqual({
      text: '12345',
      cents: 1_234_500,
    });
  });

  it('clamps to gross income, and reads nothing as zero', () => {
    expect(typedAllocation('99999', 1_200_000)).toEqual({
      text: '99999',
      cents: 1_200_000,
    });
    expect(typedAllocation('', 1_200_000)).toEqual({ text: '', cents: 0 });
  });
});
