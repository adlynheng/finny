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
  opacity: Record<string, string>;
  maxHeight: Record<string, string>;
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

  it('names the control treatments', () => {
    const { controls } = tokens;
    expect(theme.colors['segment-tray']).toBe(controls.segmented.tray);
    expect(theme.colors['segment-tray-soft']).toBe(controls.segmented.traySoft);
    expect(theme.colors['ghost-hover']).toBe(controls.ghostHover);
    expect(theme.colors['icon-hover']).toBe(controls.iconHover);
    expect(theme.colors.soft).toBe(controls.soft);
    expect(theme.colors['soft-hover']).toBe(controls.softHover);
    expect(theme.colors['danger-hover']).toBe(controls.dangerHover);
    expect(theme.colors['outline-border']).toBe(controls.outlineBorder);
    expect(theme.colors['chip-border']).toBe(controls.chipBorder);
    expect(theme.colors['input-border']).toBe(controls.input.border);
    expect(theme.colors['toggle-off']).toBe(controls.toggle.offColor);
    expect(theme.colors['sheet-handle']).toBe(tokens.dialog.mobile.handle);
    expect(theme.spacing['toggle-w']).toBe('34px');
    expect(theme.spacing['toggle-h']).toBe('20px');
    expect(theme.spacing['toggle-knob']).toBe('16px');
    expect(theme.spacing.input).toBe('40px');
    expect(theme.spacing['input-touch']).toBe('44px');
    expect(theme.opacity.dimmed).toBe('0.35');
    expect(theme.opacity.disabled).toBe('0.35');
  });

  it('names the date picker colours and sizes', () => {
    const { calendar, controls } = tokens;
    expect(theme.colors['input-open-border']).toBe(controls.input.openBorder);
    expect(theme.colors['popover-border']).toBe(calendar.popover.border);
    expect(theme.colors['nav-tray']).toBe(calendar.navTray);
    expect(theme.colors.tile).toBe(calendar.tile.fill);
    expect(theme.colors['tile-today']).toBe(calendar.tile.todayBorder);
    expect(theme.colors['tile-hover']).toBe(calendar.tile.hoverBorder);
    expect(theme.spacing.popover).toBe('300px');
    expect(theme.spacing.tile).toBe('32px');
    expect(theme.spacing['tile-touch']).toBe('38px');
  });

  it('names the table colours and sizes', () => {
    const { table } = tokens;
    expect(theme.colors['row-border']).toBe(table.rowBorder);
    expect(theme.colors['totals-border']).toBe(table.totalsBorder);
    expect(theme.colors['row-hover']).toBe(table.rowHover);
    expect(theme.colors['row-selected']).toBe(table.rowSelected);
    expect(theme.colors['sub-area']).toBe(table.subArea);
    expect(theme.colors.connector).toBe(table.connector);
    expect(theme.colors['chevron-tray']).toBe(table.chevron.tray);
    expect(theme.spacing.col).toBe('10px');
    expect(theme.spacing['table-x']).toBe('8px');
    expect(theme.spacing.row).toBe('44px');
    expect(theme.spacing['sub-row']).toBe('38px');
    expect(theme.spacing.chevron).toBe('20px');
  });

  it('names the dialog geometry', () => {
    const { desktop, mobile } = tokens.dialog;
    expect(theme.spacing['dialog-standard']).toBe('520px');
    expect(theme.spacing['dialog-narrow']).toBe('500px');
    expect(theme.spacing['dialog-wide']).toBe('540px');
    expect(theme.spacing['dialog-pad']).toBe(`${desktop.padding}px`);
    expect(theme.spacing['dialog-gap']).toBe(`${desktop.gap}px`);
    expect(theme.spacing['sheet-pad']).toBe(`${mobile.padding}px`);
    expect(theme.spacing['sheet-gap']).toBe(`${mobile.gap}px`);
    expect(theme.spacing.action).toBe('48px');
    expect(theme.maxHeight.sheet).toBe('92%');
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
    expect(theme.spacing['finance-row']).toBe('300px');
    expect(theme.spacing['planner-row']).toBe('392px');
  });

  it('names the mobile frame and bar geometry', () => {
    const { mobile } = tokens.frame;
    expect(theme.spacing['mobile-header']).toBe('56px');
    expect(theme.spacing['mobile-x']).toBe('16px');
    expect(theme.spacing['mobile-top']).toBe('4px');
    expect(theme.spacing['mobile-bottom']).toBe('112px');
    expect(theme.spacing['bar-x']).toBe(`${mobile.bottomBar.insetX}px`);
    expect(theme.spacing['bar-bottom']).toBe('28px');
    expect(theme.spacing['bar-tab']).toBe('54px');
    expect(theme.spacing.fab).toBe('52px');
  });
});
