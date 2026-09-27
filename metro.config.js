const { createHash } = require('crypto');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { loadBuildEnv } = require('./scripts/build-env');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Babel inlines the build env (scripts/build-env.js), which Metro's transform cache cannot see.
  // Keying the cache on those values means changing .env takes effect without --reset-cache.
  cacheVersion: createHash('sha256')
    .update(JSON.stringify(loadBuildEnv()))
    .digest('hex'),
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  { input: './src/global.css' },
);
