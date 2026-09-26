import { View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { tokens } from '@/theme/tokens';

const { color, dotRadius, spacing } = tokens.backdrop.dotGrid;

/**
 * The design's `radial-gradient(rgba(28,28,26,.07) 1px, transparent 1.3px)` at
 * 14×14: React Native has no repeating background, so one dot centred in each
 * 14pt tile, tiled by an SVG pattern.
 *
 * pointerEvents="none" is load-bearing: the grid sits on top of the frame's
 * background, and if it took touches every card behind it would stop responding.
 */
export function DotGrid() {
  return (
    <View testID="dot-grid" pointerEvents="none" className="absolute inset-0">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="dot-grid"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <Circle
              testID="dot-grid-dot"
              cx={spacing / 2}
              cy={spacing / 2}
              r={dotRadius}
              fill={color}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dot-grid)" />
      </Svg>
    </View>
  );
}
