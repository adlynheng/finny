import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from './AppMark';
import { DotGrid } from './DotGrid';

type Props = {
  children: ReactNode;
  /** Floats over the bottom of the content: the tab bar. */
  bar?: ReactNode;
};

/**
 * The phone screen: dot grid, the system status bar's own height, a 56pt header with the brand,
 * then the content, which runs under the floating bar (screens pad their scroll to clear it).
 */
export function MobileFrame({ children, bar }: Props) {
  return (
    <View testID="mobile-frame" className="flex-1 bg-canvas">
      <DotGrid />
      <SafeAreaView edges={['top']} />
      <View
        testID="mobile-frame-header"
        className="h-mobile-header flex-row items-center px-mobile-x"
      >
        <Brand />
      </View>
      <View className="min-h-0 flex-1">{children}</View>
      {bar}
    </View>
  );
}
