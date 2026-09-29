/**
 * @format
 */

import './global.css';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from '@/components/AppProviders';
import { AppFrame } from '@/components/ui/AppFrame';
import { Brand } from '@/components/ui/AppMark';
import { MobileFrame } from '@/components/ui/MobileFrame';
import { SessionGate } from '@/modules/auth/SessionGate';
import { RootNavigator } from '@/navigation/RootNavigator';

/** Frames the sign-in form and the wait for the stored session. */
const signedOutFrame = (content: ReactNode) =>
  Platform.OS === 'macos' ? (
    <AppFrame header={<Brand />}>{content}</AppFrame>
  ) : (
    <MobileFrame>{content}</MobileFrame>
  );

function App() {
  return (
    <AppProviders>
      <SessionGate frame={signedOutFrame}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SessionGate>
    </AppProviders>
  );
}

export default App;
