/**
 * Design tokens: the single source of truth for every visual constant, copied
 * from the build plan's "Global constraints → Design tokens" block.
 *
 * tailwind.config.js imports this file, so class names and the JS values used
 * by SVG props and Reanimated cannot drift apart. Keep it free of React Native
 * imports: Tailwind loads it in Node.
 */

import { cardThemes, gradients } from './gradients';

export type GlassRecipe = {
  background: string;
  border: { width: number; color: string } | null;
  /** Blur radius in points, or null for no backdrop blur. */
  blur: number | null;
  /** CSS box-shadow string, usable as React Native's `boxShadow` style. */
  shadow: string | null;
  variants?: { background?: string[]; borderColor?: string[] };
};

export type MotionKeyframes = Record<string, number>;

export type MotionToken = {
  durationMs: number;
  /** CSS timing function, as written in the design. */
  easing: 'linear' | 'ease-in-out' | `cubic-bezier(${string})`;
  iterations: number | 'infinite';
  direction: 'normal' | 'alternate';
  /**
   * Delay added per element index. Negative means each element starts that
   * far into the cycle, as the design's negative CSS delays do.
   */
  staggerMs: number;
  from: MotionKeyframes;
  to: MotionKeyframes;
};

const colors = {
  ink: '#1c1c1a',
  inkHover: '#3a3a36',
  lime: '#d8f23a',
  limeDark: '#c9e32a',
  canvas: '#efefec',
  canvasAlt: '#e3e2de',
  muted: '#6b6a65',
  muted2: '#8a8984',
  danger: '#b4532f',
  white: '#fff',
} as const;

const glass = {
  chip: {
    background: 'rgba(255,255,255,.55)',
    border: { width: 1, color: 'rgba(255,255,255,.8)' },
    blur: 18,
    shadow: null,
  },
  navPill: {
    background: 'rgba(255,255,255,.5)',
    border: { width: 1, color: 'rgba(255,255,255,.8)' },
    blur: 18,
    shadow: '0 1px 2px rgba(0,0,0,.04), 0 6px 20px rgba(0,0,0,.04)',
  },
  card: {
    background: 'rgba(255,255,255,.62)',
    border: { width: 1, color: 'rgba(255,255,255,.85)' },
    blur: 20,
    shadow: '0 1px 2px rgba(0,0,0,.03)',
  },
  onGradient: {
    background: 'rgba(255,255,255,.10)',
    border: { width: 1, color: 'rgba(255,255,255,.18)' },
    blur: 12,
    shadow: null,
    variants: {
      background: ['rgba(255,255,255,.12)', 'rgba(255,255,255,.14)'],
      borderColor: ['rgba(255,255,255,.2)'],
    },
  },
  modal: {
    background: 'rgba(255,255,255,.88)',
    border: { width: 1, color: '#fff' },
    blur: null,
    shadow: '0 30px 80px rgba(0,0,0,.14)',
    // Trading and Settings modals.
    variants: { background: ['rgba(255,255,255,.9)'] },
  },
  modalScrim: {
    background: 'rgba(239,239,236,.5)',
    border: null,
    blur: 8,
    shadow: null,
  },
  sheet: {
    background: '#f7f7f4',
    border: null,
    blur: null,
    shadow: '0 -20px 60px rgba(0,0,0,.16)',
  },
  sheetScrim: {
    background: 'rgba(28,28,26,.22)',
    border: null,
    blur: 6,
    shadow: null,
  },
  popover: {
    background: '#fff',
    border: { width: 1, color: 'rgba(28,28,26,.08)' },
    blur: null,
    shadow: '0 18px 44px rgba(0,0,0,.14)',
  },
} satisfies Record<string, GlassRecipe>;

/**
 * The small controls' treatments, from the design's markup (the forms in
 * FinnyOverview/Finance/Planner/Trading/Settings2 and FinnyMobile).
 */
