/**
 * Every expected value here is copied by hand from the build plan's
 * "Global constraints → Design tokens" block. If a test fails, check the
 * plan before changing the expectation.
 */
import { tokens } from '@/theme/tokens';
import { gradients, cardThemes } from '@/theme/gradients';
import { motion } from '@/theme/motion';

describe('colours', () => {
  it('match the palette', () => {
    expect(tokens.colors).toEqual({
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
    });
  });
});

describe('dot-grid backdrop', () => {
  it('is a 14px grid of 1px dots at 7% ink', () => {
    expect(tokens.backdrop.dotGrid).toEqual({
      color: 'rgba(28,28,26,.07)',
      dotRadius: 1,
      fadeRadius: 1.3,
      spacing: 14,
    });
  });
});

describe('frame geometry', () => {
  it('desktop: 76px header, 12/32/32 content padding, 14 gap', () => {
    expect(tokens.frame.desktop).toEqual({
      width: 1512,
      height: 982,
      headerHeight: 76,
      headerPaddingX: 32,
      headerGap: 22,
      contentPadding: { top: 12, x: 32, bottom: 32 },
      gap: 14,
      markShadow: '0 1px 2px rgba(0,0,0,.05)',
    });
  });

  it('mobile: 56+56 chrome, 4/16/112 scroll padding, 12 gap, floating bar', () => {
    expect(tokens.frame.mobile).toEqual({
      width: 390,
      height: 844,
      statusBarHeight: 56,
      headerHeight: 56,
      contentPadding: { top: 4, x: 16, bottom: 112 },
      gap: 12,
      bottomBar: { insetX: 12, bottom: 28, tabHeight: 54, fabSize: 52 },
    });
  });
});

describe('type', () => {
  it('uses Urbanist at 300/400/500/600', () => {
    expect(tokens.type.family).toBe('Urbanist');
    expect(tokens.type.weights).toEqual({
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
    });
  });

  it('has the scale', () => {
    expect(tokens.type.numeral).toEqual({
      fontWeight: 300,
      letterSpacingEm: -0.035,
    });
    expect(tokens.type.h1).toEqual({
      fontSize: 40,
      fontWeight: 400,
      letterSpacingEm: -0.02,
    });
    expect(tokens.type.h1Mobile).toEqual({
      fontSize: 32,
      fontWeight: 400,
      letterSpacingEm: -0.02,
    });
    expect(tokens.type.cardTitle).toEqual({ fontSize: 13 });
    expect(tokens.type.subtitle).toEqual({ minFontSize: 11, maxFontSize: 12 });
    expect(tokens.type.numericVariant).toBe('tabular-nums');
  });
});

describe('radii', () => {
  it('has the nine-step scale', () => {
    expect(tokens.radii.scale).toEqual([4, 5, 6, 7, 8, 9, 10, 12, 14]);
  });

  it('has the named radii', () => {
    expect(tokens.radii.sheetTop).toBe(22);
    expect(tokens.radii.phoneBezel).toBe(62);
    expect(tokens.radii.phoneScreen).toBe(52);
    expect(tokens.radii.mobileBottomPill).toBe(20);
    expect(tokens.radii.mobileBottomTab).toBe(15);
  });
});

