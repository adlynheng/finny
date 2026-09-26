// Tailwind loads this config (and the TypeScript it requires) through jiti.
const { tokens } = require('./src/theme/tokens');

const { desktop } = tokens.frame;
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
      colors: Object.fromEntries(
        Object.entries(tokens.colors).map(([name, value]) => [
          kebab(name),
          value,
        ]),
      ),
      // Desktop frame geometry: h-frame-header, px-frame-x, pt-frame-top ...
      spacing: {
        'frame-header': px(desktop.headerHeight),
        'frame-header-x': px(desktop.headerPaddingX),
        'frame-header-gap': px(desktop.headerGap),
        'frame-top': px(desktop.contentPadding.top),
        'frame-x': px(desktop.contentPadding.x),
        'frame-bottom': px(desktop.contentPadding.bottom),
        'frame-gap': px(desktop.gap),
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
