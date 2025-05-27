// Learn more: https://docs.expo.io/guides/customizing-metro/

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get default configuration from Expo
const defaultConfig = getDefaultConfig(__dirname);

// Create optimized configuration
const config = {
  ...defaultConfig,
  
  // Optimize transformer options
  transformer: {
    ...defaultConfig.transformer,
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      // Terser configuration
      compress: { 
        drop_console: false, // Keep console logs for debugging
        ecma: 2020,
      },
      mangle: {
        safari10: true, // Fixes Safari 10 bugs
      },
    },
    
    // Enable these experimental features for better performance
    experimentalImportSupport: true,
    inlineRequires: true,
  },
  
  // Resolver configuration
  resolver: {
    ...defaultConfig.resolver,
    // Ensure we only bundle a single copy of React
    extraNodeModules: {
      react: require.resolve('react'),
      'react-native': require.resolve('react-native'),
    },
    
    // Prevent duplicate module bundling
    disableHierarchicalLookup: true,
    
    // Enable metro to properly handle symlinks
    unstable_enableSymlinks: true,
    
    // Add support for common file extensions
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'cjs', 'mjs', 'json'],
    
    // Force resolving of symlinked modules to their real path
    resolveRequest: (context, moduleName, platform) => {
      // Default resolution
      return defaultConfig.resolver.resolveRequest(context, moduleName, platform);
    },
  },
  
  // Enable caching in CI environment
  cacheStores: [
    // Default in-memory cache store
    new (require('metro-cache').FileStore)({
      root: path.join(process.cwd(), 'node_modules', '.cache', 'metro'),
    })
  ],
  
  // Increase resource limits
  maxWorkers: process.env.CI ? 2 : 4, // Reduce workers in CI environment
  
  // Improve error reporting
  reporter: {
    ...defaultConfig.reporter,
    update: (event) => {
      // Log bundle progress
      if (event.type === 'bundle_build_done') {
        console.log(`Bundle built in ${event.buildTime}ms`);
      }
      // Forward to default reporter
      defaultConfig.reporter.update(event);
    }
  }
};

module.exports = config;
