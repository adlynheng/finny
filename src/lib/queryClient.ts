/**
 * TanStack Query setup. The app makes one client at launch (src/App.tsx); tests make their own so
 * no cache leaks between them.
 */

import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that switching screens reuses data, short enough that a return to the app
        // shows edits made on the other device.
        staleTime: 30_000,
        retry: 2,
        refetchOnWindowFocus: true,
      },
      // A retried insert could write the same transaction twice.
      mutations: { retry: 0 },
    },
  });
}

/**
 * React Native has no window focus event, so TanStack Query never refetches on focus by itself.
 * This feeds it AppState instead. On macOS that is the app becoming active again after sitting
 * idle behind other windows, which is when stale numbers are most likely. Returns an unsubscribe.
 */
export function refetchOnAppFocus() {
  focusManager.setEventListener(setFocused => {
    const subscription = AppState.addEventListener('change', state => {
      setFocused(state === 'active');
    });
    return () => subscription.remove();
  });
  return () => focusManager.setEventListener(() => undefined);
}
