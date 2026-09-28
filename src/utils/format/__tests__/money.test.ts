import {
  centsToInput,
  formatCompactMoney,
  formatDualMoney,
  formatKMoney,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  formatSignedPercent,
  inputToCents,
  sanitizeAmountInput,
} from '../money';

const MINUS = '−';

describe('formatMoney', () => {
  it.each([
    [0, 'S$0'],
    [123_456, 'S$1,235'],
    [123_449, 'S$1,234'],
    [123_456_789, 'S$1,234,568'],
  ])('formats %i cents as %s at 0 decimals', (cents, text) => {
    expect(formatMoney(cents)).toBe(text);
  });

  it.each([
    [0, 'S$0.00'],
    [5, 'S$0.05'],
    [123_456, 'S$1,234.56'],
    [100_000_000, 'S$1,000,000.00'],
  ])('formats %i cents as %s at 2 decimals', (cents, text) => {
    expect(formatMoney(cents, { decimals: 2 })).toBe(text);
  });

  it('formats US dollars with the US$ prefix', () => {
    expect(formatMoney(123_456, { currency: 'USD', decimals: 2 })).toBe(
      'US$1,234.56',
    );
  });

  it('strips the sign, so the caller decides it', () => {
    expect(formatMoney(-123_456)).toBe('S$1,235');
    expect(formatMoney(-123_456, { decimals: 2 })).toBe('S$1,234.56');
  });
});

describe('formatSignedMoney', () => {
  it('prefixes + and the U+2212 minus sign, never a hyphen', () => {
    expect(formatSignedMoney(4_550, { decimals: 2 })).toBe('+S$45.50');
    expect(formatSignedMoney(-4_550, { decimals: 2 })).toBe(`${MINUS}S$45.50`);
    expect(formatSignedMoney(-4_550, { decimals: 2 })).not.toContain('-');
  });

  it('leaves zero unsigned, including an amount that rounds to zero', () => {
    expect(formatSignedMoney(0)).toBe('S$0');
    expect(formatSignedMoney(-40)).toBe('S$0');
  });
});

describe('formatCompactMoney', () => {
  it('stays exact up to ten thousand dollars', () => {
    expect(formatCompactMoney(45_000)).toBe('S$450');
    expect(formatCompactMoney(999_900)).toBe('S$9,999');
  });

  it.each([
    [1_000_000, 'S$10.0k'],
    [1_240_000, 'S$12.4k'],
    [1_245_000, 'S$12.5k'],
    [125_000_000, 'S$1,250.0k'],
  ])('abbreviates %i cents to %s', (cents, text) => {
    expect(formatCompactMoney(cents)).toBe(text);
  });

  it('strips the sign like the plain formatter', () => {
    expect(formatCompactMoney(-1_240_000)).toBe('S$12.4k');
  });
});

describe('formatKMoney', () => {
  it.each([
    [0, 'S$0.0k'],
    [45_000, 'S$0.5k'],
    [120_000, 'S$1.2k'],
    [1_240_000, 'S$12.4k'],
  ])('always abbreviates %i cents to one decimal: %s', (cents, text) => {
    expect(formatKMoney(cents)).toBe(text);
  });
});

describe('formatDualMoney', () => {
  it('shows US$ first with the S$ amount at the live rate in brackets', () => {
    expect(formatDualMoney(100_000, 1.3512, { decimals: 2 })).toEqual({
      primary: 'US$1,000.00',
      secondary: '(S$1,351.20)',
    });
  });

  it('rounds the converted amount to the nearest cent', () => {
    expect(formatDualMoney(333, 1.3512, { decimals: 2 }).secondary).toBe(
      '(S$4.50)',
    );
  });

  it('leaves the bracket out until a rate is known', () => {
    expect(formatDualMoney(100_000, null)).toEqual({
      primary: 'US$1,000',
      secondary: null,
    });
  });
});

describe('percentages', () => {
  it('formats a plain percentage without its sign', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(-4)).toBe('4.0%');
    expect(formatPercent(114, 0)).toBe('114%');
  });

  it('signs a percentage with + and U+2212', () => {
    expect(formatSignedPercent(2.34, 2)).toBe('+2.34%');
    expect(formatSignedPercent(-0.08, 2)).toBe(`${MINUS}0.08%`);
    expect(formatSignedPercent(0)).toBe('0.0%');
    expect(formatSignedPercent(-0.04)).toBe('0.0%');
  });
});

describe('text input', () => {
  it('strips everything that is not a digit or a dot', () => {
    expect(sanitizeAmountInput('S$1,234.50')).toBe('1234.50');
    expect(sanitizeAmountInput('-12a.3 ')).toBe('12.3');
  });

  it.each([
    ['1234.56', 123_456],
    ['1234.5', 123_450],
    ['1234', 123_400],
    ['.5', 50],
    ['1.005', 101],
    ['1.004', 100],
    ['S$1,234.50', 123_450],
    ['1.2.3', 120],
  ])('reads "%s" as %i cents', (text, cents) => {
    expect(inputToCents(text)).toBe(cents);
  });

  it.each(['', '.', 'abc'])('reads "%s" as no amount', text => {
    expect(inputToCents(text)).toBeNull();
  });

  it.each([
    [123_456, '1234.56'],
    [123_450, '1234.50'],
    [123_400, '1234'],
    [5, '0.05'],
    [0, '0'],
  ])('writes %i cents as "%s"', (cents, text) => {
    expect(centsToInput(cents)).toBe(text);
  });

  it.each([0, 5, 99, 100, 123_456, 100_000_001])(
    'round-trips %i cents through the input',
    cents => {
      expect(inputToCents(centsToInput(cents))).toBe(cents);
    },
  );
});
