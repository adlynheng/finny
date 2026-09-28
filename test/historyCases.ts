/**
 * The Overview design's 24-month net-worth history (FinnyOverview.dc.html,
 * `Component.D`), as the cumulative bands the history chart takes, in cents.
 */

import type { HistoryPoint } from '@/utils/derive/networth';

const N = 24;
const wig = (a: number, b: number, amp: number, f: number, ph: number) =>
  Array.from({ length: N }, (_, i) => {
    const e = i === 0 || i === N - 1 ? 0 : 1;
    return a + ((b - a) * i) / (N - 1) + amp * e * Math.sin(i * f + ph);
  });

const cash = wig(31000, 42300, 1100, 1.3, 0.4);
const inv = wig(44500, 78950, 3400, 0.9, 1.1);
const cpf = wig(49800, 65170, 0, 1, 0);
const prop = wig(112000, 120000, 0, 1, 0);
const liab = wig(69100, 64000, 0, 1, 0);
cash[22] = 42300 - 300;
inv[22] = 78950 - 2400;

const cents = (dollars: number) => Math.round(dollars * 100);

/** Oct 2024 to Sep 2026. */
export const designHistory: HistoryPoint[] = Array.from(
  { length: N },
  (_, i) => {
    const month = new Date(2024, 9 + i, 1);
    const date = `${month.getFullYear()}-${String(
      month.getMonth() + 1,
    ).padStart(2, '0')}-01`;
    const c = cash[i]!;
    const ci = c + inv[i]!;
    const cic = ci + cpf[i]!;
    return {
      date,
      cash: cents(c),
      investments: cents(ci),
      cpf: cents(cic),
      net: cents(cic + prop[i]! - liab[i]!),
    };
  },
);
