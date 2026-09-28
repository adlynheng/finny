import Svg, { Path } from 'react-native-svg';
import { tokens } from '@/theme/tokens';

type Props = {
  /** A path from the registry. */
  path: string;
  /** Rendered size in points; the path is drawn on a 16×16 grid. */
  size?: number;
  color?: string;
  /** 1.1 in lists and tiles, 1.2 in chips and the icon picker. */
  strokeWidth?: number;
  testID?: string;
};

/** A registry icon: one stroked path on a 16×16 viewBox, never filled. */
export function Icon({
  path,
  size = 16,
  color = tokens.colors.ink,
  strokeWidth = 1.1,
  testID,
}: Props) {
  return (
    <Svg testID={testID} width={size} height={size} viewBox="0 0 16 16">
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
