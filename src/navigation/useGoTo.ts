import { useContext } from 'react';
import { NavigationContext } from '@react-navigation/native';

import type { ScreenName } from './routes';

/**
 * Opens another tab from inside a screen: an empty card's "Add in Settings".
 * Read from the context rather than `useNavigation`, which throws outside a
 * navigator, so a card rendered on its own (in a test) still renders; there
 * the press does nothing.
 */
export function useGoTo() {
  const navigation = useContext(NavigationContext);
  return (name: ScreenName) => navigation?.navigate(name);
}
