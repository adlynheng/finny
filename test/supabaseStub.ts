/**
 * A stand-in for the Supabase client's query builder, so hooks can be tested without a server.
 *
 *   jest.mock('@/lib/supabase', () => ({
 *     supabase: require('../../../test/supabaseStub').createSupabaseStub(),
 *   }));
 *
 * Every `from(table)` records the chain called on it (`select`, `eq`, `order`, …) as tuples like
 * `['eq', 'kind', 'expense']`, and resolves to the next result queued for that table with
 * `respond`. The last queued result repeats; with none queued, a query resolves to no data.
 * `rpc(fn, args)` is recorded the same way, under the table name `rpc:<fn>`, as `['rpc', args]`.
 */

export type StubResult = { data: unknown; error: unknown };
export type StubCall = { table: string; chain: unknown[][] };

export function createSupabaseStub() {
  const calls: StubCall[] = [];
  const responses = new Map<string, StubResult[]>();

  function nextResult(table: string): StubResult {
    const queued = responses.get(table) ?? [];
    const result = queued.length > 1 ? queued.shift() : queued[0];
    return result ?? { data: null, error: null };
  }

  const from = jest.fn((table: string) => {
    const call: StubCall = { table, chain: [] };
    calls.push(call);
    // Taken when the query is awaited, so results queued in call order line up.
    let result: StubResult | undefined;

    const builder: object = new Proxy(
      {},
      {
        get(_target, method) {
          if (method === 'then') {
            result ??= nextResult(table);
            const settled = result;
            return (
              resolve: (value: StubResult) => unknown,
              reject: (reason: unknown) => unknown,
            ) => Promise.resolve(settled).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            call.chain.push([String(method), ...args]);
            return builder;
          };
        },
      },
    );
    return builder;
  });

  const rpc = jest.fn((fn: string, args: unknown) => {
    const table = `rpc:${fn}`;
    calls.push({ table, chain: [['rpc', args]] });
    return Promise.resolve(nextResult(table));
  });

  return {
    from,
    rpc,
    calls,
    /** Queue results for the next queries on `table`, in order. */
    respond(table: string, ...results: StubResult[]) {
      responses.set(table, results);
    },
    /** The chains called on `table`, one per query, oldest first. */
    chainsFor(table: string) {
      return calls.filter(call => call.table === table).map(call => call.chain);
    },
    reset() {
      calls.length = 0;
      responses.clear();
      from.mockClear();
      rpc.mockClear();
    },
  };
}

export type SupabaseStub = ReturnType<typeof createSupabaseStub>;
