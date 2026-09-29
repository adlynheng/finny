import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { tokens } from '@/theme/tokens';

const { ink, limeDark } = tokens.colors;

/** The app mark: the sphere hero's wireframe glyph with a lime centre, on a bevelled tile. */
export function AppMark() {
  return (
    <View
      testID="app-mark"
      className="size-9 items-center justify-center rounded-6 border border-white/80 bg-white/60"
      style={{ boxShadow: tokens.frame.desktop.markShadow }}
    >
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Circle
          cx={10}
          cy={10}
          r={8}
          fill="none"
          stroke={ink}
          strokeWidth={0.8}
        />
        <Ellipse
          cx={10}
          cy={10}
          rx={8}
          ry={3}
          fill="none"
          stroke={ink}
          strokeWidth={0.8}
        />
        <Ellipse
          cx={10}
          cy={10}
          rx={3}
          ry={8}
          fill="none"
          stroke={ink}
          strokeWidth={0.8}
        />
        <Circle cx={10} cy={10} r={1.8} fill={limeDark} />
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
