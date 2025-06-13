#!/usr/bin/env node
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * Version increment script for app.config.js
 * 
 * This script increments version, buildNumber, and versionCode consistently.
 * buildNumber and versionCode are kept in sync as they serve the same purpose
 * for iOS and Android respectively.
 * 
 * Usage:
 *   node scripts/increment-version.mjs patch   # 1.0.3 -> 1.0.4
 *   node scripts/increment-version.mjs minor   # 1.0.3 -> 1.1.0  
 *   node scripts/increment-version.mjs major   # 1.0.3 -> 2.0.0
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseVersion(versionString) {
  return versionString.split('.').map(Number);
}

function incrementVersion(version, type) {
  const [major, minor, patch] = parseVersion(version);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid increment type: ${type}. Use 'patch', 'minor', or 'major'.`);
  }
}

async function getCurrentVersions() {
  const appConfigPath = resolve(__dirname, '..', 'app.config.js');
  
  if (!fs.existsSync(appConfigPath)) {
    throw new Error('app.config.js not found. Run this script from the project root.');
  }
  
  const appModule = await import(`file://${appConfigPath}`);
  const config = appModule.default;
  
  return {
    version: config.expo.version,
    buildNumber: parseInt(config.expo.ios.buildNumber),
    versionCode: config.expo.android.versionCode
  };
}

function updateAppConfig(newVersion, newBuildNumber) {
  const appConfigPath = resolve(__dirname, '..', 'app.config.js');
  let content = fs.readFileSync(appConfigPath, 'utf8');
  
  // Update version
  content = content.replace(
    /version: ["'][\d.]+["']/,
    `version: "${newVersion}"`
  );
  
  // Update buildNumber
  content = content.replace(
    /buildNumber: ["']\d+["']/,
    `buildNumber: "${newBuildNumber}"`
  );
  
  // Update versionCode
  content = content.replace(
    /versionCode: \d+/,
    `versionCode: ${newBuildNumber}`
  );
  
  fs.writeFileSync(appConfigPath, content, 'utf8');
}

async function main() {
  const [,, incrementType] = process.argv;
  
  if (!incrementType || !['patch', 'minor', 'major'].includes(incrementType)) {
    console.log('❌ Error: Please specify increment type');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/increment-version.mjs patch   # Increment patch version');
    console.log('  node scripts/increment-version.mjs minor   # Increment minor version');
    console.log('  node scripts/increment-version.mjs major   # Increment major version');
    console.log('');
    console.log('Examples:');
    console.log('  1.0.3 -> 1.0.4 (patch)');
    console.log('  1.0.3 -> 1.1.0 (minor)');
    console.log('  1.0.3 -> 2.0.0 (major)');
    process.exit(1);
  }
  
  try {
    console.log('🔍 Reading current versions...');
    const current = await getCurrentVersions();
    
    console.log(`📋 Current versions:`);
    console.log(`   version: ${current.version}`);
    console.log(`   buildNumber: ${current.buildNumber}`);
    console.log(`   versionCode: ${current.versionCode}`);
    
    // Check if buildNumber and versionCode are in sync
    if (current.buildNumber !== current.versionCode) {
      console.log(`⚠️  Warning: buildNumber (${current.buildNumber}) and versionCode (${current.versionCode}) are out of sync!`);
      console.log(`   This script will sync them to the higher value.`);
    }
    
    // Calculate new values
    const newVersion = incrementVersion(current.version, incrementType);
    const newBuildNumber = Math.max(current.buildNumber, current.versionCode) + 1;
    
    console.log('');
    console.log('📈 New versions:');
    console.log(`   version: ${current.version} -> ${newVersion}`);
    console.log(`   buildNumber: ${current.buildNumber} -> ${newBuildNumber}`);
    console.log(`   versionCode: ${current.versionCode} -> ${newBuildNumber}`);
    
    console.log('');
    console.log('🔄 Updating app.config.js...');
    updateAppConfig(newVersion, newBuildNumber);
    
    console.log('✅ Version increment completed successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Review the changes in app.config.js');
    console.log('   2. Test the version increment: npm run test-version');
    console.log('   3. Commit the changes when ready');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
