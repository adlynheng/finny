/**
 * The signed-in app: the five screens, switched like tabs, inside the app frame. React
 * Navigation's ready-made navigators need react-native-screens, which has no macOS support, so
 * this is a small navigator on its tab router that draws no chrome of its own.
 *
 * The screens are stand-ins until the pages arrive, from Phase I on.
 */

import { useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native';

import { AppFrame } from '@/components/ui/AppFrame';
import { MobileFrame } from '@/components/ui/MobileFrame';
import { Sheet } from '@/components/ui/Sheet';
import { supabase } from '@/lib/supabase';
import { BottomBar } from './BottomBar';
import { DesktopHeader } from './DesktopHeader';
import { SCREENS, type ScreenName } from './routes';

type NavigatorProps = { initialRouteName: ScreenName; children: ReactNode };

function FinnyNavigator({ initialRouteName, children }: NavigatorProps) {
  const { state, navigation, descriptors, render } = useNavigationBuilder(
    TabRouter,
    { initialRouteName, children, backBehavior: 'firstRoute' },
  );
  const route = state.routes[state.index]!;
  const select = (name: ScreenName) => navigation.navigate(name);
  const [newOpen, setNewOpen] = useState(false);
  const screen = (
    <View testID={`screen-${route.name}`} className="flex-1">
      {descriptors[route.key]!.render()}
    </View>
  );

  if (Platform.OS === 'macos') {
    return render(
      <AppFrame
        header={<DesktopHeader current={route.name} onSelect={select} />}
      >
        {screen}
      </AppFrame>,
    );
  }
  return render(
    <MobileFrame
      bar={
        <BottomBar
          current={route.name}
          onSelect={select}
          onNew={() => setNewOpen(true)}
        />
      }
    >
      {screen}
      {/* The form itself comes with Task 54. */}
      <Sheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New transaction"
      >
        <Text className="font-sans text-[13px] text-muted">
          The form comes next.
        </Text>
      </Sheet>
    </MobileFrame>,
  );
}

const Finny = createNavigatorFactory(FinnyNavigator)();

export function RootNavigator() {
  return (
    <Finny.Navigator initialRouteName="Overview">
      {SCREENS.map(({ name }) => (
        <Finny.Screen key={name} name={name} component={Placeholder} />
      ))}
    </Finny.Navigator>
  );
}

function Placeholder({ route }: { route: { name: ScreenName } }) {
  return (
    <View className="flex-1 gap-y-2 ios:px-mobile-x ios:pt-mobile-top">
      <Text className="font-sans text-[24px] font-light text-ink">
        {SCREENS.find(s => s.name === route.name)!.label}
      </Text>
      {route.name === 'Settings' && (
        <Pressable
          accessibilityRole="button"
          // Local: signing out here leaves the other device signed in.
          onPress={() => supabase.auth.signOut({ scope: 'local' })}
        >
          <Text className="font-sans text-[13px] font-medium text-ink">
            Sign out
          </Text>
        </Pressable>
      )}
    </View>
  );
}
