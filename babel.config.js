const { INLINED, loadBuildEnv } = require('./scripts/build-env');

loadBuildEnv();

module.exports = {
  // nativewind/babel also adds the Reanimated (Worklets) plugin.
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    // Keep in sync with tsconfig.json "paths" and jest.config.js moduleNameMapper.
    ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
    // Bakes the Supabase URL and anon key into the bundle (scripts/build-env.js).
    ['transform-inline-environment-variables', { include: INLINED }],
    // process.env.EXPO_OS for expo-blur (scripts/babel-plugin-expo-os.js).
    './scripts/babel-plugin-expo-os',
  ],
};
