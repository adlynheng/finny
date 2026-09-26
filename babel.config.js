module.exports = {
  // nativewind/babel also adds the Reanimated (Worklets) plugin.
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    // Keep in sync with tsconfig.json "paths" and jest.config.js moduleNameMapper.
    ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
  ],
};
