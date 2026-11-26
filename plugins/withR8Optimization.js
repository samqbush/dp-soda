const { withAppBuildGradle } = require('expo/config-plugins');

const NO_OPTIMIZE = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZE = 'getDefaultProguardFile("proguard-android-optimize.txt")';

// Expo's Android template uses proguard-android.txt, whose -dontoptimize stops R8
// from optimizing code. Google Play requires at least 25% optimization (as well
// as obfuscation and shrinking) for apps with more than 10 MB of DEX code.
function applyOptimizedProguardFile(buildGradle) {
  if (buildGradle.includes(OPTIMIZE)) {
    return buildGradle;
  }
  if (!buildGradle.includes(NO_OPTIMIZE)) {
    throw new Error(
      `withR8Optimization: expected ${NO_OPTIMIZE} in android/app/build.gradle. ` +
        'The Expo template has changed; update plugins/withR8Optimization.js.'
    );
  }
  return buildGradle.replace(NO_OPTIMIZE, OPTIMIZE);
}

const withR8Optimization = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyOptimizedProguardFile(cfg.modResults.contents);
    return cfg;
  });

module.exports = withR8Optimization;
module.exports.applyOptimizedProguardFile = applyOptimizedProguardFile;
