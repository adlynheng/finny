/**
 * The app's one Supabase client. index.js loads the URL polyfill before anything imports this.
 *
 * The URL and anon key are inlined by Babel at bundle time (scripts/build-env.js, from `.env`).
 * The anon key reaches nothing on its own: the database grants `anon` no privileges, so every
 * query runs as Adlyn's signed-in session (build plan Global constraints).
 */

import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { keychainStorage } from './keychainStorage';
import type { Database } from '@/types/database';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_ANON_KEY must be set when the JS bundle is built. Copy .env.example ' +
      'to .env, fill it in, and restart Metro (or rebuild the .ipa).',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: keychainStorage,
    persistSession: true,
    autoRefreshToken: true,
    // There is no browser URL to read a session from.
    detectSessionInUrl: false,
  },
});

// Refresh the token only while the app is in the foreground; supabase-js's own timer cannot tell
// when a native app is suspended.
AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
