/**
 * Returns a Supabase result's data, or throws its error so TanStack Query reports the query or
 * mutation as failed instead of treating the error as an empty result.
 */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) {
    throw result.error;
  }
  return result.data as T;
}
