import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import { createQueryClient, refetchOnAppFocus } from '@/lib/queryClient';

type Props = {
  children: ReactNode;
  /** Tests pass their own; the app makes one on first render and keeps it. */
  client?: QueryClient;
};

/**
 * The providers every screen sits inside, outermost first: gesture root, safe area, query client.
 * The navigation container (Task 45) goes inside these.
 */
export function AppProviders({ children, client }: Props) {
  const [queryClient] = useState(() => client ?? createQueryClient());

  useEffect(() => refetchOnAppFocus(), []);

  return (
    <GestureHandlerRootView>
      {/* The launch metrics let the first frame lay out with real insets instead of blank. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
