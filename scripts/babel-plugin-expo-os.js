// Expo modules read process.env.EXPO_OS, which babel-preset-expo normally
// inlines. expo-blur is the only Expo module here, so this inlines that one
// value rather than adopting the whole Expo preset.
module.exports = function expoOs(api) {
  const platform = api.caller(caller => caller && caller.platform);
  return {
    visitor: {
      MemberExpression(path) {
        if (platform && path.matchesPattern('process.env.EXPO_OS')) {
          path.replaceWith(api.types.stringLiteral(platform));
        }
      },
    },
  };
};
