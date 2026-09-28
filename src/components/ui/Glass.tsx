import { BlurView } from 'expo-blur';
import { cssInterop } from 'nativewind';
import { tokens } from '@/theme/tokens';
import { GlassBase } from './GlassBase';
import type { GlassProps } from './glassRecipes';

export type { GlassProps } from './glassRecipes';

// BlurView is a third-party view, so NativeWind has to be told to style it.
cssInterop(BlurView, { className: 'style' });

/**
 * expo-blur's intensity runs 0–100 rather than taking a radius in points. This
 * scale was tuned by eye against the design's CSS blurs on iOS.
 */
const INTENSITY_PER_POINT = 2.5;

/**
 * A surface in one of the design's glass recipes (tokens.glass): fill, hairline
 * border, backdrop blur and shadow. iOS blurs with expo-blur; macOS with
 * Finny's own native view (Glass.macos.tsx).
 */
export function Glass(props: GlassProps) {
  const blur = tokens.glass[props.recipe].blur ?? 0;
  return (
    <GlassBase
      {...props}
      blurLayer={
        <BlurView
          testID="glass-blur"
          pointerEvents="none"
          className="absolute inset-0"
          tint="default"
          intensity={Math.min(100, blur * INTENSITY_PER_POINT)}
        />
      }
    />
  );
}
