import * as Keychain from 'react-native-keychain';

import { keychainStorage, serviceFor } from '@/lib/keychainStorage';

jest.mock('react-native-keychain', () => {
  // An in-memory keychain: one item per service name.
  const items = new Map<string, { username: string; password: string }>();
  return {
    ACCESSIBLE: {
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    },
    setGenericPassword: jest.fn(
      async (username: string, password: string, options: { service: string }) => {
        items.set(options.service, { username, password });
        return { service: options.service, storage: 'keychain' };
      },
    ),
    getGenericPassword: jest.fn(async (options: { service: string }) => {
      const item = items.get(options.service);
      return item ? { ...item, service: options.service, storage: 'keychain' } : false;
    }),
    resetGenericPassword: jest.fn(async (options: { service: string }) => items.delete(options.service)),
    __items: items,
  };
});

const mocked = Keychain as jest.Mocked<typeof Keychain> & {
  __items: Map<string, unknown>;
};

const KEY = 'sb-sjvdskphxbaslbbignzd-auth-token';
const SESSION = JSON.stringify({ access_token: 'a', refresh_token: 'r' });

beforeEach(() => {
  mocked.__items.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('keychainStorage', () => {
  it('writes a value under its own service name and reads it back', async () => {
    await keychainStorage.setItem(KEY, SESSION);

    expect(mocked.setGenericPassword).toHaveBeenCalledWith(KEY, SESSION, {
      service: serviceFor(KEY),
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await expect(keychainStorage.getItem(KEY)).resolves.toBe(SESSION);
  });

  it('keeps different keys apart', async () => {
    await keychainStorage.setItem(KEY, SESSION);
    await keychainStorage.setItem(`${KEY}-code-verifier`, 'verifier');

    await expect(keychainStorage.getItem(KEY)).resolves.toBe(SESSION);
    await expect(keychainStorage.getItem(`${KEY}-code-verifier`)).resolves.toBe('verifier');
  });

  it('never passes an access group, so iOS uses the default one', async () => {
    await keychainStorage.setItem(KEY, SESSION);
    await keychainStorage.getItem(KEY);
    await keychainStorage.removeItem(KEY);

    const calls = [
      ...mocked.setGenericPassword.mock.calls.map(call => call[2]),
      ...mocked.getGenericPassword.mock.calls.map(call => call[0]),
      ...mocked.resetGenericPassword.mock.calls.map(call => call[0]),
    ];
    for (const options of calls) {
      expect(options).not.toHaveProperty('accessGroup');
    }
  });

  it('returns null for a key that was never written', async () => {
    await expect(keychainStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('returns null after the value is removed', async () => {
    await keychainStorage.setItem(KEY, SESSION);
    await keychainStorage.removeItem(KEY);

    await expect(keychainStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('reads as "no session" when the keychain throws, instead of throwing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mocked.getGenericPassword.mockRejectedValueOnce(new Error('errSecInteractionNotAllowed'));

    await expect(keychainStorage.getItem(KEY)).resolves.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not throw when removing fails, so sign-out still completes', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mocked.resetGenericPassword.mockRejectedValueOnce(new Error('errSecMissingEntitlement'));

    await expect(keychainStorage.removeItem(KEY)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('lets a failed write reject, so a session that cannot be saved is reported', async () => {
    mocked.setGenericPassword.mockRejectedValueOnce(new Error('errSecMissingEntitlement'));

    await expect(keychainStorage.setItem(KEY, SESSION)).rejects.toThrow(
      'errSecMissingEntitlement',
    );
  });
});
