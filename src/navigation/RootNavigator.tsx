/**
 * The signed-in app: the five screens, switched like tabs, inside the app frame. React
 * Navigation's ready-made navigators need react-native-screens, which has no macOS support, so
 * this is a small navigator on its tab router that draws no chrome of its own.
 *
 * The mobile tab row and the screens are stand-ins: the mobile bar comes in Task 47, the pages
 * from Phase I on.
 */

import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native';

import { AppFrame } from '@/components/ui/AppFrame';
import { Brand } from '@/components/ui/AppMark';
import { supabase } from '@/lib/supabase';
import { DesktopHeader } from './DesktopHeader';
import { MOBILE_TABS, SCREENS, type ScreenName } from './routes';

type NavigatorProps = { initialRouteName: ScreenName; children: ReactNode };

function FinnyNavigator({ initialRouteName, children }: NavigatorProps) {
  const { state, navigation, descriptors, render } = useNavigationBuilder(
    TabRouter,
    { initialRouteName, children, backBehavior: 'firstRoute' },
  );
  const route = state.routes[state.index]!;
  const select = (name: ScreenName) => navigation.navigate(name);
  // Desktop switches screens from its header, mobile from a row under them.
  const desktop = Platform.OS === 'macos';

  return render(
    <AppFrame
      header={
        desktop ? (
          <DesktopHeader current={route.name} onSelect={select} />
        ) : (
          <Brand />
        )
      }
    >
      <View testID={`screen-${route.name}`} className="flex-1">
        {descriptors[route.key]!.render()}
      </View>
      {!desktop && <TabRow current={route.name} onSelect={select} />}
    </AppFrame>,
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
    <View className="flex-1 gap-y-2">
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

type TabRowProps = {
  current: string;
  onSelect: (name: ScreenName) => void;
};

function TabRow({ current, onSelect }: TabRowProps) {
  return (
    <View testID="tab-row" className="flex-row gap-x-4">
      {MOBILE_TABS.map(({ name, label }) => {
        const live = name !== 'AskFinny';
        return (
          <Pressable
            key={name}
            testID={`tab-${name}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: name === current, disabled: !live }}
            disabled={!live}
            onPress={() => live && onSelect(name)}
          >
            <Text
              className={`font-sans text-[13px] ${
                name === current ? 'text-ink' : 'text-muted'
              } ${live ? '' : 'opacity-40'}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
