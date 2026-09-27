/* eslint-env jest */
// Native modules Jest cannot load, replaced by the mocks their packages ship.
import 'react-native-gesture-handler/jestSetup';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