describe('glass recipes', () => {
  it('has exactly the ten recipes', () => {
    expect(Object.keys(tokens.glass).sort()).toEqual(
      [
        'card',
        'chip',
        'modal',
        'modalScrim',
        'navPill',
        'onGradient',
        'popover',
        'sheet',
        'sheetScrim',
        'tooltip',
      ].sort(),
    );
  });

  it('matches each recipe', () => {
    expect(tokens.glass.chip).toEqual({
      background: 'rgba(255,255,255,.55)',
      border: { width: 1, color: 'rgba(255,255,255,.8)' },
      blur: 18,
      shadow: null,
    });
    expect(tokens.glass.navPill).toEqual({
      background: 'rgba(255,255,255,.5)',
      border: { width: 1, color: 'rgba(255,255,255,.8)' },
      blur: 18,
      shadow: '0 1px 2px rgba(0,0,0,.04), 0 6px 20px rgba(0,0,0,.04)',
    });
    expect(tokens.glass.card).toEqual({
      background: 'rgba(255,255,255,.62)',
      border: { width: 1, color: 'rgba(255,255,255,.85)' },
      blur: 20,
      shadow: '0 1px 2px rgba(0,0,0,.03)',
    });
    expect(tokens.glass.onGradient).toEqual({
      background: 'rgba(255,255,255,.10)',
      border: { width: 1, color: 'rgba(255,255,255,.18)' },
      blur: 12,
      shadow: null,
      variants: {
        background: ['rgba(255,255,255,.12)', 'rgba(255,255,255,.14)'],
        borderColor: ['rgba(255,255,255,.2)'],
      },
    });
    expect(tokens.glass.modal).toEqual({
      background: 'rgba(255,255,255,.88)',
      border: { width: 1, color: '#fff' },
      blur: null,
      shadow: '0 30px 80px rgba(0,0,0,.14)',
      variants: { background: ['rgba(255,255,255,.9)'] },
    });
    expect(tokens.glass.modalScrim).toEqual({
      background: 'rgba(239,239,236,.5)',
      border: null,
      blur: 8,
      shadow: null,
    });
    expect(tokens.glass.sheet).toEqual({
      background: '#f7f7f4',
      border: null,
      blur: null,
      shadow: '0 -20px 60px rgba(0,0,0,.16)',
    });
    expect(tokens.glass.sheetScrim).toEqual({
      background: 'rgba(28,28,26,.22)',
      border: null,
      blur: 6,
      shadow: null,
    });
    expect(tokens.glass.popover).toEqual({
      background: '#fff',
      border: { width: 1, color: 'rgba(28,28,26,.08)' },
      blur: null,
      shadow: '0 18px 44px rgba(0,0,0,.14)',
    });
    expect(tokens.glass.tooltip).toEqual({
      background: 'rgba(255,255,255,.2)',
      border: { width: 1, color: 'rgba(255,255,255,.3)' },
      blur: 14,
      shadow: null,
    });
  });
});

describe('card chrome', () => {
  it('is 6px on desktop and 8px on mobile, with 18px padding', () => {
    expect(tokens.card).toEqual({
      radius: { desktop: 6, mobile: 8 },
      padding: 18,
    });
  });
});

describe('controls', () => {
  // Read off the design's form markup.
  it('toggle: 34×20 pill, 16px shadowed knob, 14% ink when off', () => {
    expect(tokens.controls.toggle).toEqual({
      width: 34,
      height: 20,
      knob: 16,
      offColor: 'rgba(28,28,26,.14)',
      knobShadow: '0 1px 2px rgba(0,0,0,.2)',
      durationMs: 200,
    });
  });

  it('button washes and borders', () => {
    const c = tokens.controls;
    expect(c.ghostHover).toBe('rgba(28,28,26,.05)');
    expect(c.iconHover).toBe('rgba(28,28,26,.06)');
    expect(c.soft).toBe('rgba(28,28,26,.05)');
    expect(c.softHover).toBe('rgba(28,28,26,.1)');
    expect(c.dangerHover).toBe('rgba(180,83,47,.08)');
    expect(c.outlineBorder).toBe('rgba(28,28,26,.18)');
  });

  it('chips and inputs are outlined', () => {
    expect(tokens.controls.chipBorder).toBe('rgba(28,28,26,.08)');
    expect(tokens.controls.input).toEqual({
      border: 'rgba(28,28,26,.1)',
      openBorder: 'rgba(28,28,26,.45)',
      height: 40,
      touchHeight: 44,
    });
  });

  it('segmented: 5% ink tray (4% in cards), the selected pill softly shadowed', () => {
    expect(tokens.controls.segmented).toEqual({
      tray: 'rgba(28,28,26,.05)',
      traySoft: 'rgba(28,28,26,.04)',
      selectedShadow: '0 1px 2px rgba(0,0,0,.08)',
      navShadow: '0 1px 3px rgba(0,0,0,.08)',
      slideMs: 200,
    });
  });

  it('dims an unchoosable chip and a disabled action to 35%', () => {
    expect(tokens.controls.dimmedOpacity).toBe(0.35);
    expect(tokens.controls.disabledOpacity).toBe(0.35);
  });
});

