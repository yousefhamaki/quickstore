module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin (Reanimated 4 moved its worklets/babel
    // transform into a separate package) must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
