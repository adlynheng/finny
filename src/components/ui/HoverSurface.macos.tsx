import { cssInterop } from 'nativewind';
import {
  requireNativeComponent,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';
import type { HoverPoint, HoverSurfaceProps } from './hoverTypes';

// No pointerEvents: React Native can only set it on its own views, and the app
// aborts if it is set here. The native view never takes clicks anyway.
type NativeProps = Omit<ViewProps, 'pointerEvents'> & {
  onHoverMove: (e: NativeSyntheticEvent<HoverPoint>) => void;
  onHoverEnd: () => void;
  className?: string;
};

const FinnyHoverView = requireNativeComponent<NativeProps>('FinnyHoverView');

cssInterop(FinnyHoverView, { className: 'style' });

/**
 * Pointer tracking for chart hover: the native FinnyHoverView (macos/
 * FinnyHover) reports every mouse move inside it, which react-native-macos
 * does not. It fills its parent and passes clicks through.
 */
export function HoverSurface({
  onHover,
  className,
  testID,
}: HoverSurfaceProps) {
  return (
    <FinnyHoverView
      testID={testID}
      className={className ?? 'absolute inset-0'}
      onHoverMove={e => onHover(e.nativeEvent)}
      onHoverEnd={() => onHover(null)}
    />
  );
}
