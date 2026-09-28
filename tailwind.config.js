// Tailwind loads this config (and the TypeScript it requires) through jiti.
const { tokens } = require('./src/theme/tokens');

const { desktop } = tokens.frame;
const { controls, dialog } = tokens;
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
        'outline-border': controls.outlineBorder,
        'chip-border': controls.chipBorder,
        'input-border': controls.input.border,
        'toggle-off': controls.toggle.offColor,
        'sheet-handle': dialog.mobile.handle,
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
        // p-card: gradient and glass cards.
        card: px(tokens.card.padding),
        // w-toggle-w h-toggle-h, size-toggle-knob.
        'toggle-w': px(controls.toggle.width),
        'toggle-h': px(controls.toggle.height),
        'toggle-knob': px(controls.toggle.knob),
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
