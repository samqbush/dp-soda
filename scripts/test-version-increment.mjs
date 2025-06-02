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

function validateVersionIncrement(baseVersion, currentVersion, baseVersionCode, currentVersionCode) {
  console.log(`🔍 Base version: ${baseVersion} (code: ${baseVersionCode})`);
  console.log(`🔍 Current version: ${currentVersion} (code: ${currentVersionCode})`);
  
  // Check versionCode increment
  const expectedVersionCode = baseVersionCode + 1;
  if (currentVersionCode !== expectedVersionCode) {
    console.log(`❌ Error: versionCode should be ${expectedVersionCode} but is ${currentVersionCode}`);
    return false;
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
    return false;
  }
  
  console.log(`✅ Version and versionCode incremented correctly! (${incrementType} increment)`);
  return true;
}

async function getBaseVersionFromGit() {
  try {
    const { execSync } = await import('child_process');
    
    // Get the base branch (usually main or android)
    const baseBranch = 'android'; // or 'main' - adjust as needed
    
    console.log(`📡 Fetching ${baseBranch} branch...`);
    execSync(`git fetch origin ${baseBranch}`, { stdio: 'pipe' });
    
    console.log(`📄 Getting app.json from ${baseBranch} branch...`);
    const baseAppJson = execSync(`git show origin/${baseBranch}:app.json`, { encoding: 'utf8' });
    
    const baseData = JSON.parse(baseAppJson);
    return {
      version: baseData.expo.version,
      versionCode: baseData.expo.android.versionCode
    };
  } catch (error) {
    console.log(`⚠️  Could not fetch from git: ${error.message}`);
    console.log(`💡 Try running: node scripts/test-version-increment.mjs <base-version> <base-version-code>`);
    return null;
  }
}

async function main() {
  const [,, baseVersionArg, baseVersionCodeArg] = process.argv;
  
  // Get current version from app.json
  if (!fs.existsSync('app.json')) {
    console.log('❌ Error: app.json not found. Run this script from the project root.');
    process.exit(1);
  }
  
  const currentAppData = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const currentVersion = currentAppData.expo.version;
  const currentVersionCode = currentAppData.expo.android.versionCode;
  
  let baseVersion, baseVersionCode;
  
  if (baseVersionArg && baseVersionCodeArg) {
    // Use provided arguments
    baseVersion = baseVersionArg;
    baseVersionCode = parseInt(baseVersionCodeArg);
    console.log(`🧪 Testing with provided base version: ${baseVersion} (code: ${baseVersionCode})`);
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
    baseVersionCode = baseData.versionCode;
  }
  
  console.log(`\n🧪 Testing version increment validation...\n`);
  
  const isValid = validateVersionIncrement(baseVersion, currentVersion, baseVersionCode, currentVersionCode);
  
  if (isValid) {
    console.log(`\n🎉 Version increment test PASSED! Ready for PR.`);
    process.exit(0);
  } else {
    console.log(`\n💥 Version increment test FAILED! Please fix before submitting PR.`);
    console.log(`\n💡 Suggestions:`);
    console.log(`   - Increment versionCode by 1: ${baseVersionCode} → ${baseVersionCode + 1}`);
    console.log(`   - Increment version by patch: ${baseVersion} → ${baseVersion.replace(/\d+$/, (n) => parseInt(n) + 1)}`);
    process.exit(1);
  }
}

main().catch(console.error);
