import {
  contributionCents,
  etaMonths,
  goalProgress,
  goalShare,
  goalStatus,
  monthsUntil,
  potCents,
  reachDate,
  requiredMonthlyCents,
  type Goal,
} from '../goals';
import { freezeToday, resetToday } from '@/lib/today';

beforeEach(() => freezeToday('2026-09-24'));
afterEach(resetToday);

function goal(
  target_amount_cents: number,
  current_amount_cents: number,
  target_date: string | null = null,
): Goal {
  return { target_amount_cents, current_amount_cents, target_date };
}

describe('goalProgress', () => {
  it('reports saved, target, remaining and the fraction', () => {
    expect(goalProgress(goal(1_000_000, 250_000))).toEqual({
      savedCents: 250_000,
      targetCents: 1_000_000,
      remainingCents: 750_000,
      fraction: 0.25,
    });
  });

  it('reads an overfunded goal as 100% with nothing remaining', () => {
    expect(goalProgress(goal(1_000_000, 1_200_000))).toMatchObject({
      remainingCents: 0,
      fraction: 1,
    });
  });

  it('reads a zero target as complete rather than dividing by zero', () => {
    expect(goalProgress(goal(0, 0))).toMatchObject({
      remainingCents: 0,
      fraction: 1,
    });
  });
});

describe('monthsUntil', () => {
  it('counts whole months to the target date', () => {
    expect(monthsUntil('2026-11-30')).toBe(2);
    expect(monthsUntil('2027-09-01')).toBe(12);
  });

  it('floors at one month, for this month and for past dates', () => {
    expect(monthsUntil('2026-09-30')).toBe(1);
    expect(monthsUntil('2025-01-01')).toBe(1);
  });

  it('is empty with no deadline', () => {
    expect(monthsUntil(null)).toBeNull();
  });
});

describe('requiredMonthlyCents', () => {
  it('spreads what remains over the months left', () => {
    expect(requiredMonthlyCents(goal(1_000_000, 400_000, '2026-12-01'))).toBe(
      200_000,
    );
  });

  it('is zero once reached', () => {
    expect(requiredMonthlyCents(goal(1_000_000, 1_000_000, '2026-12-01'))).toBe(
      0,
    );
  });

  it('is empty for a goal with no deadline', () => {
    expect(requiredMonthlyCents(goal(1_000_000, 0))).toBeNull();
  });
});

describe('share and contribution', () => {
  // Needs S$2,000 a month.
  const needs2000 = goal(1_000_000, 400_000, '2026-12-01');

  it('takes the share of the pot the goal needs', () => {
    expect(goalShare(needs2000, 500_000)).toBe(0.4);
    expect(contributionCents(needs2000, 500_000)).toBe(200_000);
  });

  it('re-proportions when the pot changes', () => {
    expect(goalShare(needs2000, 1_000_000)).toBe(0.2);
  });

  it('caps the share at the whole pot', () => {
    expect(goalShare(needs2000, 150_000)).toBe(1);
    expect(contributionCents(needs2000, 150_000)).toBe(150_000);
  });

  it('takes nothing from an empty pot', () => {
    expect(goalShare(needs2000, 0)).toBe(0);
    expect(contributionCents(needs2000, 0)).toBe(0);
  });

  it('takes nothing for a reached goal or one with no deadline', () => {
    expect(goalShare(goal(1_000, 1_000, '2026-12-01'), 500_000)).toBe(0);
    expect(goalShare(goal(1_000_000, 0), 500_000)).toBe(0);
  });

  it('picks the pot by source', () => {
    const plan = { savingsCents: 100_000, investmentCents: 150_000 };

    expect(potCents('savings', plan)).toBe(100_000);
    expect(potCents('investment', plan)).toBe(150_000);
  });
});

describe('etaMonths', () => {
  it('rounds the months up at the given contribution', () => {
    expect(etaMonths(goal(1_000_000, 400_000), 250_000)).toBe(3);
  });

  it('is zero once reached', () => {
    expect(etaMonths(goal(1_000_000, 1_000_000), 0)).toBe(0);
  });

  it('is empty with no contribution', () => {
    expect(etaMonths(goal(1_000_000, 400_000), 0)).toBeNull();
  });
});

describe('reachDate', () => {
  it('is the ETA in months on from today', () => {
    // S$3,000 left at S$1,500 a month: two months.
    expect(reachDate(goal(2_400_000, 2_100_000), 150_000)).toBe('2026-11-24');
  });

  it('is today once reached, and null with no contribution', () => {
    expect(reachDate(goal(100, 100), 0)).toBe('2026-09-24');
    expect(reachDate(goal(100, 0), 0)).toBeNull();
  });
});

describe('goalStatus', () => {
  it('reads Reached', () => {
    expect(goalStatus(goal(1_000_000, 1_000_000, '2026-12-01'), 0)).toEqual({
      kind: 'reached',
      label: 'Reached',
    });
  });

  it('reads on track with the reach month', () => {
    expect(goalStatus(goal(1_000_000, 400_000, '2026-11-30'), 500_000)).toEqual(
      { kind: 'on-track', label: 'On track · Nov 2026' },
    );
  });

  it('reads the monthly shortfall when the pot cannot cover it', () => {
    // Needs S$2,000 a month, the pot holds S$1,820.
    expect(goalStatus(goal(1_000_000, 400_000, '2026-12-01'), 182_000)).toEqual(
      { kind: 'short', label: 'S$180/mo short' },
    );
  });

  it('stays on track within half a cent, so rounding cannot make it flicker to short', () => {
    // Needs 33,333.33 cents a month; the rounded contribution is 33,333.
    const thirds = goal(100_000, 0, '2026-12-01');

    expect(requiredMonthlyCents(thirds)).toBeCloseTo(33_333.33, 2);
    expect(contributionCents(thirds, 500_000)).toBe(33_333);
    expect(goalStatus(thirds, 500_000)).toEqual({
      kind: 'on-track',
      label: 'On track · Dec 2026',
    });
  });

  it('has its own state for a goal with no deadline', () => {
    expect(goalStatus(goal(1_000_000, 0), 500_000)).toEqual({
      kind: 'no-deadline',
      label: 'No target date',
    });
  });
});
