#!/usr/bin/env node

/**
 * This script validates the bundle identifier in app.config.js
 * It helps identify formatting issues that could cause build failures
 */

import fs from 'fs';
import path from 'path';

console.log('Checking app.config.js for bundle identifier format issues...');

try {
  // Read the app.config.js file
  const appConfigPath = path.resolve(process.cwd(), 'app.config.js');
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
  
  console.log('Successfully read app.config.js');
  
  // Check for proper bundle identifier format
  const iosBundleRegex = /bundleIdentifier\s*:\s*["']([^"']+)["']/;
  const androidPackageRegex = /package\s*:\s*["']([^"']+)["']/;
  
  const iosMatch = appConfigContent.match(iosBundleRegex);
  const androidMatch = appConfigContent.match(androidPackageRegex);
  
  if (iosMatch) {
    const iosBundleId = iosMatch[1];
    console.log(`Found iOS bundle identifier: "${iosBundleId}"`);
    
    // Validate format (should be in reverse-domain notation)
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i.test(iosBundleId)) {
      console.error('⚠️ iOS bundle identifier format may be invalid');
      console.error('Expected format: reverse domain notation (e.g., "com.example.app")');
    } else {
      console.log('✓ iOS bundle identifier format looks valid');
    }
    
    // Check for potential quotation issues
    if (iosBundleId.includes('"') || iosBundleId.includes("'")) {
      console.error('⚠️ iOS bundle identifier contains quotes which will cause build issues');
    }
  } else {
    console.error('❌ Could not find iOS bundle identifier in app.config.js');
  }
  
  if (androidMatch) {
    const androidPackage = androidMatch[1];
    console.log(`Found Android package name: "${androidPackage}"`);
    
    // Validate format (should be in reverse-domain notation)
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i.test(androidPackage)) {
      console.error('⚠️ Android package name format may be invalid');
      console.error('Expected format: reverse domain notation (e.g., "com.example.app")');
    } else {
      console.log('✓ Android package name format looks valid');
    }
    
    // Check for potential quotation issues
    if (androidPackage.includes('"') || androidPackage.includes("'")) {
      console.error('⚠️ Android package name contains quotes which will cause build issues');
    }
  } else {
    console.error('❌ Could not find Android package name in app.config.js');
  }
  
  // Check for potential broken string concatenation or template literals
  if (appConfigContent.includes('bundleIdentifier: `') || 
      appConfigContent.includes('package: `') ||
      appConfigContent.includes('bundleIdentifier: "' + '') ||
      appConfigContent.includes('package: "' + '')) {
    console.warn('⚠️ Found potential template literals or string concatenation in bundle identifiers');
    console.warn('This might lead to formatting issues. Use plain strings instead.');
  }
  
  console.log('Bundle identifier check complete');
} catch (error) {
  console.error('Error checking bundle identifier:', error);
  process.exit(1);
}
