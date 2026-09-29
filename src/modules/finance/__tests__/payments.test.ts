import {
  chargesByDay,
  dateOf,
  defaultDay,
  isPastDay,
  tileAmount,
  upcomingDays,
} from '../payments';
import { charges, TODAY } from '../../../../test/financeFixtures';

const names = (byDay: ReturnType<typeof chargesByDay>) =>
  Object.fromEntries([...byDay].map(([day, cs]) => [day, cs.map(c => c.name)]));

describe('chargesByDay', () => {
  it('places monthly and weekly charges on their days', () => {
    expect(names(chargesByDay(charges, '2026-09'))).toEqual({
      1: ['HDB home loan'],
      5: ['Home cleaner'],
      12: ['Home cleaner'],
      19: ['Home cleaner'],
      22: ['Netflix'],
      26: ['Home cleaner'],
    });
  });

  it('places quarterly and yearly charges only in their months', () => {
    const october = names(chargesByDay(charges, '2026-10'));
    expect(october[5]).toEqual(['Great Eastern term life']);
    expect(october[15]).toEqual(['AIA HealthShield']);

    const november = names(chargesByDay(charges, '2026-11'));
    expect(Object.values(november).flat()).not.toContain(
      'Great Eastern term life',
    );
    expect(names(chargesByDay(charges, '2027-01'))[5]).toEqual([
      'Great Eastern term life',
    ]);
    expect(
      Object.values(names(chargesByDay(charges, '2027-09'))).flat(),
    ).not.toContain('AIA HealthShield');
  });

  it('puts two charges on the same day together', () => {
    const both = [
      ...charges,
      { ...charges[0]!, id: 9, name: 'S&CC', start_date: '2026-09-01' },
    ];
    expect(names(chargesByDay(both, '2026-09'))[1]).toEqual([
      'HDB home loan',
      'S&CC',
    ]);
  });

  it('leaves out inactive charges and unknown frequencies', () => {
    const odd = [
      { ...charges[0]!, is_active: false },
      { ...charges[4]!, frequency: 'fortnightly' },
    ];
    expect(chargesByDay(odd, '2026-09').size).toBe(0);
  });
});

describe('the days around today', () => {
  const september = chargesByDay(charges, '2026-09');

  it('counts today as past, so a charge due today reads as paid', () => {
    expect(isPastDay('2026-09', 24, TODAY)).toBe(true);
    expect(isPastDay('2026-09', 25, TODAY)).toBe(false);
    expect(isPastDay('2026-08', 31, TODAY)).toBe(true);
    expect(isPastDay('2026-10', 1, TODAY)).toBe(false);
  });

  it('lists the charge days still to come', () => {
    expect(upcomingDays(september, '2026-09', TODAY)).toEqual([26]);
  });

  it('opens on the next charge day, else the first one', () => {
    expect(defaultDay(september, '2026-09', TODAY)).toBe(26);
    expect(defaultDay(september, '2026-09', '2026-09-30')).toBe(1);
    expect(defaultDay(new Map(), '2026-09', TODAY)).toBeNull();
  });
});

it('writes a tile amount in dollars, or thousands to two places', () => {
  expect(tileAmount(7_200)).toBe('S$72');
  expect(tileAmount(12_455)).toBe('S$125');
  expect(tileAmount(114_000)).toBe('S$1.14k');
});

it('dates a day of a month', () => {
  expect(dateOf('2026-09', 5)).toBe('2026-09-05');
});
