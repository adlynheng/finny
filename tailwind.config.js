// Tailwind loads this config (and the TypeScript it requires) through jiti.
const { tokens } = require('./src/theme/tokens');

const kebab = name => name.replace(/[A-Z0-9]/g, c => `-${c.toLowerCase()}`);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // bg-ink, text-muted-2, border-lime-dark ...
      colors: Object.fromEntries(
        Object.entries(tokens.colors).map(([name, value]) => [
          kebab(name),
          value,
        ]),
      ),
      // rounded-4 ... rounded-14, plus the named mobile radii.
      borderRadius: {
        ...Object.fromEntries(tokens.radii.scale.map(r => [r, `${r}px`])),
        sheet: `${tokens.radii.sheetTop}px`,
        'bottom-pill': `${tokens.radii.mobileBottomPill}px`,
        'bottom-tab': `${tokens.radii.mobileBottomTab}px`,
      },
    },
  },
  plugins: [],
};
