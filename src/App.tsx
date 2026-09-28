/**
 * @format
 */

import './global.css';
import { Pressable, Text, View } from 'react-native';
import { AppProviders } from '@/components/AppProviders';
import { AppFrame } from '@/components/ui/AppFrame';
import { SurfacesGallery } from '@/dev/SurfacesGallery';
import { supabase } from '@/lib/supabase';
import { SessionGate } from '@/modules/auth/SessionGate';

function App() {
  return (
    <AppProviders>
      <AppFrame
        header={
          // Placeholder until the desktop header (Task 46).
          <Text className="font-sans text-[17px] font-medium text-ink">
            Finny
          </Text>
        }
      >
        <SessionGate>
          {session => (
            // Placeholder until the pages exist (Phase H onwards).
            <View className="flex-1 gap-y-2">
              {/* Temporary: Task 31's surfaces, to check by eye. */}
              <View className="flex-1">
                <SurfacesGallery />
              </View>
              <Text className="font-sans text-[13px] text-muted">
                Signed in as {session.user.email}
              </Text>
              <Pressable
                accessibilityRole="button"
                // Local: signing out here leaves the other device signed in.
                onPress={() => supabase.auth.signOut({ scope: 'local' })}
              >
                <Text className="font-sans text-[13px] font-medium text-ink">
                  Sign out
                </Text>
              </Pressable>
            </View>
          )}
        </SessionGate>
      </AppFrame>
    </AppProviders>
  );
}

export default App;
