import { Pressable, View } from 'react-native';

import { Brand } from '@/components/ui/AppMark';
import { Avatar } from '@/components/ui/Avatar';
import { Glass } from '@/components/ui/Glass';
import { Segmented } from '@/components/ui/Segmented';
import { useSettings } from '@/hooks/useSettings';
import { SCREENS, type ScreenName } from './routes';

const TABS = SCREENS.map(({ name, label }) => ({ value: name, label }));

type Props = {
  current: string;
  onSelect: (name: ScreenName) => void;
};

/**
 * The desktop header: brand on the left, the tab pill centred, and on the
 * right the user's avatar, which opens Settings.
 */
export function DesktopHeader({ current, onSelect }: Props) {
  const name = useSettings().data?.name ?? '';
  return (
    <>
      <Brand />
      {/* Centred across the whole header, whatever sits either side. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-[20px] items-center"
      >
        <Glass recipe="navPill" radius={9}>
          <Segmented
            testID="tab"
            size="nav"
            options={TABS}
            value={current as ScreenName}
            onChange={onSelect}
          />
        </Glass>
      </View>
      <Pressable
        testID="profile-button"
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => onSelect('Settings')}
        className="ml-auto hover:opacity-[.85]"
      >
        <Avatar name={name} size="sm" />
      </Pressable>
    </>
  );
}
