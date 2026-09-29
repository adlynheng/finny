/**
 * @format
 */

import './global.css';
import type { ReactNode } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from '@/components/AppProviders';
import { AppFrame } from '@/components/ui/AppFrame';
import { Brand } from '@/components/ui/AppMark';
import { SessionGate } from '@/modules/auth/SessionGate';
import { RootNavigator } from '@/navigation/RootNavigator';

/** Frames the sign-in form and the wait for the stored session. */
const signedOutFrame = (content: ReactNode) => (
  <AppFrame header={<Brand />}>{content}</AppFrame>
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
