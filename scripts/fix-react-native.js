#!/usr/bin/env node
/**
 * React Native project troubleshooter script
 * This helps identify and fix common issues that prevent successful bundling
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Starting React Native project troubleshooting');

// Check for index.js file
console.log('\n📋 Checking entry point files...');
const indexFiles = ['index.js', 'index.tsx', 'App.js', 'App.tsx'];
let entryPointFound = false;

indexFiles.forEach(file => {
  if (fs.existsSync(path.resolve(process.cwd(), file))) {
    console.log(`✅ Found entry point: ${file}`);
    entryPointFound = true;
  }
});

if (!entryPointFound) {
  console.log('⚠️ No standard entry point file found. This might cause bundling issues.');
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found!');
  process.exit(1);
}

const packageJson = require(packageJsonPath);
const deps = packageJson.dependencies || {};

// Essential dependencies for React Native
const essentialDeps = [
  'react',
  'react-native',
  'expo',
  '@react-navigation/native',
  'react-native-screens',
  'react-native-safe-area-context'
];

// Check for each essential dependency
essentialDeps.forEach(dep => {
  if (deps[dep]) {
    console.log(`✅ Found ${dep}: ${deps[dep]}`);
  } else {
    console.log(`⚠️ Missing ${dep} in dependencies`);
  }
});

// Check for potential issues
console.log('\n🧐 Checking for potential issues...');

// Check for duplicate React installations
console.log('Checking for duplicate React installations...');
try {
  const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
  
  // Count React folders
  const getDirectories = source =>
    fs.readdirSync(source, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  
  let reactInstances = 0;
  if (fs.existsSync(path.join(nodeModulesPath, 'react'))) {
    reactInstances++;
  }
  
  // Check all node_modules subdirectories for nested react
  const dirs = getDirectories(nodeModulesPath);
  dirs.forEach(dir => {
    if (fs.existsSync(path.join(nodeModulesPath, dir, 'node_modules', 'react'))) {
      reactInstances++;
      console.log(`Found nested React in: ${dir}`);
    }
  });
  
  console.log(`Total React installations found: ${reactInstances}`);
  if (reactInstances > 1) {
    console.log('⚠️ Multiple React installations detected. This can cause issues with hooks.');
  } else {
    console.log('✅ Only one React installation detected.');
  }
} catch (err) {
  console.error('Error checking for duplicate React:', err.message);
}

// Fix tsconfig.json
console.log('\n🔧 Checking TypeScript configuration...');

const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log('Found tsconfig.json. Checking paths configuration...');
    
    // Ensure paths are configured
    if (!tsconfig.compilerOptions || !tsconfig.compilerOptions.paths) {
      console.log('🔧 Adding paths configuration to tsconfig.json');
      tsconfig.compilerOptions = tsconfig.compilerOptions || {};
      tsconfig.compilerOptions.paths = {
        "@/*": ["./*"],
        "@components/*": ["./components/*"],
        "@hooks/*": ["./hooks/*"],
        "@services/*": ["./services/*"],
        "@constants/*": ["./constants/*"]
      };
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log('✅ Updated tsconfig.json with paths configuration');
    } else {
      console.log('✅ tsconfig.json already has paths configuration');
    }
  } catch (err) {
    console.error('❌ Error processing tsconfig.json:', err.message);
  }
} else {
  console.log('⚠️ No tsconfig.json found');
}

// Create metro.config.modules.js
console.log('\n📝 Creating special Metro modules resolver...');
const metroModulesPath = path.resolve(process.cwd(), 'metro.config.modules.js');

const metroModulesContent = `
const path = require('path');

// Create a map of all node_modules for Metro
// This helps with module resolution issues
module.exports = {
  extraNodeModules: {
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    '@react-navigation/native': path.resolve(__dirname, 'node_modules/@react-navigation/native'),
    'react-native-screens': path.resolve(__dirname, 'node_modules/react-native-screens'),
    'react-native-safe-area-context': path.resolve(__dirname, 'node_modules/react-native-safe-area-context'),
    'expo': path.resolve(__dirname, 'node_modules/expo'),
    '@': path.resolve(__dirname),
    '@components': path.resolve(__dirname, 'components'),
    '@hooks': path.resolve(__dirname, 'hooks'),
    '@services': path.resolve(__dirname, 'services'),
    '@constants': path.resolve(__dirname, 'constants')
  }
};
`;

fs.writeFileSync(metroModulesPath, metroModulesContent);
console.log(`✅ Created ${metroModulesPath}`);

// Run final repair commands
console.log('\n🔧 Running repair commands...');
try {
  console.log('\nClearing React Native cache...');
  try {
    execSync('npx react-native-clean-project', { stdio: 'inherit' });
  } catch (err) {
    console.log('react-native-clean-project not available, using manual cleanup...');
    execSync('rm -rf node_modules/.cache');
    execSync('rm -rf $TMPDIR/metro-*', { stdio: 'ignore' });
    execSync('rm -rf $TMPDIR/react-native-packager-cache-*', { stdio: 'ignore' });
    execSync('rm -rf $TMPDIR/react-*', { stdio: 'ignore' });
  }
  
  console.log('\n✅ Troubleshooting completed');
} catch (err) {
  console.error('❌ Error during repair commands:', err.message);
}
