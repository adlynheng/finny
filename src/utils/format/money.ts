/**
 * Money display. Every amount arrives as integer cents and is only turned into
 * dollars here. The plain formatters drop the sign so the caller decides how to
 * show it; the signed ones use `+` and U+2212, never a hyphen.
 */

export type Currency = 'SGD' | 'USD';

export type MoneyOptions = {
  currency?: Currency;
  /** 0 normally; 2 for transaction amounts, card balances and prices. */
  decimals?: 0 | 2;
};

export const MINUS = '−';

const PREFIX: Record<Currency, string> = { SGD: 'S$', USD: 'US$' };

/** `S$1,235`, or `S$1,234.56` at 2 decimals. Unsigned. */
export function formatMoney(
  cents: number,
  { currency = 'SGD', decimals = 0 }: MoneyOptions = {},
): string {
  return PREFIX[currency] + formatAmount(cents, decimals);
}

/** `1,235` with no currency, for a figure whose `S$` is set apart, as the hero's is. Unsigned. */
export function formatAmount(
  cents: number,
  decimals: MoneyOptions['decimals'] = 0,
): string {
  return fixed(Math.abs(cents) / 100, decimals);
}

/** `S$1,140`, or `S$3.98` when there are cents: a charge's own amount. Unsigned. */
export function formatMoneyExact(
  cents: number,
  { currency = 'SGD' }: Pick<MoneyOptions, 'currency'> = {},
): string {
  return formatMoney(cents, {
    currency,
    decimals: Math.round(cents) % 100 === 0 ? 0 : 2,
  });
}

/** `+S$45.50` / `−S$45.50`; zero, including an amount that rounds to it, has no sign. */
export function formatSignedMoney(
  cents: number,
  options: MoneyOptions = {},
): string {
  const text = formatMoney(cents, options);
  return signFor(cents, isZero(text)) + text;
}

/** Exact below S$10,000, then `S$12.4k`. Unsigned. */
export function formatCompactMoney(
  cents: number,
  options: Pick<MoneyOptions, 'currency'> = {},
): string {
  return Math.abs(cents) < 1_000_000
    ? formatMoney(cents, options)
    : formatKMoney(cents, options);
}

/** Always thousands to one decimal: `S$0.5k`, `S$12.4k`. Unsigned. */
export function formatKMoney(
  cents: number,
  { currency = 'SGD' }: Pick<MoneyOptions, 'currency'> = {},
): string {
  return `${PREFIX[currency]}${fixed(Math.abs(cents) / 100_000, 1)}k`;
}

/** `+S$450` / `−S$12.4k`: the compact form, signed; zero has no sign. */
export function formatSignedCompactMoney(
  cents: number,
  options: Pick<MoneyOptions, 'currency'> = {},
): string {
  const text = formatCompactMoney(cents, options);
  return signFor(cents, isZero(text)) + text;
}

/**
 * A trading amount in both currencies: US$ first, then S$ in brackets, as
 * every Trading figure shows. A US-listed amount (`currency: 'USD'`, the
 * default) converts to S$ at the live rate; an SGX one (`'SGD'`) to US$, so
 * each keeps its own figure exact. `signed` signs both lines.
 *
 * Until the rate loads there is nothing to convert: the amount shows in its
 * own currency alone, and `secondary` is null.
 */
export function formatDualMoney(
  cents: number,
  usdSgdRate: number | null,
  {
    decimals = 0,
    currency = 'USD',
    signed = false,
  }: MoneyOptions & { signed?: boolean } = {},
): { primary: string; secondary: string | null } {
  const format = (amount: number, c: Currency) => {
    const text = formatMoney(amount, { currency: c, decimals });
    return signed ? signFor(amount, isZero(text)) + text : text;
  };
  if (usdSgdRate === null) {
    return { primary: format(cents, currency), secondary: null };
  }
  const [usd, sgd] =
    currency === 'USD'
      ? [cents, Math.round(cents * usdSgdRate)]
      : [Math.round(cents / usdSgdRate), cents];
  return { primary: format(usd, 'USD'), secondary: `(${format(sgd, 'SGD')})` };
}

/** `12.3%` from 12.345 (percentage points, not a fraction). Unsigned. */
export function formatPercent(value: number, decimals = 1): string {
  return `${fixed(Math.abs(value), decimals)}%`;
}

/** `+2.34%` / `−0.08%`; zero after rounding has no sign. */
export function formatSignedPercent(value: number, decimals = 1): string {
  const text = formatPercent(value, decimals);
  return signFor(value, isZero(text)) + text;
}

/** The amount field's sanitiser: keep digits and dots, drop everything else. */
export function sanitizeAmountInput(text: string): string {
  return text.replace(/[^0-9.]/g, '');
}

/**
 * Reads an amount field into cents, rounding past the second decimal. Anything
 * after a second dot is ignored. Null when there is no number to read.
 */
export function inputToCents(text: string): number | null {
  const [, whole = '', fraction = ''] =
    /^(\d*)(?:\.(\d*))?/.exec(sanitizeAmountInput(text)) ?? [];
  if (whole === '' && fraction === '') {
    return null;
  }
  const cents =
    Number(whole || '0') * 100 + Number(fraction.slice(0, 2).padEnd(2, '0'));
  return Number(fraction[2] ?? '0') >= 5 ? cents + 1 : cents;
}

/** Writes cents back into an amount field: `1234.56`, `1234.50`, or `1234` for whole dollars. */
export function centsToInput(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  return fraction === 0
    ? String(whole)
    : `${whole}.${String(fraction).padStart(2, '0')}`;
}

/** Non-negative `value` to `decimals` places with en-US thousands grouping. */
function fixed(value: number, decimals: number): string {
  const scale = 10 ** decimals;
  const [whole = '0', fraction] = (Math.round(value * scale) / scale)
    .toFixed(decimals)
    .split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

function isZero(text: string): boolean {
  return !/[1-9]/.test(text);
}

function signFor(value: number, roundsToZero: boolean): string {
  if (roundsToZero) {
    return '';
  }
  return value > 0 ? '+' : MINUS;
}
