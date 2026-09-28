import {
  intervalLabel,
  monthlyEquivalentCents,
  nextDue,
  occurrencesInMonth,
  periodSuffix,
  stepDate,
  type Schedule,
} from '../recurrence';
import { freezeToday, resetToday } from '@/lib/today';

afterEach(resetToday);

function schedule(
  frequency: Schedule['frequency'],
  start_date: string,
  extra: Partial<Schedule> = {},
): Schedule {
  return {
    frequency,
    start_date,
    custom_every: null,
    custom_unit: null,
    end_date: null,
    ...extra,
  };
}

const everyTenDays = { custom_every: 10, custom_unit: 'days' } as const;
const everyTwoWeeks = { custom_every: 2, custom_unit: 'weeks' } as const;
const everyTwoMonths = { custom_every: 2, custom_unit: 'months' } as const;
const everyOneMonth = { custom_every: 1, custom_unit: 'months' } as const;

describe('stepDate', () => {
  it.each([
    [schedule('weekly', '2026-09-24'), 1, '2026-10-01'],
    [schedule('weekly', '2026-09-24'), -2, '2026-09-10'],
    [schedule('monthly', '2026-09-24'), 1, '2026-10-24'],
    [schedule('monthly', '2026-01-15'), -1, '2025-12-15'],
    [schedule('quarterly', '2026-09-24'), 2, '2027-03-24'],
    [schedule('quarterly', '2026-09-24'), -1, '2026-06-24'],
    [schedule('yearly', '2026-09-24'), 1, '2027-09-24'],
    [schedule('yearly', '2026-09-24'), -1, '2025-09-24'],
    [schedule('custom', '2026-09-24', everyTenDays), 2, '2026-10-14'],
    [schedule('custom', '2026-09-24', everyTenDays), -1, '2026-09-14'],
    [schedule('custom', '2026-09-24', everyTwoWeeks), 1, '2026-10-08'],
    [schedule('custom', '2026-09-24', everyTwoWeeks), -1, '2026-09-10'],
    [schedule('custom', '2026-09-24', everyTwoMonths), 1, '2026-11-24'],
    [schedule('custom', '2026-09-24', everyTwoMonths), -2, '2026-05-24'],
  ])('steps %o by %i to %s', (s, n, expected) => {
    expect(stepDate(s.start_date, s, n)).toBe(expected);
  });

  it.each([
    ['2026-01-31', 'monthly', 1, '2026-02-28'],
    ['2028-01-31', 'monthly', 1, '2028-02-29'],
    ['2026-03-31', 'monthly', -1, '2026-02-28'],
    ['2026-11-30', 'quarterly', 1, '2027-02-28'],
    ['2028-02-29', 'yearly', 1, '2029-02-28'],
  ] as const)(
    'clamps %s %s by %i to the month end, %s, rather than rolling over',
    (start, frequency, n, expected) => {
      expect(stepDate(start, schedule(frequency, start), n)).toBe(expected);
    },
  );

  it('refuses a custom schedule without a positive interval', () => {
    expect(() =>
      stepDate('2026-09-24', schedule('custom', '2026-09-24'), 1),
    ).toThrow(
      'A custom schedule needs a whole number of days, weeks or months.',
    );
  });
});

