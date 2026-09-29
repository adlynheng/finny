import { filterRows, listRows } from '../transactionRows';
import { categories, september } from '../../../../test/financeFixtures';
import { accounts } from '../../../../test/overviewFixtures';

const rows = listRows(september as never, { accounts, categories });

describe('listRows', () => {
  it('shows a transfer once, from its outgoing leg, naming both accounts', () => {
    const transfers = rows.filter(r => r.kind === 'transfer');
    expect(transfers).toEqual([
      expect.objectContaining({
        id: 3,
        amount_cents: -150_000,
        category: 'Transfer',
        account: 'DBS Multiplier → Interactive Brokers',
      }),
    ]);
  });

  it('names each other row’s category and account, newest first', () => {
    expect(rows.map(r => r.id)).toEqual([8, 7, 6, 5, 3, 2, 1]);
    expect(rows[0]).toMatchObject({
      description: 'Netflix',
      category: 'Subscriptions',
      iconKey: 'Subscriptions',
      account: 'UOB One',
    });
  });

  it('keeps a transfer leg whose partner is missing', () => {
    const incoming = september.filter(t => t.id === 4);
    const lone = listRows(incoming as never, { accounts, categories });
    expect(lone).toEqual([
      expect.objectContaining({
        id: 4,
        amount_cents: 150_000,
        account: 'Interactive Brokers',
      }),
    ]);
  });
});

describe('filterRows', () => {
  it.each([
    ['all', [8, 7, 6, 5, 3, 2, 1]],
    ['in', [6, 1]],
    ['out', [8, 7, 5, 2]],
    ['transfers', [3]],
  ] as const)('%s keeps its kind', (filter, ids) => {
    expect(filterRows(rows, filter, '').map(r => r.id)).toEqual(ids);
  });

  it('searches description, category and account, ignoring case', () => {
    expect(filterRows(rows, 'all', 'netflix').map(r => r.id)).toEqual([8]);
    expect(filterRows(rows, 'all', 'dining').map(r => r.id)).toEqual([7]);
    expect(filterRows(rows, 'all', 'uob').map(r => r.id)).toEqual([8]);
    expect(filterRows(rows, 'all', ' brokers ').map(r => r.id)).toEqual([3]);
  });

  it('composes the filter with the search', () => {
    expect(filterRows(rows, 'out', 'dbs').map(r => r.id)).toEqual([7, 5, 2]);
    expect(filterRows(rows, 'in', 'dinner')).toEqual([]);
  });
});
