/**
 * The signed-in app: the five screens, switched like tabs, inside the app frame. React
 * Navigation's ready-made navigators need react-native-screens, which has no macOS support, so
 * this is a small navigator on its tab router that draws no chrome of its own.
 *
 * Screens without a page yet are stand-ins.
 */

import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native';

import { AppFrame } from '@/components/ui/AppFrame';
import { MobileFrame } from '@/components/ui/MobileFrame';
import { supabase } from '@/lib/supabase';
import { FinanceScreen } from '@/modules/finance/FinanceScreen';
import { OverviewScreen } from '@/modules/net-worth/OverviewScreen';
import { TradingScreen } from '@/modules/trading/TradingScreen';
import { NewTransactionSheet } from '@/modules/transactions/NewTransactionSheet';
import { useUiStore } from '@/stores/uiStore';
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
  const newOpen = useUiStore(s => s.newTransactionOpen);
  const setUi = useUiStore(s => s.set);
  const screen = (
    <View testID={`screen-${route.name}`} className="flex-1">
      {descriptors[route.key]!.render()}
      {newOpen && (
        <NewTransactionSheet
          onClose={() => setUi({ newTransactionOpen: false })}
        />
      )}
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
          onNew={() => setUi({ newTransactionOpen: true })}
        />
      }
    >
      {screen}
    </MobileFrame>,
  );
}

const Finny = createNavigatorFactory(FinnyNavigator)();

/** The screens built so far; the rest are stand-ins. */
const SCREEN_COMPONENTS: Partial<Record<ScreenName, () => ReactNode>> = {
  Overview: OverviewScreen,
  Finance: FinanceScreen,
  Trading: TradingScreen,
};

export function RootNavigator() {
  return (
    <Finny.Navigator initialRouteName="Overview">
      {SCREENS.map(({ name }) => (
        <Finny.Screen
          key={name}
          name={name}
          component={SCREEN_COMPONENTS[name] ?? Placeholder}
        />
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
