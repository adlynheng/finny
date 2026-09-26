/**
 * The design's CSS gradients as data. react-native-svg's <LinearGradient> and
 * <RadialGradient> take stops and geometry, not CSS strings.
 *
 * Conventions:
 * - `angle` is the CSS angle in degrees (0 = to top, 90 = to right, 180 = to
 *   bottom), so the design's values can be read off directly.
 * - Radial `cx`/`cy`/`rx`/`ry` are fractions of the box (CSS percentages / 100).
 *   A `circle` with no radius uses CSS's default size, farthest-corner.
 * - Stop `offset` is 0–1. Stop colours keep the design's own notation.
 * - `layers` paint bottom first.
 */

export type GradientStop = { color: string; offset: number };

export type LinearGradientSpec = {
  kind: 'linear';
  angle: number;
  stops: GradientStop[];
};

export type RadialGradientSpec =
  | {
      kind: 'radial';
      shape: 'ellipse';
      rx: number;
      ry: number;
      cx: number;
      cy: number;
      stops: GradientStop[];
    }
  | {
      kind: 'radial';
      shape: 'circle';
      cx: number;
      cy: number;
      stops: GradientStop[];
      /** Gaussian blur applied to the whole glow, in points. */
      blur?: number;
    };

export type LayeredGradientSpec = {
  kind: 'layers';
  layers: (LinearGradientSpec | RadialGradientSpec)[];
};

export type GradientSpec =
  | LinearGradientSpec
  | RadialGradientSpec
  | LayeredGradientSpec;

const thisMonth: LinearGradientSpec = {
  kind: 'linear',
  angle: 128,
  stops: [
    { color: '#a45f37', offset: 0 },
    { color: '#a87a55', offset: 0.38 },
    { color: '#8f8a57', offset: 0.7 },
    { color: '#737a3f', offset: 1 },
  ],
};

const goalsStops = (second: number): GradientStop[] => [
  { color: '#b3a268', offset: 0 },
  { color: '#dd8a66', offset: second },
  { color: '#b8998a', offset: 0.58 },
  { color: '#6e8397', offset: 1 },
];

const heroGlowStops: GradientStop[] = [
  { color: 'rgba(216,242,58,.45)', offset: 0 },
  { color: 'rgba(126,176,108,.35)', offset: 0.32 },
  { color: 'rgba(233,168,86,.28)', offset: 0.58 },
  { color: 'rgba(239,239,236,0)', offset: 0.72 },
];

export const gradients = {
  /** Overview "Net worth history" card. */
  netWorthHistory: {
    kind: 'linear',
    angle: 180,
    stops: [
      { color: '#215f00', offset: 0 },
      { color: '#e4e4d9', offset: 1 },
    ],
  },
  /** "This month" card. */
  thisMonth,
  /** "Upcoming payments" card: the same gradient as "This month". */
  upcomingPayments: thisMonth,
  /** "Share of assets" card: a gold radial glow over a linear base. */
  shareOfAssets: {
    kind: 'layers',
    layers: [
      {
        kind: 'linear',
        angle: 170,
        stops: [
          { color: '#bfb5aa', offset: 0 },
          { color: '#d9a765', offset: 0.45 },
          { color: '#e0b94a', offset: 1 },
        ],
      },
      {
        kind: 'radial',
        shape: 'ellipse',
        rx: 1.2,
        ry: 0.9,
        cx: 0.2,
        cy: 1,
        stops: [
          { color: '#e6c43a', offset: 0 },
          { color: 'rgba(230,196,58,0)', offset: 0.6 },
        ],
      },
    ],
  },
  /** "Savings goals" card. */
  goals: { kind: 'linear', angle: 180, stops: goalsStops(0.28) },
  /** Finance "Recurring charges" and Planner "Fixed commitments": goals with the second stop at 26%. */
  commitments: { kind: 'linear', angle: 180, stops: goalsStops(0.26) },
  /** Trading "Portfolio health" card. */
  portfolioHealth: {
    kind: 'linear',
    angle: 160,
    stops: [
      { color: '#415d72', offset: 0 },
      { color: '#5f778b', offset: 0.4 },
      { color: '#8a8a8e', offset: 0.74 },
      { color: '#ad9f8c', offset: 1 },
    ],
  },
  /** Glow behind the net worth hero. */
  heroGlow: {
    kind: 'radial',
    shape: 'circle',
    cx: 0.42,
    cy: 0.4,
    stops: heroGlowStops,
    blur: 34,
  },
  /** Glow behind the dial heroes. */
  heroGlowDial: {
    kind: 'radial',
    shape: 'circle',
    cx: 0.44,
    cy: 0.42,
    stops: heroGlowStops,
    blur: 28,
  },
} satisfies Record<string, GradientSpec>;

export type CardThemeName =
  | 'Green'
  | 'Bronze'
  | 'Slate'
  | 'Mist'
  | 'Lagoon'
  | 'Dusk';

export type CardTheme = {
  gradient: LinearGradientSpec;
  /** Text colour on the card face. */
  ink: string;
};

const white = '#fff';
const ink = '#1c1c1a';

/** Card faces, keyed by `card.color_theme`. */
export const cardThemes: Record<CardThemeName, CardTheme> = {
  Green: {
    gradient: {
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#1f2a22', offset: 0 },
        { color: '#2f6a39', offset: 0.5 },
        { color: '#8fb883', offset: 1 },
      ],
    },
    ink: white,
  },
  Bronze: {
    gradient: {
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#5d5424', offset: 0 },
        { color: '#a9805a', offset: 0.55 },
        { color: '#dd8a66', offset: 1 },
      ],
    },
    ink: white,
  },
  Slate: {
    gradient: {
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#4b5d6e', offset: 0 },
        { color: '#8a8a8f', offset: 0.5 },
        { color: '#d9a765', offset: 1 },
      ],
    },
    ink: white,
  },
  Mist: {
    gradient: {
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#f5f7fa', offset: 0 },
        { color: '#c3cfe2', offset: 1 },
      ],
    },
    ink,
  },
  Lagoon: {
    gradient: {
      kind: 'linear',
      angle: 60,
      stops: [
        { color: '#64b3f4', offset: 0 },
        { color: '#c2e59c', offset: 1 },
      ],
    },
    ink,
  },
  Dusk: {
    gradient: {
      kind: 'linear',
      angle: 0,
      stops: [
        { color: '#ebbba7', offset: 0 },
        { color: '#cfc7f8', offset: 1 },
      ],
    },
    ink,
  },
};
