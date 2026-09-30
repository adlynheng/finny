// Tailwind loads this config (and the TypeScript it requires) through jiti.
const { tokens } = require('./src/theme/tokens');

const { desktop, mobile } = tokens.frame;
const { calendar, controls, dialog, table } = tokens;
const px = n => `${n}px`;

const kebab = name => name.replace(/[A-Z0-9]/g, c => `-${c.toLowerCase()}`);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // font-sans is Urbanist; pick the face with font-light/normal/medium/semibold.
      // Must sit in `extend`: NativeWind's native preset sets font-sans to the
      // system font there, and extend wins over a plain theme key.
      fontFamily: { sans: [tokens.type.family] },
      // bg-ink, text-muted-2, border-lime-dark ...
      // plus each glass recipe's fill and border:
      // bg-glass-card, border-glass-card-border ...
      colors: {
        ...Object.fromEntries(
          Object.entries(tokens.colors).map(([name, value]) => [
            kebab(name),
            value,
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(tokens.glass).flatMap(([name, recipe]) => {
            const key = `glass-${kebab(name)}`;
            return [
              [key, recipe.background],
              ...(recipe.border
                ? [[`${key}-border`, recipe.border.color]]
                : []),
            ];
          }),
        ),
        // The controls: trays, hover washes, borders, the toggle's off track.
        'segment-tray': controls.segmented.tray,
        'segment-tray-soft': controls.segmented.traySoft,
        'ghost-hover': controls.ghostHover,
        'icon-hover': controls.iconHover,
        soft: controls.soft,
        'soft-hover': controls.softHover,
        'danger-hover': controls.dangerHover,
        'destructive-hover': controls.destructiveHover,
        'light-hover': controls.lightHover,
        'outline-border': controls.outlineBorder,
        'chip-border': controls.chipBorder,
        'input-border': controls.input.border,
        'input-open-border': controls.input.openBorder,
        'toggle-off': controls.toggle.offColor,
        'sheet-handle': dialog.mobile.handle,
        // The date picker: bg-tile, border-tile-today, bg-nav-tray ...
        'popover-border': calendar.popover.border,
        'nav-tray': calendar.navTray,
        tile: calendar.tile.fill,
        'tile-today': calendar.tile.todayBorder,
        'tile-hover': calendar.tile.hoverBorder,
        // Tables: border-row-border, hover:bg-row-hover, bg-sub-area ...
        'row-border': table.rowBorder,
        'totals-border': table.totalsBorder,
        'row-hover': table.rowHover,
        'row-selected': table.rowSelected,
        'sub-area': table.subArea,
        connector: table.connector,
        'chevron-tray': table.chevron.tray,
      },
      // opacity-dimmed (an unchoosable chip), opacity-disabled.
      opacity: {
        dimmed: String(controls.dimmedOpacity),
        disabled: String(controls.disabledOpacity),
      },
      // max-h-sheet: the mobile sheet's cap.
      maxHeight: { sheet: dialog.mobile.maxHeight },
      // flex-2: the mobile sheet's primary action, twice Cancel's width.
      flex: { 2: '2 2 0%' },
      // Desktop frame geometry: h-frame-header, px-frame-x, pt-frame-top ...
      spacing: {
        'frame-header': px(desktop.headerHeight),
        'frame-header-x': px(desktop.headerPaddingX),
        'frame-header-gap': px(desktop.headerGap),
        'frame-top': px(desktop.contentPadding.top),
        'frame-x': px(desktop.contentPadding.x),
        'frame-bottom': px(desktop.contentPadding.bottom),
        'frame-gap': px(desktop.gap),
        // The Overview grid: h-overview-row, left-hero-inset, left-hero-sphere.
        'overview-row': px(desktop.overview.bottomRowHeight),
        'hero-inset': px(desktop.overview.heroInset),
        'hero-sphere': px(desktop.overview.sphereLeft),
        // The Personal Finance grid: h-finance-row.
        'finance-row': px(desktop.finance.topRowHeight),
        // The Goals & Planner grid: h-planner-row.
        'planner-row': px(desktop.planner.heroHeight),
        // Mobile frame: h-mobile-header, px-mobile-x, pt-mobile-top, pb-mobile-bottom;
        // the bar's inset-x-bar-x, bottom-bar-bottom, h-bar-tab, size-fab.
        'mobile-header': px(mobile.headerHeight),
        'mobile-x': px(mobile.contentPadding.x),
        'mobile-top': px(mobile.contentPadding.top),
        'mobile-bottom': px(mobile.contentPadding.bottom),
        'bar-x': px(mobile.bottomBar.insetX),
        'bar-bottom': px(mobile.bottomBar.bottom),
        'bar-tab': px(mobile.bottomBar.tabHeight),
        fab: px(mobile.bottomBar.fabSize),
        // p-card: gradient and glass cards.
        card: px(tokens.card.padding),
        // w-toggle-w h-toggle-h, size-toggle-knob.
        'toggle-w': px(controls.toggle.width),
        'toggle-h': px(controls.toggle.height),
        'toggle-knob': px(controls.toggle.knob),
        'toggle-w-mobile': px(controls.toggle.mobile.width),
        'toggle-h-mobile': px(controls.toggle.mobile.height),
        'toggle-knob-mobile': px(controls.toggle.mobile.knob),
        // h-input (desktop), h-input-touch (mobile).
        input: px(controls.input.height),
        'input-touch': px(controls.input.touchHeight),
        // Dialogs: w-dialog-standard, p-dialog-pad, gap-dialog-gap; the mobile
        // sheet's p-sheet-pad, gap-sheet-gap and h-action.
        ...Object.fromEntries(
          Object.entries(dialog.desktop.widths).map(([name, w]) => [
            `dialog-${name}`,
            px(w),
          ]),
        ),
        'dialog-pad': px(dialog.desktop.padding),
        'dialog-gap': px(dialog.desktop.gap),
        'sheet-pad': px(dialog.mobile.padding),
        'sheet-gap': px(dialog.mobile.gap),
        action: px(dialog.mobile.actionHeight),
        // w-popover; h-tile (desktop), h-tile-touch (mobile).
        popover: px(calendar.popover.width),
        tile: px(calendar.tile.height),
        'tile-touch': px(calendar.tile.touchHeight),
        // Tables: gap-col, px-table-x, min-h-row, min-h-sub-row, size-chevron.
        col: px(table.columnGap),
        'table-x': px(table.paddingX),
        row: px(table.rowHeight),
        'sub-row': px(table.subRowHeight),
        chevron: px(table.chevron.box),
      },
      // rounded-4 ... rounded-14, plus the named mobile radii.
      borderRadius: {
        ...Object.fromEntries(tokens.radii.scale.map(r => [r, px(r)])),
        sheet: px(tokens.radii.sheetTop),
        'bottom-pill': px(tokens.radii.mobileBottomPill),
        'bottom-tab': px(tokens.radii.mobileBottomTab),
      },
    },
  },
  plugins: [],
};
