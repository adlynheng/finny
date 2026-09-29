import { Platform, Pressable } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { fireEvent, screen, within } from '@testing-library/react-native';

import { RootNavigator } from '../RootNavigator';
import { SCREENS } from '../routes';
import { renderWithClient } from '../../../test/queryTestUtils';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    ...require('../../../test/supabaseStub').createSupabaseStub(),
    auth: { signOut: jest.fn() },
  },
}));

afterEach(() => jest.restoreAllMocks());

// Overview reads the accounts and snapshots, so the screens need a query client.
const draw = (extra?: React.ReactNode) =>
  renderWithClient(
    <NavigationContainer>
      <RootNavigator />
      {extra}
      <PortalHost />
    </NavigationContainer>,
  );
const header = () => within(screen.getByTestId('app-frame-header'));

describe.each(['ios', 'macos'] as const)('on %s', os => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', os));

  it('opens on Overview and reaches all five screens from its tabs', async () => {
    await draw();
    expect(screen.getByTestId('screen-Overview')).toBeTruthy();
    for (const { name } of [...SCREENS].reverse()) {
      await fireEvent.press(screen.getByTestId(`tab-${name}`));
      expect(screen.getByTestId(`screen-${name}`)).toBeTruthy();
      expect(
        screen.getByTestId(`tab-${name}`).props.accessibilityState.selected,
      ).toBe(true);
    }
  });
});

it('puts the tabs in the header on desktop', async () => {
  jest.replaceProperty(Platform, 'OS', 'macos');
  await draw();
  expect(header().getByTestId('tab')).toBeTruthy();
  expect(screen.queryByTestId('tab-row')).toBeNull();
  expect(screen.queryByTestId('tab-AskFinny')).toBeNull();
});

it('puts the tabs in the floating bar on mobile, with Ask Finny disabled', async () => {
  await draw();
  expect(screen.getByTestId('mobile-frame')).toBeTruthy();
  expect(screen.getByTestId('bottom-bar')).toBeTruthy();
  const finny = screen.getByTestId('tab-AskFinny');
  expect(finny.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(finny);
  expect(screen.getByTestId('screen-Overview')).toBeTruthy();
});

it('opens the new transaction sheet from every tab', async () => {
  await draw();
  for (const { name } of SCREENS) {
    await fireEvent.press(screen.getByTestId(`tab-${name}`));
    await fireEvent.press(screen.getByTestId('new-transaction'));
    expect(screen.getByText('New transaction')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(screen.queryByText('New transaction')).toBeNull();
  }
});

it('draws no navigation chrome of its own', async () => {
  await draw();
  expect(screen.queryAllByRole('header')).toHaveLength(0);
});

it('checks screen names, and goes back to Overview', async () => {
  // Never called: typecheck fails if these names are accepted.
  const typeChecks = (navigation: ReturnType<typeof useNavigation>) => {
    // @ts-expect-error: Ask Finny has no screen.
    navigation.navigate('AskFinny');
    // @ts-expect-error: not a screen.
    navigation.navigate('Budget');
  };
  expect(typeChecks).toBeDefined();

  function Remote() {
    const navigation = useNavigation();
    return (
      <>
        <Pressable testID="go" onPress={() => navigation.navigate('Planner')} />
        <Pressable testID="back" onPress={() => navigation.goBack()} />
      </>
    );
  }
  await draw(<Remote />);
  await fireEvent.press(screen.getByTestId('go'));
  expect(screen.getByTestId('screen-Planner')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('back'));
  expect(screen.getByTestId('screen-Overview')).toBeTruthy();
});