const controls = {
  segmented: {
    /** Form fields and Trading's mode switch. */
    tray: 'rgba(28,28,26,.05)',
    /** The in-card switches: List/Categories, the transaction filter, Positions tabs. */
    traySoft: 'rgba(28,28,26,.04)',
    selectedShadow: '0 1px 2px rgba(0,0,0,.08)',
    /** The selected pill's slide to a newly chosen segment (not in the design). */
    slideMs: 200,
  },
  /** Ghost buttons' hover. */
  ghostHover: 'rgba(28,28,26,.05)',
  /** The close button's hover. */
  iconHover: 'rgba(28,28,26,.06)',
  /** Soft buttons: a panel action, the mobile Cancel. */
  soft: 'rgba(28,28,26,.05)',
  softHover: 'rgba(28,28,26,.1)',
  dangerHover: 'rgba(180,83,47,.08)',
  /** Outline buttons (Trading's Sell). */
  outlineBorder: 'rgba(28,28,26,.18)',
  chipBorder: 'rgba(28,28,26,.08)',
  input: {
    border: 'rgba(28,28,26,.1)',
    /** A field whose picker is open, e.g. the date field. */
    openBorder: 'rgba(28,28,26,.45)',
    height: 40,
    /** Mobile. */
    touchHeight: 44,
  },
  /** A chip that cannot be chosen, e.g. the transfer source in the destination row. */
  dimmedOpacity: 0.35,
  /** A disabled action, e.g. Save before the form is valid. */
  disabledOpacity: 0.35,
  toggle: {
    width: 34,
    height: 20,
    knob: 16,
    offColor: 'rgba(28,28,26,.14)',
    knobShadow: '0 1px 2px rgba(0,0,0,.2)',
    durationMs: 200,
  },
} as const;

/**
 * The date picker's month grid: a popover above the date field on desktop,
 * inline in the sheet on mobile.
 */
const calendar = {
  popover: {
    width: 300,
    /** Between the popover and the field it opens above. */
    offset: 8,
    border: 'rgba(28,28,26,.08)',
    shadow: '0 18px 44px rgba(0,0,0,.14)',
  },
  /** The prev/next pair's tray. */
  navTray: 'rgba(28,28,26,.04)',
  tile: {
    height: 32,
    /** Mobile. */
    touchHeight: 38,
    fill: 'rgba(28,28,26,.04)',
    todayBorder: 'rgba(28,28,26,.6)',
    hoverBorder: 'rgba(28,28,26,.35)',
  },
} as const;

/** The Positions and Watchlist tables. */
const table = {
  /** Between columns. */
  columnGap: 10,
  paddingX: 8,
  rowHeight: 44,
  /** An expanded row's lots and sales. */
  subRowHeight: 38,
  rowBorder: 'rgba(28,28,26,.06)',
  totalsBorder: 'rgba(28,28,26,.12)',
  rowHover: 'rgba(28,28,26,.03)',
  /** The row whose symbol the chart is showing. */
  rowSelected: 'rgba(28,28,26,.045)',
  /** Behind an expanded row's sub-rows. */
  subArea: 'rgba(28,28,26,.022)',
  /** The vertical line down the sub-rows' first column. */
  connector: 'rgba(28,28,26,.14)',
  chevron: { box: 20, tray: 'rgba(28,28,26,.04)' },
  /** An expandable row's chevron turn. */
  expandMs: 200,
} as const;

/**
 * The Overview's net-worth sphere: strokes as opacities of ink, so each can
 * transition as a number. `rest` is nothing hovered, `hot` the hovered class,
 * `dim` every other class.
 */
const sphere = {
  reference: { opacity: 0.35, width: 0.8, dash: '2 4', labelSize: 9 },
  meridian: { opacity: 0.32, dimOpacity: 0.16, width: 0.7 },
  latitude: {
    rest: { opacity: 0.42, width: 0.8 },
    hot: { opacity: 0.9, width: 1.1 },
    dim: { opacity: 0.13, width: 0.7 },
    transitionMs: 300,
  },
  pole: { radius: 5, pulseRadius: 9, pulseRestOpacity: 0.3 },
  outerRing: { opacity: 0.1, width: 0.7 },
  spinRing: { opacity: 0.25, width: 0.6, dash: '1 5' },
  tick: {
    centre: { opacity: 0.55, hotOpacity: 0.95, width: 0.9, hotWidth: 1.2 },
    side: { opacity: 0.2, hotOpacity: 0.35, width: 0.6 },
    /** Other classes' ticks, as a multiplier. */
    dim: 0.35,
    transitionMs: 250,
  },
  bead: { radius: 2.2, opacity: 0.5 },
  /** Other classes' value labels. */
  valueDimOpacity: 0.45,
} as const;

/** The form containers: a centred modal on desktop, a bottom sheet on mobile. */
const dialog = {
  desktop: {
    // standard: transaction and goal forms; narrow: recurring-charge and sell
    // forms; wide: the new-position form.
    widths: { standard: 520, narrow: 500, wide: 540 },
    radius: 14,
    padding: 26,
    /** Between fields. */
    gap: 18,
  },
  mobile: {
    maxHeight: '92%',
    padding: 20,
    gap: 16,
    handle: 'rgba(28,28,26,.18)',
    /** The footer's touch targets. */
    actionHeight: 48,
  },
} as const;

