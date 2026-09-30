/**
 * The signed-in app: the five screens, switched like tabs, inside the app frame. React
 * Navigation's ready-made navigators need react-native-screens, which has no macOS support, so
 * this is a small navigator on its tab router that draws no chrome of its own.
 */

import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native';

import { AppFrame } from '@/components/ui/AppFrame';
import { MobileFrame } from '@/components/ui/MobileFrame';
import { FinanceScreen } from '@/modules/finance/FinanceScreen';
import { OverviewScreen } from '@/modules/net-worth/OverviewScreen';
import { useSnapshotSync } from '@/modules/net-worth/useSnapshotSync';
import { PlannerScreen } from '@/modules/planner/PlannerScreen';
import { SettingsScreen } from '@/modules/settings/SettingsScreen';
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
  useSnapshotSync();
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

/** Each screen's page. */
const SCREEN_COMPONENTS: Record<ScreenName, () => ReactNode> = {
  Overview: OverviewScreen,
  Finance: FinanceScreen,
  Trading: TradingScreen,
  Planner: PlannerScreen,
  Settings: SettingsScreen,
};

export function RootNavigator() {
  return (
    <Finny.Navigator initialRouteName="Overview">
      {SCREENS.map(({ name }) => (
        <Finny.Screen
          key={name}
          name={name}
          component={SCREEN_COMPONENTS[name]}
        />
      ))}
    </Finny.Navigator>
  );
}
