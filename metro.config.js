// Learn more: https://docs.expo.io/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Get default configuration from Expo
const defaultConfig = getDefaultConfig(__dirname);

// Create a simple and stable configuration - avoid advanced features that might cause issues
const config = {
  ...defaultConfig,
  
  // Keep transformer options simple
  transformer: {
    ...defaultConfig.transformer,
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      // Basic terser config
      compress: { 
        drop_console: false,
      },
      mangle: true,
    },
    // Disable experimental features for stability
    experimentalImportSupport: false,
    inlineRequires: false,
  },
  
  // Simple resolver configuration
  resolver: {
    ...defaultConfig.resolver,
    // Map key libraries to specific versions
    extraNodeModules: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
      'expo': path.resolve(__dirname, 'node_modules/expo'),
      '@react-navigation/native': path.resolve(__dirname, 'node_modules/@react-navigation/native'),
      '@react-navigation/stack': path.resolve(__dirname, 'node_modules/@react-navigation/stack'),
    },
    
    // Enable symlinks but use cautious settings
    unstable_enableSymlinks: true,
    
    // Expand supported extensions
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'cjs', 'mjs', 'json'],
    
    // Use a simple path resolution
    resolveRequest: (context, moduleName, platform) => {
      // Handle special cases
      if (moduleName.startsWith('@/')) {
        // Map @/ to the project root
        const relativePath = moduleName.substring(2);
        const absPath = path.join(__dirname, relativePath);
        if (fs.existsSync(absPath)) {
          return { filePath: absPath, type: 'sourceFile' };
        }
        if (fs.existsSync(`${absPath}.js`)) {
          return { filePath: `${absPath}.js`, type: 'sourceFile' };
        }
        if (fs.existsSync(`${absPath}.tsx`)) {
          return { filePath: `${absPath}.tsx`, type: 'sourceFile' };
        }
        if (fs.existsSync(`${absPath}.ts`)) {
          return { filePath: `${absPath}.ts`, type: 'sourceFile' };
        }
      }
      
      // Default resolution
      return defaultConfig.resolver.resolveRequest(context, moduleName, platform);
    }
  },
  
  // Use basic caching
  cacheStores: [
    // Default in-memory cache store
    new (require('metro-cache').FileStore)({
      root: path.join(process.cwd(), 'node_modules', '.cache', 'metro'),
    })
  ],
  
  // Limit resource usage for stability
  maxWorkers: 2,
  
  // Basic reporting
  reporter: defaultConfig.reporter
};

module.exports = config;
