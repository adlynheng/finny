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
  it('has exactly the nine recipes', () => {
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
