/**
 * Portfolio health and "Today's ideas" (reconciliation item 9): computed live
 * from the current book, never stored, as the schema dropped
 * `ai_recommendation`. The formulas are the Trading design's.
 */

import type { IdeaIconKey } from '@/components/icons/registry';
import type { AccountRow } from '@/types/domain';
import {
  formatMoney,
  formatPercent,
  formatSignedPercent,
} from '@/utils/format/money';
import type { Holding, Totals } from './portfolio';

export type HealthScores = {
  diversification: number;
  riskBalance: number;
  goalPace: number;
};

/** The share single stocks should sit near. */
const SINGLE_STOCK_TARGET = 0.35;
/** The most one stock should be of the portfolio. */
const STOCK_CAP = 0.08;

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Diversification: one less the Herfindahl index of the weights, less 40
 * points per whole portfolio in tech. Risk balance: 100, less 2 points per
 * percentage point single stocks sit from 35%. Goal pace: 76, plus 20 points
 * per whole portfolio of return on cost.
 */
export function healthScores(
  holdings: readonly Holding[],
  totals: Totals,
): HealthScores {
  const share = (test: (h: Holding) => boolean) =>
    holdings.filter(test).reduce((sum, h) => sum + h.weight, 0);
  const hhi = holdings.reduce((sum, h) => sum + h.weight * h.weight, 0);
  const tech = share(h => h.instrument.sector === 'Tech');
  const single = share(h => h.instrument.kind === 'Stock');
  return {
    diversification: clamp((1 - hhi) * 100 - tech * 40),
    riskBalance: clamp(100 - Math.abs(single - SINGLE_STOCK_TARGET) * 200),
    goalPace: clamp(76 + (totals.pnlPercent / 100) * 20),
  };
}

/** The overall score: the metrics' average, each held to 0–100, rounded. */
export function overallScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((n, s) => n + Math.max(0, Math.min(100, s)), 0);
  return Math.round(sum / scores.length);
}

export function verdict(overall: number): string {
  if (overall >= 80) return 'In good shape';
  if (overall >= 65) return 'Healthy, slightly concentrated';
  return 'Needs rebalancing';
}

/** Cash sitting in the account the holdings are in: its balance less their value. */
export type IdleCash = { accountName: string; cents: number };

/**
 * The account holding the most market value, and how much of its balance is
 * not in holdings. Null when no holding names an account.
 */
export function idleCash(
  holdings: readonly Holding[],
  accounts: readonly Pick<AccountRow, 'id' | 'name' | 'balance_cents'>[],
): IdleCash | null {
  const byAccount = new Map<number, number>();
  for (const h of holdings) {
    if (h.accountId !== null) {
      byAccount.set(
        h.accountId,
        (byAccount.get(h.accountId) ?? 0) + h.valueCents,
      );
    }
  }
  const [top] = [...byAccount].sort((a, b) => b[1] - a[1]);
  const account = top && accounts.find(a => a.id === top[0]);
  if (!account) return null;
  return {
    accountName: account.name,
    cents: Math.max(0, (account.balance_cents ?? 0) - top[1]),
  };
}

export type Idea = { tag: IdeaIconKey; title: string; body: string };

/** Below this, idle cash is not worth a suggestion. */
const IDLE_FLOOR_CENTS = 10_000;

const wholePercent = (fraction: number) => formatPercent(fraction * 100, 0);

/**
 * Three ideas: trim the most concentrated single stock toward 8% (into the
 * largest ETF held), review the worst performer on cost, and put idle cash to
 * work. Empty with nothing held.
 */
export function ideasFor(
  holdings: readonly Holding[],
  totals: Totals,
  idle: IdleCash | null,
): Idea[] {
  if (holdings.length === 0) return [];
  const byWeight = [...holdings].sort((a, b) => b.weight - a.weight);
  const stock =
    byWeight.find(h => h.instrument.kind === 'Stock') ?? byWeight[0]!;
  const etf =
    byWeight.find(h => h.instrument.kind === 'ETF')?.symbol ??
    'a broad-market ETF';
  const worst = [...holdings].sort((a, b) => a.pnlPercent - b.pnlPercent)[0]!;

  const excess = Math.max(0, (stock.weight - STOCK_CAP) * totals.valueCents);
  const trim: Idea =
    excess > 0
      ? {
          tag: 'Rebalance',
          title: `Trim ${stock.symbol} toward 8%`,
          body: `Now ${wholePercent(
            stock.weight,
          )} of the portfolio and ${formatSignedPercent(
            stock.pnlPercent,
            0,
          )} on cost. Moving about ${formatMoney(
            Math.round(excess / 10_000) * 10_000,
          )} into ${etf} keeps single-stock risk in check.`,
        }
      : {
          tag: 'Rebalance',
          title: 'No stock above 8%',
          body: `${stock.symbol} is the largest at ${wholePercent(
            stock.weight,
          )} of the portfolio, so single-stock risk is in check.`,
        };

  const day = worst.dayChangePercent;
  const review: Idea = {
    tag: 'Review',
    title: `${worst.symbol} is ${
      worst.pnlPercent < 0 ? 'below' : 'closest to'
    } your cost`,
    body: `${formatSignedPercent(worst.pnlPercent)} on cost${
      day === null
        ? ''
        : ` after a ${formatPercent(day)} ${day < 0 ? 'drop' : 'gain'} today`
    }. Decide on an exit level.`,
  };

  const cash: Idea =
    idle && idle.cents >= IDLE_FLOOR_CENTS
      ? {
          tag: 'Idea',
          title: 'Put idle cash to work',
          body: `${formatMoney(idle.cents)} is sitting uninvested in ${
            idle.accountName
          }. ${etf} would put it to work without adding single-stock risk.`,
        }
      : {
          tag: 'Idea',
          title: 'Cash is fully invested',
          body: `Nothing is sitting idle${
            idle ? ` in ${idle.accountName}` : ''
          }. New money can go to ${etf} to stay diversified.`,
        };

  return [trim, review, cash];
}
