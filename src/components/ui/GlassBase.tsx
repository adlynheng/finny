import type { ReactNode } from 'react';
import { View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { cx } from './cardChrome';
import {
  glassBorder,
  glassFill,
  glassRadius,
  glassShadow,
  type GlassProps,
} from './glassRecipes';

type Props = GlassProps & {
  /** The platform's backdrop blur, filling the surface (`absolute inset-0`). */
  blurLayer: ReactNode;
};

/**
 * The surface both Glass files render; only the blur view differs by platform.
 *
 * A blurred recipe draws the blur, then its tint over it (as CSS paints
 * `backdrop-filter` under `background`), in a layer clipped to the corners.
 * The clipping lives on that inner layer rather than on the outer view, which
 * casts the shadow: react-native-macos crashes mounting children into a view
 * that has both `overflow: hidden` and a box shadow. So both views take the
 * same radius, which is why Glass takes `radius` rather than a class.
 *
 * A recipe with no blur is one view with its own fill.
 */
export function GlassBase({
  recipe,
  radius,
  blurLayer,
  className,
  children,
  ...rest
}: Props) {
  const rounded = radius === undefined ? null : glassRadius[radius];

  if (tokens.glass[recipe].blur === null) {
    return (
      <View
        {...rest}
        className={cx(
          glassFill[recipe],
          glassBorder[recipe],
          rounded,
          className,
        )}
        style={glassShadow(recipe)}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      {...rest}
      className={cx(glassBorder[recipe], rounded, className)}
      style={glassShadow(recipe)}
    >
      <View
        testID="glass-clip"
        pointerEvents="none"
        className={cx('absolute inset-0 overflow-hidden', rounded)}
      >
        {blurLayer}
        <View
          testID="glass-fill"
          className={cx('absolute inset-0', glassFill[recipe])}
        />
      </View>
      {children}
    </View>
  );
}
