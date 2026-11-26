const { applyOptimizedProguardFile } = require('../../plugins/withR8Optimization');

const templateRelease = `
    buildTypes {
        release {
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }`;

describe('applyOptimizedProguardFile', () => {
  it('switches the Expo template to the optimizing ProGuard defaults', () => {
    const result = applyOptimizedProguardFile(templateRelease);

    expect(result).toContain(
      'proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"'
    );
    expect(result).not.toContain('"proguard-android.txt"');
  });

  it('leaves an already optimized build.gradle unchanged when prebuild reruns', () => {
    const optimized = applyOptimizedProguardFile(templateRelease);

    expect(applyOptimizedProguardFile(optimized)).toBe(optimized);
  });

  it('fails prebuild when the template no longer uses proguard-android.txt', () => {
    expect(() => applyOptimizedProguardFile('buildTypes { release { } }')).toThrow(
      /withR8Optimization: expected/
    );
  });
});
