import type { ReactNode } from 'react';
import { View } from 'react-native';
import { DotGrid } from './DotGrid';

type Props = {
  /** Contents of the 76pt header row (logo, tab pill, account button). */
  header: ReactNode;
  children: ReactNode;
};

/** The desktop window: dot grid behind a header row and the page area. */
export function AppFrame({ header, children }: Props) {
  return (
    <View testID="app-frame" className="flex-1 bg-canvas">
      <DotGrid />
      <View
        testID="app-frame-header"
        className="h-frame-header flex-row items-center gap-x-frame-header-gap px-frame-header-x"
      >
        {header}
      </View>
      <View
        testID="app-frame-content"
        className="min-h-0 flex-1 px-frame-x pb-frame-bottom pt-frame-top"
      >
        {children}
      </View>
    </View>
  );
}