describe('calendar', () => {
  it('desktop popover: 300 wide, 8 above the field, hairline border, deep shadow', () => {
    expect(tokens.calendar.popover).toEqual({
      width: 300,
      offset: 8,
      border: 'rgba(28,28,26,.08)',
      shadow: '0 18px 44px rgba(0,0,0,.14)',
    });
    expect(tokens.calendar.navTray).toBe('rgba(28,28,26,.04)');
  });

  it('tiles: 32px (38 on mobile), a 4% wash, today outlined at 60%', () => {
    expect(tokens.calendar.tile).toEqual({
      height: 32,
      touchHeight: 38,
      fill: 'rgba(28,28,26,.04)',
      todayBorder: 'rgba(28,28,26,.6)',
      hoverBorder: 'rgba(28,28,26,.35)',
    });
  });
});

describe('tables', () => {
  it('rows: 44px (38 for sub-rows), 10px between columns, 8px in from the edge', () => {
    const t = tokens.table;
    expect([t.rowHeight, t.subRowHeight, t.columnGap, t.paddingX]).toEqual([
      44, 38, 10, 8,
    ]);
  });

  it('washes: 3% on hover, 4.5% selected, 2.2% behind sub-rows', () => {
    const t = tokens.table;
    expect(t.rowHover).toBe('rgba(28,28,26,.03)');
    expect(t.rowSelected).toBe('rgba(28,28,26,.045)');
    expect(t.subArea).toBe('rgba(28,28,26,.022)');
  });

  it('lines: 6% between rows, 12% above totals, a 14% connector', () => {
    const t = tokens.table;
    expect(t.rowBorder).toBe('rgba(28,28,26,.06)');
    expect(t.totalsBorder).toBe('rgba(28,28,26,.12)');
    expect(t.connector).toBe('rgba(28,28,26,.14)');
  });

  it('chevron: a 20px tray', () => {
    expect(tokens.table.chevron).toEqual({
      box: 20,
      tray: 'rgba(28,28,26,.04)',
    });
  });

  it('expanding turns the chevron in 200ms', () => {
    expect(tokens.table.expandMs).toBe(200);
  });
});

describe('dialogs', () => {
  it('desktop modal: 520/500/540 wide, 14 radius, 26 padding, 18 between fields', () => {
    expect(tokens.dialog.desktop).toEqual({
      // Transaction and goal forms; recurring-charge and sell; new position.
      widths: { standard: 520, narrow: 500, wide: 540 },
      radius: 14,
      padding: 26,
      gap: 18,
    });
  });

  it('mobile sheet: 92% max height, 20 padding, 16 between fields, 48px actions', () => {
    expect(tokens.dialog.mobile).toEqual({
      maxHeight: '92%',
      padding: 20,
      gap: 16,
      handle: 'rgba(28,28,26,.18)',
      actionHeight: 48,
    });
  });
});

describe('gradient cards', () => {
  it('netWorthHistory runs top to bottom', () => {
    expect(gradients.netWorthHistory).toEqual({
      kind: 'linear',
      angle: 180,
      stops: [
        { color: '#215f00', offset: 0 },
        { color: '#e4e4d9', offset: 1 },
      ],
    });
  });

  it('thisMonth and upcomingPayments share one gradient', () => {
    expect(gradients.thisMonth).toEqual({
      kind: 'linear',
      angle: 128,
      stops: [
        { color: '#a45f37', offset: 0 },
        { color: '#a87a55', offset: 0.38 },
        { color: '#8f8a57', offset: 0.7 },
        { color: '#737a3f', offset: 1 },
      ],
    });
    expect(gradients.upcomingPayments).toBe(gradients.thisMonth);
  });

  it('shareOfAssets is a radial glow over a linear base', () => {
    expect(gradients.shareOfAssets).toEqual({
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
    });
  });

  it('goals, and the 26% variant used by Recurring charges and Fixed commitments', () => {
    const stops = (second: number) => [
      { color: '#b3a268', offset: 0 },
      { color: '#dd8a66', offset: second },
      { color: '#b8998a', offset: 0.58 },
      { color: '#6e8397', offset: 1 },
    ];
    expect(gradients.goals).toEqual({
      kind: 'linear',
      angle: 180,
      stops: stops(0.28),
    });
    expect(gradients.commitments).toEqual({
      kind: 'linear',
      angle: 180,
      stops: stops(0.26),
    });
  });

  it('portfolioHealth', () => {
    expect(gradients.portfolioHealth).toEqual({
      kind: 'linear',
      angle: 160,
      stops: [
        { color: '#415d72', offset: 0 },
        { color: '#5f778b', offset: 0.4 },
        { color: '#8a8a8e', offset: 0.74 },
        { color: '#ad9f8c', offset: 1 },
      ],
    });
  });

  it('heroGlow, and the dial-hero variant', () => {
    const stops = [
      { color: 'rgba(216,242,58,.45)', offset: 0 },
      { color: 'rgba(126,176,108,.35)', offset: 0.32 },
      { color: 'rgba(233,168,86,.28)', offset: 0.58 },
      { color: 'rgba(239,239,236,0)', offset: 0.72 },
    ];
    expect(gradients.heroGlow).toEqual({
      kind: 'radial',
      shape: 'circle',
      cx: 0.42,
      cy: 0.4,
      stops,
      blur: 34,
    });
    expect(gradients.heroGlowDial).toEqual({
      kind: 'radial',
      shape: 'circle',
      cx: 0.44,
      cy: 0.42,
      stops,
      blur: 28,
    });
  });

  it('tokens expose the same gradient objects', () => {
    expect(tokens.gradients).toBe(gradients);
    expect(tokens.cardThemes).toBe(cardThemes);
  });
});

