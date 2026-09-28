/**
 * A position's figures, derived from its open `lot` rows rather than stored:
 * the schema dropped `position.quantity`, `avg_cost_cents` and `opened_at` so
 * there is no cache for a write path to forget to update.
 *
 * Lot prices are in the instrument's own currency (US$ cents for a US listing,
 * S$ cents for SGX). Quantities are floats, since fractional shares are real.
 */

import type { Currency } from '@/utils/format/money';
import type { LotRow } from '@/types/domain';

export type Lot = Pick<
  LotRow,
  'id' | 'quantity' | 'cost_per_unit_cents' | 'purchased_at'
>;

export type FifoResult = {
  /** Cost of the shares sold, in the instrument's currency: what `sale.cost_basis_cents` snapshots. */
  costBasisCents: number;
  /** The lots after the sale, oldest first, with emptied lots removed. */
  remaining: Lot[];
  /** Each lot the sale drew on, oldest first. `remainingQuantity` 0 means delete the lot. */
  consumed: { lotId: number; quantity: number; remainingQuantity: number }[];
};

export function openQuantity(lots: readonly Lot[]): number {
  return roundQuantity(lots.reduce((sum, l) => sum + l.quantity, 0));
}

export function costBasisCents(lots: readonly Lot[]): number {
  return Math.round(
    lots.reduce((sum, l) => sum + l.quantity * l.cost_per_unit_cents, 0),
  );
}

/** Weighted by quantity. Null for an empty position rather than a divide by zero. */
export function averageCostCents(lots: readonly Lot[]): number | null {
  const quantity = openQuantity(lots);
  return quantity === 0 ? null : Math.round(costBasisCents(lots) / quantity);
}

/** The earliest lot purchase, or null for an empty position. */
export function openedAt(lots: readonly Lot[]): string | null {
  return oldestFirst(lots)[0]?.purchased_at ?? null;
}

/**
 * Sells `quantity` from the oldest lots first. Same-day lots go in lot id
 * order, so the recorded cost basis does not depend on the order Postgres
 * returned the rows in. Refuses to sell more than is held.
 */
export function consumeFifo(lots: readonly Lot[], quantity: number): FifoResult {
  if (!(quantity > 0)) {
    throw new Error('The quantity must be more than zero.');
  }
  const held = openQuantity(lots);
  if (roundQuantity(quantity) > held) {
    throw new Error(`Cannot sell ${quantity}; only ${held} held.`);
  }

  let left = roundQuantity(quantity);
  let cost = 0;
  const remaining: Lot[] = [];
  const consumed: FifoResult['consumed'] = [];

  for (const l of oldestFirst(lots)) {
    if (left === 0) {
      remaining.push(l);
      continue;
    }
    const taken = Math.min(l.quantity, left);
    const rest = roundQuantity(l.quantity - taken);
    left = roundQuantity(left - taken);
    cost += taken * l.cost_per_unit_cents;
    consumed.push({ lotId: l.id, quantity: taken, remainingQuantity: rest });
    if (rest > 0) {
      remaining.push({ ...l, quantity: rest });
    }
  }

  return { costBasisCents: Math.round(cost), remaining, consumed };
}

export type UnrealisedPnl = {
  /** In the instrument's currency. */
  cents: number;
  /** In S$: converted at the live rate for a US listing, unchanged for SGX, null until the rate loads. */
  sgdCents: number | null;
  /** On cost, in percentage points. Null for an empty position. */
  percent: number | null;
};

/** Market value at `priceCents` less cost basis, both in the instrument's currency. */
export function unrealisedPnl(
  lots: readonly Lot[],
  priceCents: number,
  currency: Currency,
  usdSgdRate: number | null,
): UnrealisedPnl {
  const cost = costBasisCents(lots);
  const cents = Math.round(openQuantity(lots) * priceCents) - cost;
  return {
    cents,
    sgdCents: toSgdCents(cents, currency, usdSgdRate),
    percent: cost === 0 ? null : (cents / cost) * 100,
  };
}

function toSgdCents(
  cents: number,
  currency: Currency,
  usdSgdRate: number | null,
): number | null {
  if (currency === 'SGD') {
    return cents;
  }
  return usdSgdRate === null ? null : Math.round(cents * usdSgdRate);
}

function oldestFirst(lots: readonly Lot[]): Lot[] {
  return [...lots].sort(
    (a, b) =>
      a.purchased_at.localeCompare(b.purchased_at) || a.id - b.id,
  );
}

/**
 * Quantities are floats, so 0.1 + 0.2 lands on 0.30000000000000004. Rounding
 * to 8 places, beyond any broker's fractional precision, keeps sums and
 * comparisons exact.
 */
function roundQuantity(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}
