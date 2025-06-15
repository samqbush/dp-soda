#!/usr/bin/env node
import fs from 'fs';

/**
 * Local test script for version increment validation
 * Usage: 
 *   node scripts/test-version-increment.mjs                    # Test against main branch (requires git)
 *   node scripts/test-version-increment.mjs 1.0.1 5          # Test specific base version/code
 */

function parseVersion(versionString) {
  return versionString.split('.').map(Number);
}

function validateVersionIncrement(baseVersion, currentVersion, baseBuildNumber, currentBuildNumber, baseVersionCode, currentVersionCode) {
  console.log(`🔍 Base version: ${baseVersion} (buildNumber: ${baseBuildNumber}, versionCode: ${baseVersionCode})`);
  console.log(`🔍 Current version: ${currentVersion} (buildNumber: ${currentBuildNumber}, versionCode: ${currentVersionCode})`);
  
  let isValid = true;
  
  // Check if buildNumber and versionCode are in sync (current)
  if (currentBuildNumber !== currentVersionCode) {
    console.log(`❌ Error: buildNumber (${currentBuildNumber}) and versionCode (${currentVersionCode}) should be the same`);
    isValid = false;
  }
  
  // Check if base buildNumber and versionCode were in sync
  const baseBuildCode = Math.max(baseBuildNumber, baseVersionCode);
  
  // Check buildNumber/versionCode increment
  const expectedBuildCode = baseBuildCode + 1;
  if (currentBuildNumber !== expectedBuildCode || currentVersionCode !== expectedBuildCode) {
    console.log(`❌ Error: buildNumber and versionCode should both be ${expectedBuildCode}`);
    console.log(`   Current: buildNumber=${currentBuildNumber}, versionCode=${currentVersionCode}`);
    isValid = false;
  }
  
  // Check version increment (patch, minor, or major)
  const [baseMajor, baseMinor, basePatch] = parseVersion(baseVersion);
  const [currMajor, currMinor, currPatch] = parseVersion(currentVersion);
  
  let versionOk = false;
  let incrementType = '';
  
  if (currMajor === baseMajor && currMinor === baseMinor && currPatch === basePatch + 1) {
    console.log(`✅ Patch version incremented correctly`);
    versionOk = true;
    incrementType = 'patch';
  } else if (currMajor === baseMajor && currMinor === baseMinor + 1 && currPatch === 0) {
    console.log(`✅ Minor version incremented correctly`);
    versionOk = true;
    incrementType = 'minor';
  } else if (currMajor === baseMajor + 1 && currMinor === 0 && currPatch === 0) {
    console.log(`✅ Major version incremented correctly`);
    versionOk = true;
    incrementType = 'major';
  }
  
  if (!versionOk) {
    console.log(`❌ Error: version should increment by 1 patch, minor, or major. Base: ${baseVersion}, Current: ${currentVersion}`);
    isValid = false;
  }
  
  if (isValid) {
    console.log(`✅ buildNumber and versionCode are synchronized: ${currentBuildNumber}`);
    console.log(`✅ All versions incremented correctly! (${incrementType} increment)`);
  }
  
  return isValid;
}

