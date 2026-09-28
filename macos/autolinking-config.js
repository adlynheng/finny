// react-native-macos's autolinking links every dependency's `platforms.ios`
// entry into the macOS target too. This emits the React Native CLI config with
// the iOS-only packages removed, so they stay out of the macOS build.
const IOS_ONLY = ['expo']; // the Expo module system, for expo-blur: no macOS support

const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cli = require.resolve('@react-native-community/cli/build/bin.js', {
  paths: [root],
});
const config = JSON.parse(
  execFileSync(process.execPath, [cli, 'config'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }),
);
for (const name of IOS_ONLY) {
  delete config.dependencies[name];
}
process.stdout.write(JSON.stringify(config));
