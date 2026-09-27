import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

import { createQueryClient, refetchOnAppFocus } from '../queryClient';

afterEach(() => {
  jest.restoreAllMocks();
  focusManager.setFocused(undefined);
});

it('treats data as fresh briefly, retries a little, and refetches on focus', () => {
  const { queries, mutations } = createQueryClient().getDefaultOptions();

  expect(queries?.staleTime).toBe(30_000);
  expect(queries?.retry).toBe(2);
  expect(queries?.refetchOnWindowFocus).toBe(true);
  expect(mutations?.retry).toBe(0);
});

it('makes a fresh client each time, so tests never share a cache', () => {
  expect(createQueryClient().getQueryCache()).not.toBe(
    createQueryClient().getQueryCache(),
  );
});

it('tells TanStack Query the app is focused only while it is active', () => {
  let emit: (state: AppStateStatus) => void = () => {};
  const remove = jest.fn();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, listener) => {
      emit = listener;
      return { remove };
    });

  const stop = refetchOnAppFocus();

  emit('background');
  expect(focusManager.isFocused()).toBe(false);
  emit('active');
  expect(focusManager.isFocused()).toBe(true);
  emit('inactive');
  expect(focusManager.isFocused()).toBe(false);

  stop();
  expect(remove).toHaveBeenCalledTimes(1);
});