describe('occurrencesInMonth', () => {
  it('lists each weekly day in the month', () => {
    expect(
      occurrencesInMonth(schedule('weekly', '2026-08-27'), '2026-09'),
    ).toEqual([3, 10, 17, 24]);
  });

  it('lists the monthly day, keeping a 31st anchor on each month end without drifting', () => {
    const s = schedule('monthly', '2026-01-31');

    expect(occurrencesInMonth(s, '2026-02')).toEqual([28]);
    expect(occurrencesInMonth(s, '2026-03')).toEqual([31]);
    expect(occurrencesInMonth(s, '2026-09')).toEqual([30]);
  });

  it('lists a quarterly day only in its quarter months', () => {
    const s = schedule('quarterly', '2026-03-15');

    expect(occurrencesInMonth(s, '2026-09')).toEqual([15]);
    expect(occurrencesInMonth(s, '2026-10')).toEqual([]);
    expect(occurrencesInMonth(s, '2025-12')).toEqual([15]);
  });

  it('walks backwards from a future start date', () => {
    expect(
      occurrencesInMonth(schedule('monthly', '2026-11-05'), '2026-09'),
    ).toEqual([5]);
    expect(
      occurrencesInMonth(schedule('weekly', '2026-12-03'), '2026-09'),
    ).toEqual([3, 10, 17, 24]);
  });

  it('stops at the end date', () => {
    const monthly = schedule('monthly', '2026-01-10', {
      end_date: '2026-09-01',
    });
    const weekly = schedule('weekly', '2026-09-03', { end_date: '2026-09-17' });

    expect(occurrencesInMonth(monthly, '2026-08')).toEqual([10]);
    expect(occurrencesInMonth(monthly, '2026-09')).toEqual([]);
    expect(occurrencesInMonth(weekly, '2026-09')).toEqual([3, 10, 17]);
  });

  it('lists every custom-days occurrence', () => {
    expect(
      occurrencesInMonth(
        schedule('custom', '2026-09-05', everyTenDays),
        '2026-09',
      ),
    ).toEqual([5, 15, 25]);
  });

  it('reaches a month years away from the anchor', () => {
    expect(
      occurrencesInMonth(
        schedule('custom', '2020-01-01', {
          custom_every: 1,
          custom_unit: 'days',
        }),
        '2026-02',
      ),
    ).toHaveLength(28);
  });
});

describe('nextDue', () => {
  beforeEach(() => freezeToday('2026-09-24'));

  it('counts a charge due today as due today', () => {
    expect(nextDue(schedule('monthly', '2026-01-24'))).toBe('2026-09-24');
  });

  it('moves to the next occurrence the day after', () => {
    expect(nextDue(schedule('monthly', '2026-01-24'), '2026-09-25')).toBe(
      '2026-10-24',
    );
  });

  it('follows the schedule back from a future start date', () => {
    expect(nextDue(schedule('monthly', '2026-11-05'))).toBe('2026-10-05');
  });

  it('is empty once the schedule has ended', () => {
    expect(
      nextDue(schedule('monthly', '2026-01-10', { end_date: '2026-09-01' })),
    ).toBeNull();
  });

  it('includes a last occurrence on the end date', () => {
    expect(
      nextDue(schedule('weekly', '2026-09-03', { end_date: '2026-10-01' })),
    ).toBe('2026-09-24');
  });
});

describe('monthlyEquivalentCents', () => {
  it.each([
    [schedule('weekly', '2026-09-24'), 1_000, (1_000 * 52) / 12],
    [schedule('monthly', '2026-09-24'), 1_000, 1_000],
    [schedule('quarterly', '2026-09-24'), 3_000, 1_000],
    [schedule('yearly', '2026-09-24'), 12_000, 1_000],
    [
      schedule('custom', '2026-09-24', everyTenDays),
      1_000,
      (1_000 * 365) / 12 / 10,
    ],
    [
      schedule('custom', '2026-09-24', everyTwoWeeks),
      1_000,
      (1_000 * 52) / 12 / 2,
    ],
    [schedule('custom', '2026-09-24', everyTwoMonths), 1_000, 500],
  ])('converts %o of %i cents to %f a month', (s, cents, expected) => {
    expect(monthlyEquivalentCents(cents, s)).toBeCloseTo(expected, 10);
  });
});

describe('labels', () => {
  it.each([
    [schedule('weekly', '2026-09-24'), 'Weekly', 'per week'],
    [schedule('monthly', '2026-09-24'), 'Monthly', 'per month'],
    [schedule('quarterly', '2026-09-24'), 'Quarterly', 'per quarter'],
    [schedule('yearly', '2026-09-24'), 'Yearly', 'per year'],
    [
      schedule('custom', '2026-09-24', everyTenDays),
      'Every 10 days',
      'per 10 days',
    ],
    [
      schedule('custom', '2026-09-24', everyTwoWeeks),
      'Every 2 weeks',
      'per 2 weeks',
    ],
    [
      schedule('custom', '2026-09-24', everyTwoMonths),
      'Every 2 months',
      'per 2 months',
    ],
    [
      schedule('custom', '2026-09-24', everyOneMonth),
      'Every 1 month',
      'per month',
    ],
  ])('labels %o "%s" and "%s"', (s, label, suffix) => {
    expect(intervalLabel(s)).toBe(label);
    expect(periodSuffix(s)).toBe(suffix);
  });
});
