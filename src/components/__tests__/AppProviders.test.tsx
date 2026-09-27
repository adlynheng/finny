import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppProviders } from '../AppProviders';
import { createQueryClient } from '@/lib/queryClient';

// Each test hands in its client and clears it afterwards: a client's cache keeps a garbage-collection
// timer running after unmount, which would hold Jest open.
let client: QueryClient;

beforeEach(() => {
  client = createQueryClient();
});

afterEach(() => {
  client.clear();
});

function Probe() {
  const insets = useSafeAreaInsets();
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: async () => 'loaded',
  });
  return (
    <Text>
      {data ?? 'loading'} · top {insets.top}
    </Text>
  );
}

it('gives its children a query client and safe-area insets', async () => {
  await render(
    <AppProviders client={client}>
      <Probe />
    </AppProviders>,
  );

  expect(await screen.findByText('loaded · top 0')).toBeTruthy();
});

it('uses the client it is given', async () => {
  let seen: QueryClient | undefined;
  function Capture() {
    seen = useQueryClient();
    return null;
  }

  await render(
    <AppProviders client={client}>
      <Capture />
    </AppProviders>,
  );

  expect(seen).toBe(client);
});
