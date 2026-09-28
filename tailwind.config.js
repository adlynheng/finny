// Tailwind loads this config (and the TypeScript it requires) through jiti.
const { tokens } = require('./src/theme/tokens');

const { desktop } = tokens.frame;
const { controls } = tokens;
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
        // bg-segment-tray, hover washes, the toggle's off track.
        'segment-tray': controls.segmented.tray,
        'ghost-hover': controls.ghostHover,
        'danger-hover': controls.dangerHover,
        'toggle-off': controls.toggle.offColor,
      },
      // opacity-dimmed (an unchoosable chip), opacity-disabled.
      opacity: {
        dimmed: String(controls.dimmedOpacity),
        disabled: String(controls.disabledOpacity),
      },
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
