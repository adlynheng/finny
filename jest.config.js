module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    // Keep in sync with tsconfig.json "paths" and babel.config.js module-resolver.
    '^@/(.*)$': '<rootDir>/src/$1',
    // Tailwind CSS is compiled by Metro (NativeWind); Jest only needs the import to resolve.
    '\\.css$': '<rootDir>/test/styleStub.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/docs/'],
};
