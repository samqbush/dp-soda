// Learn more: https://docs.expo.io/guides/customizing-metro/

const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Ensure we only bundle a single copy of React
config.resolver.extraNodeModules = {
  react: require.resolve('react'),
  'react-native': require.resolve('react-native'),
};

// Prevent duplicate module bundling
config.resolver.disableHierarchicalLookup = true;

// Enable metro to properly handle symlinks
config.resolver.unstable_enableSymlinks = true;

// Add support for common file extensions
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'cjs', 'mjs', 'json'];

module.exports = config;
