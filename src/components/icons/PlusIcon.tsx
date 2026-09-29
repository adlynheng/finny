import Svg, { Path } from 'react-native-svg';

type Props = { size: number; color: string; strokeWidth: number };

/** The design's plus, on its own 12×12 grid: the FAB and the Add buttons. */
export function PlusIcon({ size, color, strokeWidth }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path
        d="M6 1.5v9M1.5 6h9"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
