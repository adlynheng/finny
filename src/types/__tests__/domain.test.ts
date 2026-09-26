/// <reference types="node" />
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  ACCOUNT_TYPES,
  CARD_THEMES,
  CARD_TYPES,
  CPF_TYPES,
  CATEGORY_KINDS,
  CUSTOM_UNITS,
  FREQUENCIES,
  GOAL_SOURCES,
  INCOME_TYPES,
  TXN_KINDS,
  isOneOf,
} from '../domain';

const migrationsDir = join(__dirname, '../../../supabase/migrations');
const sql = readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .map(file => readFileSync(join(migrationsDir, file), 'utf8'))
  .join('\n');

/** The allowed values of the check constraint with this name, in the order written. */
function checkValues(constraint: string): string[] {
  const match = new RegExp(`constraint ${constraint}\\s+check \\(\\w+ in \\(([^)]*)\\)\\)`).exec(sql);
  if (!match?.[1]) {
    throw new Error(`No check constraint named ${constraint}`);
  }
  return match[1].split(',').map(value => value.trim().replace(/^'|'$/g, ''));
}

describe('enum unions match the check constraints', () => {
  it.each([
    ['account_cpf_type_check', CPF_TYPES],
    ['card_card_type_check', CARD_TYPES],
    ['category_kind_check', CATEGORY_KINDS],
    ['goal_src_check', GOAL_SOURCES],
    ['txn_kind_check', TXN_KINDS],
    ['recurring_charge_frequency_check', FREQUENCIES],
    ['recurring_charge_custom_unit_check', CUSTOM_UNITS],
    ['income_source_frequency_check', FREQUENCIES],
    ['income_source_custom_unit_check', CUSTOM_UNITS],
    ['income_source_type_check', INCOME_TYPES],
  ])('%s', (constraint, values) => {
    expect(checkValues(constraint)).toEqual([...values]);
  });
});

describe('domain constants', () => {
  it('orders account types as the Settings panel groups them', () => {
    expect(ACCOUNT_TYPES).toEqual(['Savings', 'CPF', 'Broker', 'Credit card']);
  });

  it('offers every card face theme', () => {
    expect(CARD_THEMES).toEqual(['Green', 'Bronze', 'Slate', 'Mist', 'Lagoon', 'Dusk']);
  });
});

describe('isOneOf', () => {
  it('accepts a member and narrows it', () => {
    const kind: unknown = 'transfer';
    expect(isOneOf(TXN_KINDS, kind)).toBe(true);
  });

  it('rejects a near miss, a different case and a non-string', () => {
    expect(isOneOf(TXN_KINDS, 'transfers')).toBe(false);
    expect(isOneOf(ACCOUNT_TYPES, 'savings')).toBe(false);
    expect(isOneOf(TXN_KINDS, null)).toBe(false);
  });
});
