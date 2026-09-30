import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { cx } from '@/components/ui/cardChrome';
import { Glass } from '@/components/ui/Glass';
import { useUiStore, type SettingsPanel } from '@/stores/uiStore';
import { PANELS, type PanelHead } from './useSettingsData';

/** The selected item's lift. */
const LIFT = { boxShadow: '0 1px 3px rgba(0,0,0,.08)' };

/**
 * The four panels to switch between, each with its count underneath. On
 * desktop a glass column, the selected item white with a lime dot; on mobile
 * a row of chips that scrolls sideways when it does not fit.
 */
export function SettingsNav({
  heads,
}: {
  heads: Record<SettingsPanel, PanelHead>;
}) {
  const panel = useUiStore(s => s.settingsPanel);
  const setUi = useUiStore(s => s.set);
  const mobile = Platform.OS === 'ios';

  const items = PANELS.map(key => {
    const on = key === panel;
    return (
      <Pressable
        key={key}
        testID={`settings-nav-${key}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={heads[key].title}
        onPress={() => setUi({ settingsPanel: key })}
        className={cx(
          mobile
            ? 'shrink-0 grow items-center gap-y-px rounded-[7px] px-[12px] py-[8px]'
            : 'flex-row items-center justify-between gap-x-[8px] rounded-6 px-[12px] py-[11px]',
          on && 'bg-white',
        )}
        style={on ? LIFT : undefined}
      >
        <View className={cx('gap-y-[2px]', !mobile && 'min-w-0 flex-1')}>
          <Text
            numberOfLines={1}
            className={cx(
              'font-sans text-[13px]',
              on ? 'text-ink' : 'text-muted',
            )}
          >
            {heads[key].title}
          </Text>
          <Text
            numberOfLines={1}
            className="font-sans text-[11px] text-muted ios:text-center ios:text-[10px]"
          >
            {heads[key].count}
          </Text>
        </View>
        {on && !mobile && (
          <View
            testID="settings-nav-dot"
            className="size-[12px] items-center justify-center rounded-full bg-lime/30"
          >
            <View className="size-[6px] rounded-full bg-lime" />
          </View>
        )}
      </Pressable>
    );
  });

  if (mobile) {
    return (
      <Glass recipe="card" radius={10} className="p-[4px]">
        <ScrollView
          testID="settings-nav"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="grow gap-x-[2px]"
        >
          {items}
        </ScrollView>
      </Glass>
    );
  }
  return (
    <Glass
      testID="settings-nav"
      recipe="card"
      radius={6}
      className="flex-1 gap-y-[2px] p-[8px]"
    >
      {items}
    </Glass>
  );
}