describe('card face themes', () => {
  it('has the six themes with their ink colour', () => {
    expect(cardThemes).toEqual({
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
        ink: '#fff',
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
        ink: '#fff',
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
        ink: '#fff',
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
        ink: '#1c1c1a',
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
        ink: '#1c1c1a',
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
        ink: '#1c1c1a',
      },
    });
  });
});

describe('motion', () => {
  const standard = [0.2, 0.7, 0.2, 1];
  const easeInOut = [0.42, 0, 0.58, 1];

  it('fnMeridian: 14s ease-in-out, infinite, alternating, each meridian a tenth of a cycle ahead', () => {
    expect(motion.fnMeridian).toEqual({
      durationMs: 14000,
      easing: easeInOut,
      repeat: -1,
      reverse: true,
      staggerMs: -1400,
      from: { scaleX: 1 },
      to: { scaleX: -1 },
    });
  });

  it('fnSpin: 120s linear, and 90s for the Portfolio-health outer ring', () => {
    expect(motion.fnSpin).toEqual({
      durationMs: 120000,
      easing: 'linear',
      repeat: -1,
      reverse: false,
      staggerMs: 0,
      from: { rotateDeg: 0 },
      to: { rotateDeg: 360 },
    });
    expect(motion.fnSpinPortfolioHealth).toEqual({
      ...motion.fnSpin,
      durationMs: 90000,
    });
  });

  it('fnPulse: 2.8s ease-in-out infinite', () => {
    expect(motion.fnPulse).toEqual({
      durationMs: 2800,
      easing: easeInOut,
      repeat: -1,
      reverse: false,
      staggerMs: 0,
      from: { scale: 1, opacity: 0.35 },
      to: { scale: 1.7, opacity: 0 },
    });
  });

  it('fnGrow: .9s once, 12ms stagger, 25ms on the budget dial', () => {
    expect(motion.fnGrow).toEqual({
      durationMs: 900,
      easing: standard,
      repeat: 1,
      reverse: false,
      staggerMs: 12,
      from: { scale: 0.6, opacity: 0 },
      to: { scale: 1, opacity: 1 },
    });
    expect(motion.fnGrowBudgetDial).toEqual({
      ...motion.fnGrow,
      staggerMs: 25,
    });
  });

  it('fnReveal 1.4s and trReveal 1.1s wipe left to right', () => {
    const reveal = {
      easing: standard,
      repeat: 1,
      reverse: false,
      staggerMs: 0,
      from: { clipRight: 1 },
      to: { clipRight: 0 },
    };
    expect(motion.fnReveal).toEqual({ ...reveal, durationMs: 1400 });
    expect(motion.trReveal).toEqual({ ...reveal, durationMs: 1100 });
  });

  it('is derived from the token keyframes, not a second copy', () => {
    expect(tokens.motion.fnMeridian.durationMs).toBe(
      motion.fnMeridian.durationMs,
    );
    expect(tokens.motion.fnGrow.easing).toBe('cubic-bezier(.2,.7,.2,1)');
    expect(tokens.motion.fnMeridian.direction).toBe('alternate');
  });
});
