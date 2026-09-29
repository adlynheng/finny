import { useId, useState } from 'react';
import { processColor, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type {
  GradientSpec,
  GradientStop,
  LinearGradientSpec,
  RadialGradientSpec,
} from '@/theme/gradients';
import { linearGradientLine, radialGradientShape } from './gradientGeometry';

type Props = {
  gradient: GradientSpec;
  /** Corner radius, matching the parent's, so no clipping is needed. */
  radius?: number;
  testID?: string;
};

type Size = { width: number; height: number };

/**
 * Paints a design gradient behind its parent's content, filling the parent.
 *
 * It draws a rounded SVG rect rather than relying on the parent to clip, since
 * `overflow: hidden` misplaces children on react-native-macos (Phase A spike
 * report §2). CSS gradient geometry depends on the box's aspect ratio, so it
 * waits for its first layout before drawing.
 *
 * A blurred glow bleeds past the box, as CSS `filter: blur()` does: the SVG
 * grows by three deviations on every side, where the Gaussian has all but
 * faded, and the gradient is drawn in the box inside that margin.
 */
export function GradientFill({ gradient, radius = 0, testID }: Props) {
  const [size, setSize] = useState<Size | null>(null);
  // useId gives ":r0:"-style ids; SVG url(#…) references want plain ones.
  const id = `gradient-${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const layers = gradient.kind === 'layers' ? gradient.layers : [gradient];
  const bleed = 3 * Math.max(0, ...layers.map(layer => blurOf(layer) ?? 0));

  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
    setSize(current =>
      current?.width === layout.width && current.height === layout.height
        ? current
        : { width: layout.width, height: layout.height },
    );

  return (
    <View
      testID={testID}
      pointerEvents="none"
      className="absolute inset-0"
      onLayout={onLayout}
    >
      {size && size.width > 0 && size.height > 0 ? (
        <Svg
          width={size.width + 2 * bleed}
          height={size.height + 2 * bleed}
          style={{ margin: -bleed }}
        >
          <Defs>
            {layers.map((layer, i) => (
              <GradientDef key={i} id={`${id}-${i}`} spec={layer} size={size} />
            ))}
            {layers.map((layer, i) =>
              blurOf(layer) ? (
                <Filter
                  key={i}
                  id={`${id}-${i}-blur`}
                  filterUnits="userSpaceOnUse"
                  x={-bleed}
                  y={-bleed}
                  width={size.width + 2 * bleed}
                  height={size.height + 2 * bleed}
                >
                  <FeGaussianBlur stdDeviation={blurOf(layer)} />
                </Filter>
              ) : null,
            )}
          </Defs>
          <G x={bleed} y={bleed}>
            {layers.map((layer, i) => (
              <Rect
                key={i}
                width={size.width}
                height={size.height}
                rx={radius}
                ry={radius}
                fill={`url(#${id}-${i})`}
                filter={blurOf(layer) ? `url(#${id}-${i}-blur)` : undefined}
              />
            ))}
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

function GradientDef({
  id,
  spec,
  size,
}: {
  id: string;
  spec: LinearGradientSpec | RadialGradientSpec;
  size: Size;
}) {
  const stops = spec.stops.map(stop => (
    <Stop
      key={stop.offset}
      offset={stop.offset}
      stopColor={stop.color}
      stopOpacity={alphaOf(stop)}
    />
  ));
  if (spec.kind === 'linear') {
    return (
      <LinearGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        {...linearGradientLine(spec.angle, size.width, size.height)}
      >
        {stops}
      </LinearGradient>
    );
  }
  return (
    <RadialGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      {...radialGradientShape(spec, size.width, size.height)}
    >
      {stops}
    </RadialGradient>
  );
}

/** The CSS `filter: blur()` radius, which is also the Gaussian's deviation. */
function blurOf(spec: LinearGradientSpec | RadialGradientSpec) {
  return spec.kind === 'radial' ? spec.blur : undefined;
}

/**
 * react-native-svg takes a stop's opacity from `stopOpacity` alone and drops
 * any alpha written in its colour, so rgba stops pass their alpha here.
 */
function alphaOf(stop: GradientStop): number {
  const argb = processColor(stop.color);
  return typeof argb === 'number'
    ? Math.floor(unsigned(argb) / 2 ** 24) / 255
    : 1;
}

/** processColor may return ARGB as a signed 32-bit int. */
function unsigned(n: number): number {
  return n < 0 ? n + 2 ** 32 : n;
}
