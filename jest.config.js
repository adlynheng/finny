module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    // Keep in sync with tsconfig.json "paths" and babel.config.js module-resolver.
    '^@/(.*)$': '<rootDir>/src/$1',
    // Tailwind CSS is compiled by Metro (NativeWind); Jest only needs the import to resolve.
    '\\.css$': '<rootDir>/test/styleStub.js',
  },
  // The preset's pattern, plus the packages that ship ES modules.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-reanimated|react-native-worklets|@rn-primitives)/)',
  ],
  // Worklets' own resolver skips its .native files, whose native half Jest lacks.
  resolver: 'react-native-worklets/jest/resolver',
  setupFiles: ['<rootDir>/test/jestSetup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/docs/'],
};
