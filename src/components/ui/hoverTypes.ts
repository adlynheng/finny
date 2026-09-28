/** The pointer inside a HoverSurface, in points from its top-left, with its size. */
export type HoverPoint = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HoverSurfaceProps = {
  /** The pointer's position as it moves; null when it leaves. */
  onHover: (point: HoverPoint | null) => void;
  className?: string;
  testID?: string;
};
