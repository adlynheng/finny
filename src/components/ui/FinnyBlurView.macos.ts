import { cssInterop } from 'nativewind';
import { requireNativeComponent, type ViewProps } from 'react-native';

/** AppKit's NSVisualEffectView materials (macos/FinnyBlur). */
export type BlurMaterial =
  | 'titlebar'
  | 'selection'
  | 'menu'
  | 'popover'
  | 'sidebar'
  | 'headerView'
  | 'sheet'
  | 'windowBackground'
  | 'hudWindow'
  | 'fullScreenUI'
  | 'toolTip'
  | 'contentBackground'
  | 'underWindowBackground'
  | 'underPageBackground';

// No pointerEvents: React Native can only set it on its own views, and the app
// aborts if it is set here. The native view ignores clicks anyway.
type Props = Omit<ViewProps, 'pointerEvents'> & {
  material?: BlurMaterial;
  /** The material's tint: light (default) or dark. */
  appearance?: 'light' | 'dark';
  className?: string;
};

/**
 * macOS backdrop blur: the native FinnyBlurView (macos/FinnyBlur), which blurs
 * the app's own views behind it. macOS only; iOS uses expo-blur.
 */
export const FinnyBlurView = requireNativeComponent<Props>('FinnyBlurView');

cssInterop(FinnyBlurView, { className: 'style' });