async function getBaseVersionFromGit() {
  try {
    const { execSync } = await import('child_process');
    const path = await import('path');
    
    // Get the base branch (usually main or android)
    const baseBranch = 'main'; // or 'android' - adjust as needed
    
    console.log(`📡 Fetching ${baseBranch} branch...`);
    execSync(`git fetch origin ${baseBranch}`, { stdio: 'pipe' });
    
    console.log(`📄 Getting app.config.js from ${baseBranch} branch...`);
    const baseAppConfigContent = execSync(`git show origin/${baseBranch}:app.config.js`, { encoding: 'utf8' });
    
    // Convert CommonJS to ES module format temporarily
    const tempPath = path.resolve('temp-app-config.mjs');
    const moduleContent = baseAppConfigContent
      .replace(/require\('dotenv\/config'\);?\s*/, '') // Remove dotenv require
      .replace(/module\.exports\s*=/, 'export default'); // Convert to ES export
    
    fs.writeFileSync(tempPath, moduleContent);
    
    try {
      const baseModule = await import(`file://${tempPath}?t=${Date.now()}`);
      const baseData = baseModule.default;
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
      
      return {
        version: baseData.expo.version,
        buildNumber: parseInt(baseData.expo.ios.buildNumber),
        versionCode: baseData.expo.android.versionCode
      };
    } catch (importError) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw importError;
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch from git: ${error.message}`);
    console.log(`💡 Try running: node scripts/test-version-increment.mjs <base-version> <base-version-code>`);
    return null;
  }
}

async function main() {
  const [,, baseVersionArg, baseVersionCodeArg] = process.argv;
  
  // Get current version from app.config.js
  if (!fs.existsSync('app.config.js')) {
    console.log('❌ Error: app.config.js not found. Run this script from the project root.');
    process.exit(1);
  }
  
  // Import the app.config.js module dynamically
  const path = await import('path');
  const appConfigPath = path.resolve('app.config.js');
  
  // Read and convert CommonJS to ES module format temporarily
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
  const tempCurrentPath = path.resolve('temp-current-app-config.mjs');
  const moduleContent = appConfigContent
    .replace(/require\('dotenv\/config'\);?\s*/, '') // Remove dotenv require
    .replace(/module\.exports\s*=/, 'export default'); // Convert to ES export
  
  fs.writeFileSync(tempCurrentPath, moduleContent);
  
  let currentAppData;
  try {
    const currentAppModule = await import(`file://${tempCurrentPath}?t=${Date.now()}`);
    currentAppData = currentAppModule.default;
    // Clean up temp file
    fs.unlinkSync(tempCurrentPath);
  } catch (importError) {
    // Clean up temp file on error
    if (fs.existsSync(tempCurrentPath)) fs.unlinkSync(tempCurrentPath);
    throw importError;
  }
  
  const currentVersion = currentAppData.expo.version;
  const currentBuildNumber = parseInt(currentAppData.expo.ios.buildNumber);
  const currentVersionCode = currentAppData.expo.android.versionCode;
  
  let baseVersion, baseBuildNumber, baseVersionCode;
  
  if (baseVersionArg && baseVersionCodeArg) {
    // Use provided arguments
    baseVersion = baseVersionArg;
    baseBuildNumber = parseInt(baseVersionCodeArg);
    baseVersionCode = parseInt(baseVersionCodeArg);
    console.log(`🧪 Testing with provided base version: ${baseVersion} (buildNumber/versionCode: ${baseVersionCode})`);
  } else {
    // Try to get from git
    console.log(`🔍 Attempting to get base version from git...`);
    const baseData = await getBaseVersionFromGit();
    
    if (!baseData) {
      console.log(`\n💡 Usage examples:`);
      console.log(`   node scripts/test-version-increment.mjs                    # Auto-detect from git`);
      console.log(`   node scripts/test-version-increment.mjs 1.0.1 5          # Test specific base`);
      process.exit(1);
    }
    
    baseVersion = baseData.version;
    baseBuildNumber = baseData.buildNumber;
    baseVersionCode = baseData.versionCode;
  }
  
  console.log(`\n🧪 Testing version increment validation...\n`);
  
  const isValid = validateVersionIncrement(baseVersion, currentVersion, baseBuildNumber, currentBuildNumber, baseVersionCode, currentVersionCode);
  
  if (isValid) {
    console.log(`\n🎉 Version increment test PASSED! Ready for PR.`);
    process.exit(0);
  } else {
    console.log(`\n💥 Version increment test FAILED! Please fix before submitting PR.`);
    console.log(`\n💡 Suggestions:`);
    console.log(`   - Use the increment script: node scripts/increment-version.mjs patch`);
    console.log(`   - Or manually ensure:`);
    console.log(`     • buildNumber and versionCode are the same: ${Math.max(baseBuildNumber, baseVersionCode) + 1}`);
    console.log(`     • version is incremented: ${baseVersion} → (patch/minor/major increment)`);
    process.exit(1);
  }
}

main().catch(console.error);
