import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Icon } from '@/components/icons/Icon';
import { tabIcons, type TabIconKey } from '@/components/icons/registry';
import { Glass } from '@/components/ui/Glass';
import { useSlidingPill } from '@/components/ui/useSlidingPill';
import { tokens } from '@/theme/tokens';
import { MOBILE_TABS, type ScreenName } from './routes';

const { ink, muted2, lime } = tokens.colors;

const ICONS: Record<(typeof MOBILE_TABS)[number]['name'], TabIconKey> = {
  Overview: 'overview',
  Finance: 'finance',
  Trading: 'trading',
  Planner: 'plan',
  AskFinny: 'finny',
  Settings: 'settings',
};

type Props = {
  current: string;
  onSelect: (name: ScreenName) => void;
  /** The FAB: a new transaction, from any tab. */
  onNew: () => void;
};

/**
 * The floating glass bar: three tabs either side of the ink new-transaction button. Ask Finny
 * has no screen this build, so its tab is disabled.
 */
export function BottomBar({ current, onSelect, onNew }: Props) {
  const pill = useSlidingPill(current);
  const tab = ({ name, label }: (typeof MOBILE_TABS)[number]) => {
    const active = name === current;
    const live = name !== 'AskFinny';
    return (
      <Pressable
        key={name}
        testID={`tab-${name}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: active, disabled: !live }}
        disabled={!live}
        onPress={() => live && onSelect(name)}
        onLayout={pill.measure(name)}
        className={`h-bar-tab min-w-0 flex-1 items-center justify-center gap-y-[4px] ${
          live ? '' : 'opacity-disabled'
        }`}
      >
        <View>
          <Icon
            path={tabIcons[ICONS[name]]}
            size={19}
            color={active ? ink : muted2}
          />
          {/* The notification dot: lit on the active tab, as in the design. */}
          <View
            testID={`tab-${name}-dot`}
            className={`absolute right-[-6px] top-[-4px] size-[10px] rounded-full border-2 border-white bg-lime ${
              active ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </View>
        <Text
          numberOfLines={1}
          className={`font-sans text-[9.5px] ${
            active ? 'text-ink' : 'text-muted-2'
          }`}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Glass
      testID="bottom-bar"
      recipe="bottomBar"
      radius="bottomPill"
      className="absolute inset-x-bar-x bottom-bar-bottom"
    >
      {/* Inside the glass's border, so the tabs' measured x is the pill's left. */}
      <View className="flex-row gap-x-[2px] p-[5px]">
        {/* The active tab's white fill, sliding from tab to tab. */}
        {pill.ready && (
          <Animated.View
            testID="tab-pill"
            pointerEvents="none"
            className="absolute bottom-[5px] top-[5px] rounded-bottom-tab bg-white"
            style={[
              { boxShadow: tokens.controls.segmented.navShadow },
              pill.style,
            ]}
          />
        )}
        {MOBILE_TABS.slice(0, 3).map(tab)}
        <View className="w-[58px] items-center justify-center">
          <Pressable
            testID="new-transaction"
            accessibilityRole="button"
            accessibilityLabel="New transaction"
            onPress={onNew}
            className="size-fab items-center justify-center rounded-full bg-ink"
            style={{ boxShadow: tokens.frame.mobile.bottomBar.fabShadow }}
          >
            <Svg width={18} height={18} viewBox="0 0 12 12">
              <Path
                d="M6 1.5v9M1.5 6h9"
                fill="none"
                stroke={lime}
                strokeWidth={1.3}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>
        {MOBILE_TABS.slice(3).map(tab)}
      </View>
    </Glass>
  );
}
