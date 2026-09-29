/**
 * The Overview cards' shared rows, after the design's accounts (FinnyOverview.dc.html
 * `ACCTS`), with the seeded asset classes.
 */

export const assetClasses = [
  { id: 1, label: 'Cash', color: null },
  { id: 2, label: 'CPF', color: null },
  { id: 3, label: 'Investments', color: null },
  { id: 4, label: 'Property', color: null },
  { id: 5, label: 'Other', color: null },
];

function account(
  id: number,
  name: string,
  type: string,
  asset_class_id: number | null,
  balance_cents: number,
) {
  return {
    id,
    name,
    type,
    asset_class_id,
    balance_cents,
    is_liability: type === 'Credit card',
    is_active: true,
  };
}

/** S$142,950 of assets across four accounts, and a card owing S$1,200. */
export const accounts = [
  account(1, 'DBS Multiplier', 'Savings', 1, 2_840_000),
  account(2, 'UOB One', 'Savings', 1, 1_390_000),
  account(3, 'CPF Ordinary', 'CPF', 2, 3_820_000),
  account(4, 'Interactive Brokers', 'Broker', 3, 6_245_000),
  account(5, 'DBS Altitude', 'Credit card', null, 120_000),
];
