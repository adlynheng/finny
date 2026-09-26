import { freezeToday, now, resetToday, today } from '@/lib/today';

afterEach(() => {
  resetToday();
});

describe('now', () => {
  it('follows the real clock when not frozen', () => {
    const before = Date.now();
    const value = now().getTime();
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(Date.now());
  });

  it('returns the frozen instant once frozen', () => {
    freezeToday(new Date(2026, 8, 24, 9, 30));
    expect(now()).toEqual(new Date(2026, 8, 24, 9, 30));
  });

  it('returns a copy, so callers cannot mutate the frozen value', () => {
    freezeToday(new Date(2026, 8, 24, 9, 30));
    now().setFullYear(1999);
    expect(now().getFullYear()).toBe(2026);
  });

  it('is not affected by mutating the Date passed to freezeToday', () => {
    const at = new Date(2026, 8, 24, 9, 30);
    freezeToday(at);
    at.setFullYear(1999);
    expect(now().getFullYear()).toBe(2026);
  });
});

describe('freezeToday with a calendar date string', () => {
  it('freezes to local midnight of that date', () => {
    freezeToday('2026-09-24');
    expect(now()).toEqual(new Date(2026, 8, 24));
  });

  it('rejects anything that is not YYYY-MM-DD', () => {
    expect(() => freezeToday('24/09/2026')).toThrow(/YYYY-MM-DD/);
    expect(() => freezeToday('2026-13-01')).toThrow(/YYYY-MM-DD/);
    expect(() => freezeToday('2026-02-30')).toThrow(/YYYY-MM-DD/);
  });
});

describe('today', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    freezeToday(new Date(2026, 8, 24, 23, 59));
    expect(today()).toBe('2026-09-24');
  });

  it('zero-pads month and day', () => {
    freezeToday(new Date(2026, 0, 5));
    expect(today()).toBe('2026-01-05');
  });
});

describe('resetToday', () => {
  it('returns to the real clock', () => {
    freezeToday('2001-01-01');
    resetToday();
    expect(now().getFullYear()).toBeGreaterThanOrEqual(2026);
  });
});