const fnSpin: MotionToken = {
  durationMs: 120000,
  easing: 'linear',
  iterations: 'infinite',
  direction: 'normal',
  staggerMs: 0,
  from: { rotateDeg: 0 },
  to: { rotateDeg: 360 },
};

const fnGrow: MotionToken = {
  durationMs: 900,
  easing: 'cubic-bezier(.2,.7,.2,1)',
  iterations: 1,
  direction: 'normal',
  staggerMs: 12,
  from: { scale: 0.6, opacity: 0 },
  to: { scale: 1, opacity: 1 },
};

const reveal = {
  easing: 'cubic-bezier(.2,.7,.2,1)',
  iterations: 1,
  direction: 'normal',
  staggerMs: 0,
  // clip-path: inset(0 <clipRight> 0 0), as a fraction of the width.
  from: { clipRight: 1 },
  to: { clipRight: 0 },
} as const;

const motion = {
  // Per-meridian delay -(i/10)·14s: each meridian a tenth of a cycle ahead.
  fnMeridian: {
    durationMs: 14000,
    easing: 'ease-in-out',
    iterations: 'infinite',
    direction: 'alternate',
    staggerMs: -1400,
    from: { scaleX: 1 },
    to: { scaleX: -1 },
  },
  fnSpin,
  fnSpinPortfolioHealth: { ...fnSpin, durationMs: 90000 },
  fnPulse: {
    durationMs: 2800,
    easing: 'ease-in-out',
    iterations: 'infinite',
    direction: 'normal',
    staggerMs: 0,
    from: { scale: 1, opacity: 0.35 },
    to: { scale: 1.7, opacity: 0 },
  },
  fnGrow,
  fnGrowBudgetDial: { ...fnGrow, staggerMs: 25 },
  fnReveal: { ...reveal, durationMs: 1400 },
  trReveal: { ...reveal, durationMs: 1100 },
} satisfies Record<string, MotionToken>;

export const tokens = {
  colors,
  backdrop: {
    // radial-gradient(rgba(28,28,26,.07) 1px, transparent 1.3px) at 14×14, non-interactive.
    dotGrid: {
      color: 'rgba(28,28,26,.07)',
      dotRadius: 1,
      fadeRadius: 1.3,
      spacing: 14,
    },
  },
  frame: {
    desktop: {
      width: 1512,
      height: 982,
      headerHeight: 76,
      headerPaddingX: 32,
      headerGap: 22,
      contentPadding: { top: 12, x: 32, bottom: 32 },
      gap: 14,
    },
    mobile: {
      width: 390,
      height: 844,
      statusBarHeight: 56,
      headerHeight: 56,
      contentPadding: { top: 4, x: 16, bottom: 112 },
      gap: 12,
      bottomBar: { insetX: 12, bottom: 28, tabHeight: 54, fabSize: 52 },
    },
  },
  type: {
    family: 'Urbanist',
    weights: { light: 300, regular: 400, medium: 500, semibold: 600 },
    /** Large numerals. */
    numeral: { fontWeight: 300, letterSpacingEm: -0.035 },
    h1: { fontSize: 40, fontWeight: 400, letterSpacingEm: -0.02 },
    h1Mobile: { fontSize: 32, fontWeight: 400, letterSpacingEm: -0.02 },
    cardTitle: { fontSize: 13 },
    subtitle: { minFontSize: 11, maxFontSize: 12 },
    /** All numeric columns. */
    numericVariant: 'tabular-nums',
  },
  radii: {
    scale: [4, 5, 6, 7, 8, 9, 10, 12, 14],
    /** Mobile sheet: top corners only (22 22 0 0). */
    sheetTop: 22,
    phoneBezel: 62,
    phoneScreen: 52,
    mobileBottomPill: 20,
    mobileBottomTab: 15,
  },
  /** The chrome shared by gradient cards and plain glass cards. */
  card: {
    radius: { desktop: 6, mobile: 8 },
    padding: 18,
  },
  glass,
  controls,
  calendar,
  table,
  sphere,
  dialog,
  gradients,
  cardThemes,
  motion,
} as const;

export type ColorName = keyof typeof colors;
export type GlassName = keyof typeof glass;
export type DialogWidth = keyof typeof dialog.desktop.widths;
export type MotionName = keyof typeof motion;
