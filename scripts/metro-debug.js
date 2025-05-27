// This file adds additional debugging information for Metro bundling errors
const fs = require('fs');
const path = require('path');
const os = require('os');

// Record the environment variables
const envInfo = {
  nodeVersion: process.version,
  platform: os.platform(),
  release: os.release(),
  arch: os.arch(),
  memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
  freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
  env: {
    NODE_ENV: process.env.NODE_ENV,
    NODE_OPTIONS: process.env.NODE_OPTIONS,
    ...Object.keys(process.env)
      .filter(key => key.startsWith('REACT_') || key.startsWith('EXPO_'))
      .reduce((obj, key) => ({
        ...obj,
        [key]: process.env[key]
      }), {})
  }
};

// Log system information
console.log('======== METRO BUNDLING DEBUG INFO ========');
console.log(JSON.stringify(envInfo, null, 2));

// Check for common issues
const rootDir = process.cwd();

// Print key folders/files
try {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = require(packageJsonPath);
  console.log('Package.json version:', packageJson.version);
  console.log('React version:', packageJson.dependencies.react);
  console.log('React Native version:', packageJson.dependencies['react-native']);
} catch (err) {
  console.error('Error reading package.json:', err.message);
}

// Check for metro temp files
const tempDir = os.tmpdir();
try {
  const files = fs.readdirSync(tempDir);
  const metroFiles = files.filter(file => file.startsWith('metro-'));
  console.log(`Metro temp files in ${tempDir}:`, metroFiles);
} catch (err) {
  console.error('Error reading temp directory:', err.message);
}

// Add event listener for process uncaught exceptions and promise rejections
process.on('uncaughtException', (err) => {
  console.error('BUNDLING UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('BUNDLING UNHANDLED REJECTION:', reason);
});

// Export nothing - this file is just for side effects
module.exports = {};
