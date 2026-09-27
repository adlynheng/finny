/**
 * Rendering hooks and components inside a fresh QueryClient, so no test sees another's cache.
 * Importing this file registers an afterEach that clears every client it made.
 */

import type { ReactElement, ReactNode } from 'react';
import {
  notifyManager,
  QueryClientProvider,
  type QueryClient,
} from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';

import { createQueryClient } from '@/lib/queryClient';

// TanStack Query tells React about changes on a zero-length timer, which can fire after the act()
// that caused them has ended and log a warning. Tests have it notify straight away instead.
notifyManager.setScheduler(callback => callback());

const clients = new Set<QueryClient>();

afterEach(() => {
  clients.forEach(client => client.clear());
  clients.clear();
});

/**
 * The app's client with retries off, so an error surfaces on the first failure, and garbage
 * collection off, so no timer outlives the test.
 */
export function createTestQueryClient() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: {
      ...client.getDefaultOptions().queries,
      retry: false,
      gcTime: Infinity,
    },
    mutations: { retry: false, gcTime: Infinity },
  });
  clients.add(client);
  return client;
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

export async function renderHookWithClient<Result>(
  hook: () => Result,
  client = createTestQueryClient(),
) {
  const rendered = await renderHook(hook, { wrapper: wrapperFor(client) });
  return { ...rendered, client };
}

export async function renderWithClient(
  element: ReactElement,
  client = createTestQueryClient(),
) {
  const rendered = await render(element, { wrapper: wrapperFor(client) });
  return { ...rendered, client };
}
