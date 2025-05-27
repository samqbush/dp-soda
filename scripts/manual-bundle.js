#!/usr/bin/env node
/**
 * This is a diagnostic script that helps troubleshoot bundle issues
 * by directly invoking the Metro bundler with detailed error reporting
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Output file paths
const OUT_DIR = path.resolve(__dirname, '../android/app/src/main/assets');
const BUNDLE_FILE = path.join(OUT_DIR, 'index.android.bundle');
const SOURCE_MAP_FILE = path.join(OUT_DIR, 'index.android.bundle.map');

// Create output directory if it doesn't exist
console.log(`Ensuring output directory exists: ${OUT_DIR}`);
try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error(`Failed to create output directory: ${err.message}`);
    process.exit(1);
  }
}

// Validate environment
console.log('Environment validation:');
console.log(`- Node version: ${process.version}`);
console.log(`- Current directory: ${process.cwd()}`);

// Check for common issues
try {
  const packageJson = require('../package.json');
  console.log(`- React version: ${packageJson.dependencies.react}`);
  console.log(`- React Native version: ${packageJson.dependencies['react-native']}`);
  console.log(`- Expo version: ${packageJson.dependencies.expo}`);
} catch (err) {
  console.error(`Failed to read package.json: ${err.message}`);
}

// Run the bundle command directly with all necessary options
console.log('\nStarting Metro bundling process...');

try {
  // Build the command with all needed arguments
  const cmd = `npx react-native bundle \
    --dev false \
    --platform android \
    --entry-file index.js \
    --bundle-output ${BUNDLE_FILE} \
    --sourcemap-output ${SOURCE_MAP_FILE} \
    --assets-dest ${OUT_DIR} \
    --minify true \
    --max-workers 2`;
  
  console.log(`Executing: ${cmd}`);
  // Run the command and redirect output to this process
  execSync(cmd, { stdio: 'inherit' });
  
  console.log('\n✅ Bundle created successfully!');
  
  // Check if files were created
  if (fs.existsSync(BUNDLE_FILE)) {
    const stats = fs.statSync(BUNDLE_FILE);
    console.log(`Bundle size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('Bundle file was not created!');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Bundling failed!');
  console.error(error.message);
  process.exit(1);
}
