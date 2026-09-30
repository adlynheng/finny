import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { tokens } from '@/theme/tokens';

const { ink, muted, lime } = tokens.colors;

/** The designs' `eDial()` (FinnyFinance and FinnyPlanner), in its 410-unit viewBox. */
const DIAL = {
  half: 205,
  tick: { inner: 150, long: 20, short: 12, width: 0.9, on: 0.32, off: 0.14 },
  mark: { gap: 9, radius: 4, stroke: 'rgba(28,28,26,.25)', strokeWidth: 0.6 },
  outer: { radius: 188, opacity: 0.16, width: 0.7, dash: '2 4' },
  inner: { radius: 132, opacity: 0.1, width: 0.7 },
  big: { y: 10, size: 46 },
  small: { y: 38, size: 13 },
} as const;

/**
 * A dial with nothing to show yet: an even ring of `count` ticks, the first
 * `filled` longer and darker (the month's days so far), a lime mark by tick
 * `mark`, and a figure with its caption in the middle. The budget dial before
 * a limit is set; the plan dial before there is an income.
 */
export function EmptyDial({
  count,
  filled,
  mark,
  big,
  small,
  testID = 'empty-dial',
}: {
  count: number;
  filled: number;
  /** The tick the lime mark sits by; none when negative. */
  mark: number;
  big: string;
  small: string;
  testID?: string;
}) {
  const { tick } = DIAL;
  const angle = (i: number) =>
    ((-90 + ((i + 0.5) / count) * 360) * Math.PI) / 180;
  const reach = (i: number) =>
    tick.inner + (i < filled ? tick.long : tick.short);
  const markR = reach(mark) + DIAL.mark.gap;
  return (
    <View testID={testID} className="aspect-square w-full">
      <Svg
        width="100%"
        height="100%"
        viewBox={`${-DIAL.half} ${-DIAL.half} ${DIAL.half * 2} ${
          DIAL.half * 2
        }`}
      >
        <Circle
          r={DIAL.outer.radius}
          fill="none"
          stroke={ink}
          strokeOpacity={DIAL.outer.opacity}
          strokeWidth={DIAL.outer.width}
          strokeDasharray={DIAL.outer.dash}
        />
        <Circle
          r={DIAL.inner.radius}
          fill="none"
          stroke={ink}
          strokeOpacity={DIAL.inner.opacity}
          strokeWidth={DIAL.inner.width}
        />
        {Array.from({ length: count }, (_, i) => {
          const a = angle(i);
          const on = i < filled;
          const r2 = reach(i);
          return (
            <Line
              key={i}
              testID={on ? 'empty-dial-tick-on' : 'empty-dial-tick'}
              x1={tick.inner * Math.cos(a)}
              y1={tick.inner * Math.sin(a)}
              x2={r2 * Math.cos(a)}
              y2={r2 * Math.sin(a)}
              stroke={ink}
              strokeOpacity={on ? tick.on : tick.off}
              strokeWidth={tick.width}
              strokeLinecap="round"
            />
          );
        })}
        {mark >= 0 && mark < count && (
          <Circle
            testID="empty-dial-mark"
            cx={markR * Math.cos(angle(mark))}
            cy={markR * Math.sin(angle(mark))}
            r={DIAL.mark.radius}
            fill={lime}
            stroke={DIAL.mark.stroke}
            strokeWidth={DIAL.mark.strokeWidth}
          />
        )}
        <SvgText
          testID="empty-dial-big"
          x={0}
          y={DIAL.big.y}
          textAnchor="middle"
          fontSize={DIAL.big.size}
          fontWeight="300"
          fontFamily={tokens.type.family}
          fill={ink}
          letterSpacing={-0.92}
        >
          {big}
        </SvgText>
        <SvgText
          testID="empty-dial-small"
          x={0}
          y={DIAL.small.y}
          textAnchor="middle"
          fontSize={DIAL.small.size}
          fontFamily={tokens.type.family}
          fill={muted}
        >
          {small}
        </SvgText>
      </Svg>
    </View>
  );
}
