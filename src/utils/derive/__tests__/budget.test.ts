import {
  dailyAverageCents,
  dailySpend,
  daysRemaining,
  elapsedDays,
  evenPaceCents,
  monthSpentCents,
  paceStatus,
  safeDailyCents,
  usage,
  type BudgetTxn,
} from '../budget';
import { appSettings } from '@/config/appSettings';
import { freezeToday, resetToday } from '@/lib/today';

afterEach(resetToday);

function txn(
  date: string,
  kind: BudgetTxn['kind'],
  amount_cents: number,
): BudgetTxn {
  return { date, kind, amount_cents };
}

const september = [
  txn('2026-09-01', 'expense', -1_000),
  txn('2026-09-01', 'expense', -500),
  txn('2026-09-03', 'expense', -2_000),
  txn('2026-09-03', 'deposit', 500_000),
  txn('2026-09-04', 'transfer', -100_000),
  txn('2026-09-30', 'expense', -700),
  txn('2026-08-31', 'expense', -9_999),
  txn('2026-10-01', 'expense', -9_999),
];

describe('dailySpend', () => {
  it.each([
    ['2026-09', 30],
    ['2026-02', 28],
    ['2028-02', 29],
    ['2026-10', 31],
  ])('has one bucket per day of %s', (month, days) => {
    expect(dailySpend([], month)).toHaveLength(days);
  });

  it('buckets expenses as positive cents, ignoring deposits, transfers and other months', () => {
    const buckets = dailySpend(september, '2026-09');

    expect(buckets[0]).toBe(1_500);
    expect(buckets[1]).toBe(0);
    expect(buckets[2]).toBe(2_000);
    expect(buckets[3]).toBe(0);
    expect(buckets[29]).toBe(700);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(4_200);
  });
});

describe('month totals and pace', () => {
  it('totals the month, or up to a cut-off day', () => {
    expect(monthSpentCents(september, '2026-09')).toBe(4_200);
    expect(monthSpentCents(september, '2026-09', 3)).toBe(3_500);
    expect(monthSpentCents(september, '2026-09', 0)).toBe(0);
  });

  it('paces the limit evenly through the month, landing on the limit on the last day', () => {
    expect(evenPaceCents(300_000, '2026-09', 10)).toBe(100_000);
    expect(evenPaceCents(300_000, '2026-09', 30)).toBe(300_000);
    expect(evenPaceCents(310_000, '2026-10', 31)).toBe(310_000);
  });

  it('reads under pace, including exactly on pace', () => {
    expect(paceStatus(80_000, 300_000, '2026-09', 10)).toEqual({
      kind: 'under',
      label: 'S$200 under pace',
    });
    expect(paceStatus(100_000, 300_000, '2026-09', 10).kind).toBe('under');
  });

  it('reads over pace', () => {
    expect(paceStatus(112_000, 300_000, '2026-09', 10)).toEqual({
      kind: 'over',
      label: 'S$120 over pace',
    });
  });

  it('averages spend over the days elapsed', () => {
    expect(dailyAverageCents(30_000, 10)).toBe(3_000);
    expect(dailyAverageCents(30_000, 0)).toBe(0);
  });
});

describe('days', () => {
  beforeEach(() => freezeToday('2026-09-24'));

  it('counts today as elapsed in the current month, all of a past month, none of a future one', () => {
    expect(elapsedDays('2026-09')).toBe(24);
    expect(elapsedDays('2026-08')).toBe(31);
    expect(elapsedDays('2026-10')).toBe(0);
  });

  it('counts the days left including today, all of a future month, none of a past one', () => {
    expect(daysRemaining('2026-09')).toBe(7);
    expect(daysRemaining('2026-09', '2026-09-30')).toBe(1);
    expect(daysRemaining('2026-09', '2026-09-01')).toBe(30);
    expect(daysRemaining('2026-10')).toBe(31);
    expect(daysRemaining('2026-08')).toBe(0);
  });
});

describe('safeDailyCents', () => {
  beforeEach(() => freezeToday('2026-09-24'));

  it('spreads what is left of the limit over the days remaining, today included', () => {
    expect(safeDailyCents(300_000, 230_000, '2026-09')).toBe(10_000);
  });

  it('leaves the whole remainder for the last day', () => {
    expect(safeDailyCents(300_000, 250_000, '2026-09', '2026-09-30')).toBe(
      50_000,
    );
  });

  it('floors at zero once over the limit', () => {
    expect(safeDailyCents(300_000, 340_000, '2026-09')).toBe(0);
  });

  it('is zero with no days left, once the month is over', () => {
    expect(safeDailyCents(300_000, 100_000, '2026-08')).toBe(0);
  });
});

describe('usage', () => {
  it('is the fraction of the limit spent, with no flags when well under', () => {
    expect(usage(150_000, 300_000)).toEqual({
      fraction: 0.5,
      overLimit: false,
      warn: false,
    });
  });

  it('warns from exactly the configured threshold', () => {
    const limit = 100_000;
    const atThreshold = limit * appSettings.budgetWarnThreshold;

    expect(usage(atThreshold - 1, limit).warn).toBe(false);
    expect(usage(atThreshold, limit).warn).toBe(true);
  });

  it('is not clamped above 1, so the centre label can read 114%', () => {
    expect(usage(342_000, 300_000)).toEqual({
      fraction: 1.14,
      overLimit: true,
      warn: true,
    });
  });

  it('reaching the limit exactly is not over it', () => {
    expect(usage(300_000, 300_000).overLimit).toBe(false);
  });

  it('has no fraction for a zero limit, and any spend is over it', () => {
    expect(usage(0, 0)).toEqual({
      fraction: null,
      overLimit: false,
      warn: false,
    });
    expect(usage(500, 0)).toEqual({
      fraction: null,
      overLimit: true,
      warn: true,
    });
  });
});
