import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { tokens } from '@/theme/tokens';

const { ink } = tokens.colors;

/** The logomark's height in pt, and its 1pt stroke in viewBox units (it stays 1pt at any size). */
const LOGO = 22;
const STROKE = 148 / LOGO;

/**
 * The app mark: the Finny F (the design's logomark 1a, three overlapping
 * rounded bars) on a bevelled tile (6px corners, 8 on mobile).
 */
export function AppMark() {
  return (
    <View
      testID="app-mark"
      className="size-9 items-center justify-center rounded-6 border ios:rounded-8 border-white/80 bg-white/60"
      style={{ boxShadow: tokens.frame.desktop.markShadow }}
    >
      <Svg
        testID="finny-logo"
        width={(LOGO * 111) / 148}
        height={LOGO}
        viewBox="-4 -4 111 148"
        fill="none"
      >
        {[
          { y: 0, width: 40, height: 140 },
          { y: 0, width: 103, height: 40 },
          { y: 54, width: 80, height: 40 },
        ].map(bar => (
          <Rect
            key={`${bar.y}-${bar.width}`}
            x={0}
            rx={18}
            {...bar}
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

/** The mark beside the "Finny" wordmark. */
export function Brand() {
  return (
    <View className="flex-row items-center gap-x-[10px]">
      <AppMark />
      <Text className="font-sans text-[17px] font-medium tracking-[-0.17px] text-ink">
        Finny
      </Text>
    </View>
  );
}
