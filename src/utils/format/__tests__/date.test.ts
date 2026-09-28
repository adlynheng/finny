import {
  daysInMonth,
  firstOfMonth,
  formatDayMonth,
  formatFullDate,
  formatMonthLong,
  formatMonthShort,
  formatWeekdayShort,
  lastOfMonth,
  mondayOffset,
  monthKey,
  shiftMonth,
} from '../date';

describe('labels', () => {
  it('formats day and short month', () => {
    expect(formatDayMonth('2026-09-24')).toBe('24 Sep');
    expect(formatDayMonth('2026-01-05')).toBe('5 Jan');
  });

  it('formats short and long month labels, with the year only when asked', () => {
    expect(formatMonthShort('2026-09')).toBe('Sep');
    expect(formatMonthShort('2026-09', { year: true })).toBe('Sep 2026');
    expect(formatMonthLong('2026-09')).toBe('September');
    expect(formatMonthLong('2026-09', { year: true })).toBe('September 2026');
  });

  it('takes a full date wherever it takes a month key', () => {
    expect(formatMonthShort('2026-12-31', { year: true })).toBe('Dec 2026');
  });

  it('formats the short weekday', () => {
    expect(formatWeekdayShort('2026-09-24')).toBe('Thu');
    expect(formatWeekdayShort('2026-09-28')).toBe('Mon');
    expect(formatWeekdayShort('2026-09-27')).toBe('Sun');
  });

  it('formats the date-picker button form', () => {
    expect(formatFullDate('2026-09-24')).toBe('Thu, 24 Sep 2026');
  });

  it.each(['2026-9-24', '2026-02-30', '2026-13', 'Sep 2026'])(
    'refuses "%s"',
    value => {
      expect(() => formatMonthShort(value)).toThrow(value);
    },
  );
});

describe('months', () => {
  it('keys a month from a date string or a Date', () => {
    expect(monthKey('2026-09-24')).toBe('2026-09');
    expect(monthKey(new Date(2026, 0, 31))).toBe('2026-01');
  });

  it.each([
    ['2026-09', '2026-09-01', '2026-09-30', 30],
    ['2026-02', '2026-02-01', '2026-02-28', 28],
    ['2028-02', '2028-02-01', '2028-02-29', 29],
    ['2026-12', '2026-12-01', '2026-12-31', 31],
  ])('%s runs %s to %s, %i days', (month, first, last, days) => {
    expect(firstOfMonth(month)).toBe(first);
    expect(lastOfMonth(month)).toBe(last);
    expect(daysInMonth(month)).toBe(days);
  });
});

describe('mondayOffset', () => {
  it.each([
    // 1 Sep 2026 is a Tuesday, one tile after Monday.
    ['2026-09', 1],
    // 1 Feb 2026 is a Sunday, the last column.
    ['2026-02', 6],
    // 1 Jun 2026 is a Monday, the first column.
    ['2026-06', 0],
  ])(
    'places the 1st of %s in column %i of a Monday-first week',
    (month, offset) => {
      expect(mondayOffset(month)).toBe(offset);
    },
  );
});

describe('shiftMonth', () => {
  it.each([
    ['2026-09', 1, '2026-10'],
    ['2026-09', -1, '2026-08'],
    ['2026-12', 1, '2027-01'],
    ['2027-01', -1, '2026-12'],
    ['2026-03', -14, '2025-01'],
  ])('%s moved by %i is %s', (month, by, expected) => {
    expect(shiftMonth(month, by)).toBe(expected);
  });
});
