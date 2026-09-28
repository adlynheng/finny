import {
  averageCostCents,
  consumeFifo,
  costBasisCents,
  openedAt,
  openQuantity,
  unrealisedPnl,
  type Lot,
} from '../positions';

function lot(
  id: number,
  quantity: number,
  cost_per_unit_cents: number,
  purchased_at = '2026-01-01',
): Lot {
  return { id, quantity, cost_per_unit_cents, purchased_at };
}

// 10 @ $100 then 30 @ $200: weighted average $175, mean of prices $150.
const lots = [lot(1, 10, 10_000, '2026-01-10'), lot(2, 30, 20_000, '2026-03-02')];

describe('position figures', () => {
  it('sums the open quantity', () => {
    expect(openQuantity(lots)).toBe(40);
  });

  it('sums the cost basis', () => {
    expect(costBasisCents(lots)).toBe(700_000);
  });

  it('weights the average cost by quantity, not the mean of the prices', () => {
    expect(averageCostCents(lots)).toBe(17_500);
    expect(averageCostCents(lots)).not.toBe(15_000);
  });

  it('averages a single lot to its own price', () => {
    expect(averageCostCents([lot(1, 3, 12_050)])).toBe(12_050);
  });

  it('has no average cost for an empty position, rather than dividing by zero', () => {
    expect(openQuantity([])).toBe(0);
    expect(costBasisCents([])).toBe(0);
    expect(averageCostCents([])).toBeNull();
  });

  it('dates the position from its earliest lot, whatever order the lots arrive in', () => {
    expect(openedAt([...lots].reverse())).toBe('2026-01-10');
    expect(openedAt([])).toBeNull();
  });

  it('sums fractional quantities without float residue', () => {
    const fractional = [lot(1, 0.1, 10_000), lot(2, 0.2, 10_000)];

    expect(openQuantity(fractional)).toBe(0.3);
    expect(costBasisCents(fractional)).toBe(3_000);
  });
});

describe('consumeFifo', () => {
  it('takes from the oldest lot first', () => {
    const result = consumeFifo(lots, 4);

    expect(result.costBasisCents).toBe(40_000);
    expect(result.consumed).toEqual([
      { lotId: 1, quantity: 4, remainingQuantity: 6 },
    ]);
    expect(result.remaining).toEqual([
      lot(1, 6, 10_000, '2026-01-10'),
      lots[1],
    ]);
  });

  it('spans lots, emptying the older one', () => {
    const result = consumeFifo([...lots].reverse(), 15);

    expect(result.costBasisCents).toBe(10 * 10_000 + 5 * 20_000);
    expect(result.consumed).toEqual([
      { lotId: 1, quantity: 10, remainingQuantity: 0 },
      { lotId: 2, quantity: 5, remainingQuantity: 25 },
    ]);
    expect(result.remaining).toEqual([lot(2, 25, 20_000, '2026-03-02')]);
  });

  it('consumes the whole position, leaving no lots', () => {
    const result = consumeFifo(lots, 40);

    expect(result.costBasisCents).toBe(700_000);
    expect(result.remaining).toEqual([]);
    expect(result.consumed.map(c => c.remainingQuantity)).toEqual([0, 0]);
  });

  it('refuses to oversell rather than leaving a negative lot', () => {
    expect(() => consumeFifo(lots, 40.5)).toThrow(
      'Cannot sell 40.5; only 40 held.',
    );
  });

  it.each([0, -1])('refuses to sell %p', quantity => {
    expect(() => consumeFifo(lots, quantity)).toThrow(
      'The quantity must be more than zero.',
    );
  });

  it('handles fractional quantities', () => {
    const fractional = [lot(1, 0.1, 10_000, '2026-01-01'), lot(2, 0.2, 30_000, '2026-02-01')];

    const result = consumeFifo(fractional, 0.3);

    expect(result.costBasisCents).toBe(1_000 + 6_000);
    expect(result.remaining).toEqual([]);

    const partial = consumeFifo(fractional, 0.15);
    expect(partial.consumed).toEqual([
      { lotId: 1, quantity: 0.1, remainingQuantity: 0 },
      { lotId: 2, quantity: 0.05, remainingQuantity: 0.15 },
    ]);
    expect(partial.costBasisCents).toBe(1_000 + 1_500);
  });

  it('breaks a tie on purchase date by lot id, whatever order the lots arrive in', () => {
    const sameDay = [
      lot(9, 5, 30_000, '2026-05-05'),
      lot(4, 5, 10_000, '2026-05-05'),
    ];

    const result = consumeFifo(sameDay, 5);

    expect(result.consumed).toEqual([
      { lotId: 4, quantity: 5, remainingQuantity: 0 },
    ]);
    expect(result.costBasisCents).toBe(50_000);
    expect(consumeFifo([...sameDay].reverse(), 5)).toEqual(result);
  });
});

describe('unrealisedPnl', () => {
  it('converts a US-listed holding to SGD at the live rate', () => {
    // 40 held at $175 average, now $200: +$1,000 on $7,000 cost.
    expect(unrealisedPnl(lots, 20_000, 'USD', 1.35)).toEqual({
      cents: 100_000,
      sgdCents: 135_000,
      percent: (100_000 / 700_000) * 100,
    });
  });

  it('has no SGD figure for a US-listed holding until the rate is known', () => {
    expect(unrealisedPnl(lots, 20_000, 'USD', null).sgdCents).toBeNull();
  });

  it('leaves an SGX holding alone, ignoring the rate', () => {
    expect(unrealisedPnl(lots, 15_000, 'SGD', 1.35)).toEqual({
      cents: -100_000,
      sgdCents: -100_000,
      percent: (-100_000 / 700_000) * 100,
    });
  });

  it('has no percentage for an empty position', () => {
    expect(unrealisedPnl([], 20_000, 'SGD', null)).toEqual({
      cents: 0,
      sgdCents: 0,
      percent: null,
    });
  });
});
