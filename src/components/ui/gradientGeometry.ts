/**
 * The design's CSS gradients (src/theme/gradients.ts) as SVG gradient geometry
 * in points, for a box of a known size.
 */

import type { RadialGradientSpec } from '@/theme/gradients';

export type GradientLine = { x1: number; y1: number; x2: number; y2: number };

export type RadialShape = { cx: number; cy: number; rx: number; ry: number };

/**
 * A CSS `linear-gradient(<angle>deg, …)` line across a `width`×`height` box.
 * CSS measures the angle clockwise from "to top", centres the line on the box,
 * and sizes it so the 0% and 100% stops pass through the corners.
 */
export function linearGradientLine(
  angle: number,
  width: number,
  height: number,
): GradientLine {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return {
    x1: cx - dx * half,
    y1: cy - dy * half,
    x2: cx + dx * half,
    y2: cy + dy * half,
  };
}

/**
 * A CSS radial gradient's centre and radii in a `width`×`height` box. An
 * ellipse's radii are fractions of the box; a circle with no size reaches the
 * farthest corner, as CSS's default `farthest-corner` does.
 */
export function radialGradientShape(
  spec: RadialGradientSpec,
  width: number,
  height: number,
): RadialShape {
  const cx = spec.cx * width;
  const cy = spec.cy * height;
  if (spec.shape === 'ellipse') {
    return { cx, cy, rx: spec.rx * width, ry: spec.ry * height };
  }
  const r = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
  return { cx, cy, rx: r, ry: r };
}
