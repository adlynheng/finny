import type { GlassName } from '@/theme/tokens';
import { FinnyBlurView } from './FinnyBlurView.macos';
import { GlassBase } from './GlassBase';
import type { GlassProps } from './glassRecipes';

export type { GlassProps } from './glassRecipes';

/**
 * How each blurred recipe blurs on macOS. NSVisualEffectView blurs at one
 * fixed, large radius under its material's own tint, so the design's radii
 * cannot be matched; each recipe takes the reading that looks closest.
 * `popover` is AppKit's most neutral see-through material.
 */
const blurFor: Partial<Record<GlassName, 'light' | 'dark' | 'none'>> = {
  chip: 'light',
  navPill: 'light',
  card: 'light',
  modalScrim: 'light',
  // An ink scrim: the light material's white wash would cancel the ink.
  sheetScrim: 'dark',
  // A 10% white over a dark gradient: any material greys the gradient out and
  // the white text with it, so it keeps only its faint fill.
  onGradient: 'none',
  // The history tooltip, also over a gradient card: the same reasoning.
  tooltip: 'none',
};

/**
 * Glass on macOS. expo-blur has no macOS support (Phase A spike report §2), so
 * this blurs with Finny's own NSVisualEffectView view (macos/FinnyBlur), and
 * the recipe's tint goes over it as on iOS.
 *
 * Must not import expo-blur, which is not linked into the macOS app.
 */
export function Glass(props: GlassProps) {
  const blur = blurFor[props.recipe] ?? 'none';
  return (
    <GlassBase
      {...props}
      blurLayer={
        blur === 'none' ? null : (
          // No pointerEvents: the native view ignores clicks itself.
          <FinnyBlurView
            testID="glass-blur"
            material="popover"
            appearance={blur}
            className="absolute inset-0"
          />
        )
      }
    />
  );
}
