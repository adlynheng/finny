import resolveConfig from 'tailwindcss/resolveConfig';
import { tokens } from '@/theme/tokens';

declare const process: { env: Record<string, string | undefined> };

// Resolve the native NativeWind preset, as Metro does; without this the preset
// falls back to its web variant, which does not override font-sans.
process.env.NATIVEWIND_OS = 'ios';
const tailwindConfig = require('../../../tailwind.config.js');

const theme = resolveConfig(tailwindConfig).theme as unknown as {
  colors: Record<string, string>;
  borderRadius: Record<string, string>;
  fontFamily: Record<string, string[]>;
  spacing: Record<string, string>;
};

describe('tailwind theme', () => {
  it('takes every colour from the tokens, with kebab-case names', () => {
    expect(theme.colors.ink).toBe(tokens.colors.ink);
    expect(theme.colors['ink-hover']).toBe(tokens.colors.inkHover);
    expect(theme.colors.lime).toBe(tokens.colors.lime);
    expect(theme.colors['lime-dark']).toBe(tokens.colors.limeDark);
    expect(theme.colors.canvas).toBe(tokens.colors.canvas);
    expect(theme.colors['canvas-alt']).toBe(tokens.colors.canvasAlt);
    expect(theme.colors.muted).toBe(tokens.colors.muted);
    expect(theme.colors['muted-2']).toBe(tokens.colors.muted2);
    expect(theme.colors.danger).toBe(tokens.colors.danger);
    expect(theme.colors.white).toBe(tokens.colors.white);
  });

  it('names each glass recipe fill and border colour', () => {
    // bg-glass-nav-pill, border-glass-nav-pill-border ...
    const kebab = (name: string) =>
      name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
    for (const [name, recipe] of Object.entries(tokens.glass)) {
      const key = `glass-${kebab(name)}`;
      expect(theme.colors[key]).toBe(recipe.background);
      expect(theme.colors[`${key}-border`]).toBe(recipe.border?.color);
    }
    expect(theme.colors['glass-card']).toBe('rgba(255,255,255,.62)');
  });

  it('names the card padding', () => {
    expect(theme.spacing.card).toBe(`${tokens.card.padding}px`);
  });

  it('has a rounded-<n> class for each radius in the scale', () => {
    for (const r of tokens.radii.scale) {
      expect(theme.borderRadius[String(r)]).toBe(`${r}px`);
    }
    expect(theme.borderRadius.sheet).toBe('22px');
  });

  it('uses Urbanist as the sans family', () => {
    expect(theme.fontFamily.sans).toEqual([tokens.type.family]);
  });

  it('names the desktop frame geometry, so layouts use tokens not [76px]', () => {
    const { desktop } = tokens.frame;
    expect(theme.spacing['frame-header']).toBe(`${desktop.headerHeight}px`);
    expect(theme.spacing['frame-header-x']).toBe(`${desktop.headerPaddingX}px`);
    expect(theme.spacing['frame-header-gap']).toBe(`${desktop.headerGap}px`);
    expect(theme.spacing['frame-top']).toBe(`${desktop.contentPadding.top}px`);
    expect(theme.spacing['frame-x']).toBe(`${desktop.contentPadding.x}px`);
    expect(theme.spacing['frame-bottom']).toBe(
      `${desktop.contentPadding.bottom}px`,
    );
    expect(theme.spacing['frame-gap']).toBe(`${desktop.gap}px`);
  });
});
