/**
 * Every table's id is `generated always as identity`, so Postgres refuses any insert (and so any
 * upsert) that names an id. A save is therefore an insert for a new row and an update for an
 * existing one, and hooks tell the two apart with `isExisting`.
 */

/** A new row (no id), or the changed fields of an existing row plus its id. */
export type Save<Insert, Update> =
  | Insert
  | (Omit<Update, 'id'> & { id: number });

export function isExisting<T extends { id?: number }>(
  row: T,
): row is Extract<T, { id: number }> {
  return row.id !== undefined;
}
