import { appSettings } from '@/config/appSettings';

test('holds the two static values, read-only', () => {
  expect(appSettings).toEqual({
    budgetWarnThreshold: 0.8,
    dateFormat: 'DD/MM/YYYY',
  });
  expect(Object.isFrozen(appSettings)).toBe(true);
});
