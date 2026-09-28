/* eslint-env jest */
// Native modules Jest cannot load, replaced by the mocks their packages ship.
import 'react-native-gesture-handler/jestSetup';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// expo-blur's BlurView is a native Expo view. A plain View stands in; it keeps
// every prop, so tests can read the intensity and tint Glass asks for. (Not a
// wrapper component: NativeWind's Babel preset rewrites createElement, which a
// jest.mock factory may not reference.)
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));

// Jest does not compile NativeWind: className stays a plain prop, which is what
// the component tests assert. Registering a third-party view is a no-op here.
jest.mock('nativewind', () => ({ cssInterop: () => {} }));
