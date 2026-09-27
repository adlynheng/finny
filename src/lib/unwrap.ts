import type { PostgrestSingleResponse } from '@supabase/supabase-js';

/**
 * Returns a Supabase result's data, or throws its error so TanStack Query reports the query or
 * mutation as failed instead of treating the error as an empty result. Typed on Supabase's own
 * response, so a successful result's data is never null unless the query allows it
 * (`maybeSingle`).
 */
export function unwrap<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error) {
    throw result.error;
  }
  return result.data;
}
