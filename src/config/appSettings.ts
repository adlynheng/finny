/**
 * Static app-level constants. A value that any screen can edit belongs in the
 * Supabase `settings` table; a value no screen can change belongs here.
 */
export const appSettings = Object.freeze({
  /** Fraction of a budget spent at which it is flagged as nearly used up. */
  budgetWarnThreshold: 0.8,
  dateFormat: 'DD/MM/YYYY',
} as const);
