import { isExisting, type Save } from '../save';
import type { AccountInsert, AccountUpdate } from '@/types/domain';

it('treats a row with an id as existing and one without as new', () => {
  const added: Save<AccountInsert, AccountUpdate> = {
    name: 'OCBC 360',
    type: 'Savings',
  };
  const edited: Save<AccountInsert, AccountUpdate> = {
    id: 4,
    name: 'OCBC 360 Account',
  };

  expect(isExisting(added)).toBe(false);
  expect(isExisting(edited)).toBe(true);
});
