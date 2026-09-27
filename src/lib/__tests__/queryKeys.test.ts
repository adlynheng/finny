import type { QueryKey } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';

function startsWith(key: QueryKey, prefix: QueryKey) {
  return prefix.every((part, i) => key[i] === part);
}

// Every specific key the factory can build, beside the root that must invalidate it.
const children: [string, QueryKey, QueryKey][] = [
  ['settings', queryKeys.settings.all, queryKeys.settings.detail()],
  ['assetClasses', queryKeys.assetClasses.all, queryKeys.assetClasses.list()],
  ['accounts', queryKeys.accounts.all, queryKeys.accounts.list()],
  ['cards', queryKeys.cards.all, queryKeys.cards.list()],
  ['categories', queryKeys.categories.all, queryKeys.categories.list()],
  [
    'categories',
    queryKeys.categories.all,
    queryKeys.categories.list('expense'),
  ],
  ['goals', queryKeys.goals.all, queryKeys.goals.list()],
  ['transactions', queryKeys.transactions.all, queryKeys.transactions.list()],
  [
    'transactions',
    queryKeys.transactions.all,
    queryKeys.transactions.list('2026-09'),
  ],
  [
    'recurringCharges',
    queryKeys.recurringCharges.all,
    queryKeys.recurringCharges.list(),
  ],
  [
    'incomeSources',
    queryKeys.incomeSources.all,
    queryKeys.incomeSources.list(),
  ],
  ['instruments', queryKeys.instruments.all, queryKeys.instruments.list()],
  ['positions', queryKeys.positions.all, queryKeys.positions.list()],
  ['sales', queryKeys.sales.all, queryKeys.sales.list()],
  ['watchlist', queryKeys.watchlist.all, queryKeys.watchlist.list()],
  ['snapshots', queryKeys.snapshots.all, queryKeys.snapshots.window(12)],
  ['fx', queryKeys.fx.all, queryKeys.fx.usdSgd()],
  ['quotes', queryKeys.quotes.all, queryKeys.quotes.symbols(['NVDA', 'AAPL'])],
  ['bars', queryKeys.bars.all, queryKeys.bars.series('NVDA', '3M')],
];

it.each(children)('prefixes every %s key with its root', (_name, root, key) => {
  expect(key.length).toBeGreaterThan(root.length);
  expect(startsWith(key, root)).toBe(true);
});

it('gives every resource a root that no other root shares or starts with', () => {
  const roots = Object.values(queryKeys).map(
    resource => resource.all as QueryKey,
  );
  for (const a of roots) {
    for (const b of roots) {
      if (a !== b) {
        expect(startsWith(a, b)).toBe(false);
      }
    }
  }
});

it('keeps filtered and unfiltered lists as separate entries', () => {
  expect(queryKeys.categories.list()).not.toEqual(
    queryKeys.categories.list('deposit'),
  );
  expect(queryKeys.categories.list('deposit')).not.toEqual(
    queryKeys.categories.list('expense'),
  );
  expect(queryKeys.transactions.list()).not.toEqual(
    queryKeys.transactions.list('2026-09'),
  );
  expect(queryKeys.snapshots.window(6)).not.toEqual(
    queryKeys.snapshots.window(24),
  );
  expect(queryKeys.bars.series('NVDA', '1M')).not.toEqual(
    queryKeys.bars.series('NVDA', '1Y'),
  );
});

it('treats a symbol list as a set: order and repeats do not change the key', () => {
  expect(queryKeys.quotes.symbols(['NVDA', 'AAPL'])).toEqual(
    queryKeys.quotes.symbols(['AAPL', 'NVDA']),
  );
  expect(queryKeys.quotes.symbols(['NVDA', 'AAPL', 'NVDA'])).toEqual(
    queryKeys.quotes.symbols(['AAPL', 'NVDA']),
  );
});

it('does not reorder the caller’s symbol array', () => {
  const symbols = ['NVDA', 'AAPL'];
  queryKeys.quotes.symbols(symbols);
  expect(symbols).toEqual(['NVDA', 'AAPL']);
});
