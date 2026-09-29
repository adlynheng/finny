import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Brand } from '@/components/ui/AppMark';
import { Glass } from '@/components/ui/Glass';
import { Segmented } from '@/components/ui/Segmented';
import { tokens } from '@/theme/tokens';
import { SCREENS, type ScreenName } from './routes';

const TABS = SCREENS.map(({ name, label }) => ({ value: name, label }));

type Props = {
  current: string;
  onSelect: (name: ScreenName) => void;
};

/** The desktop header: brand on the left, the tab pill centred, the profile button on the right. */
export function DesktopHeader({ current, onSelect }: Props) {
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
      <Glass recipe="chip" radius={6} className="ml-auto">
        <Pressable
          testID="profile-button"
          accessibilityRole="button"
          accessibilityLabel="Profile"
          // The chip's .55 white plus .78 of the rest reads as the design's .9 white on hover.
          className="size-[34px] items-center justify-center rounded-6 hover:bg-white/[.78]"
        >
          <Svg width={15} height={15} viewBox="0 0 16 16">
            <Circle
              cx={8}
              cy={5.5}
              r={2.8}
              fill="none"
              stroke={tokens.colors.ink}
              strokeWidth={1.1}
            />
            <Path
              d="M2.5 14c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2"
              fill="none"
              stroke={tokens.colors.ink}
              strokeWidth={1.1}
            />
          </Svg>
        </Pressable>
      </Glass>
    </>
  );
}
