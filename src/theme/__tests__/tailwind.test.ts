import resolveConfig from 'tailwindcss/resolveConfig';
import { tokens } from '@/theme/tokens';

const tailwindConfig = require('../../../tailwind.config.js');

const theme = resolveConfig(tailwindConfig).theme as unknown as {
  colors: Record<string, string>;
  borderRadius: Record<string, string>;
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

  it('has a rounded-<n> class for each radius in the scale', () => {
    for (const r of tokens.radii.scale) {
      expect(theme.borderRadius[String(r)]).toBe(`${r}px`);
    }
    expect(theme.borderRadius.sheet).toBe('22px');
  });
});
