/**
 * The `auth.storage` adapter for supabase-js, backed by the OS Keychain. It is the only place the
 * Supabase session is stored; AsyncStorage would put the token to Adlyn's bank and brokerage data
 * on disk in plaintext (build plan Task 4).
 *
 * Each storage key gets its own Keychain item, under the service name `serviceFor(key)`. No
 * `accessGroup` is passed anywhere: SideStore rewrites the bundle identifier on the iPhone, so
 * only the app's default access group is safe (build plan Global constraints). On macOS the
 * default group comes from the target's `keychain-access-groups` entitlement (spike report §4).
 */

import * as Keychain from 'react-native-keychain';

import type { SupportedStorage } from '@supabase/supabase-js';

export function serviceFor(key: string): string {
  return `finny.${key}`;
}

// Readable after the first unlock so a token refresh in the background still works, and never
// migrated to another device through a backup.
const accessible = Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;

export const keychainStorage: SupportedStorage = {
  /**
   * Never throws. A locked or unavailable Keychain at launch would otherwise take the app down
   * before any screen renders; reading it as "no session" sends Adlyn to sign-in instead.
   */
  async getItem(key) {
    try {
      const item = await Keychain.getGenericPassword({
        service: serviceFor(key),
      });
      return item ? item.password : null;
    } catch (error) {
      console.warn(
        `Keychain read failed for ${key}; treating it as signed out.`,
        error,
      );
      return null;
    }
  },

  /** Rejects on failure, so a session that cannot be saved surfaces as a sign-in error. */
  async setItem(key, value) {
    await Keychain.setGenericPassword(key, value, {
      service: serviceFor(key),
      accessible,
    });
  },

  /** Never throws, so signing out always completes. */
  async removeItem(key) {
    try {
      await Keychain.resetGenericPassword({ service: serviceFor(key) });
    } catch (error) {
      console.warn(`Keychain delete failed for ${key}.`, error);
    }
  },
};
