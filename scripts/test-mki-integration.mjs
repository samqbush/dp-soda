// Test script to verify MKI integration is working

console.log('🧪 Testing MKI Integration...\n');

// Test 1: Check if mountainWaveAnalyzer can be imported
try {
  // Using dynamic import since this is an ES module
  const { mountainWaveAnalyzer } = await import('../services/mountainWaveAnalyzer.ts');
  console.log('✅ Mountain Wave Analyzer imported successfully');
  
  // Test basic instantiation
  const testData = {
    morrison: {
      currentWeather: { temperature: 15, windSpeed: 5, windDirection: 270 },
      hourlyForecast: [
        { timestamp: new Date(), temperature: 15, windSpeed: 5, windDirection: 270 }
      ]
    },
    mountain: {
      currentWeather: { temperature: 10, windSpeed: 8, windDirection: 270 },
      hourlyForecast: [
        { timestamp: new Date(), temperature: 10, windSpeed: 8, windDirection: 270 }
      ]
    },
    lastFetch: new Date().toISOString(),
    dataSource: 'mock'
  };
  
  // Test mountain wave analysis
  const waveAnalysis = mountainWaveAnalyzer.analyzeMountainWaves(testData);
  console.log('✅ Mountain wave analysis completed');
  console.log(`   Froude Number: ${waveAnalysis.froudeNumber.toFixed(3)}`);
  console.log(`   Wave Enhancement: ${waveAnalysis.enhancementPotential}`);
  console.log(`   Propagation Potential: ${waveAnalysis.wavePropagationPotential}%`);
  
  // Test stability profile analysis
  const stabilityProfile = mountainWaveAnalyzer.analyzeStabilityProfile(testData);
  console.log('✅ Stability profile analysis completed');
  console.log(`   Coupling Efficiency: ${stabilityProfile.couplingEfficiency.toFixed(0)}%`);
  console.log(`   Profile Optimal: ${stabilityProfile.profileOptimal}`);
  
} catch (error) {
  console.log('❌ Mountain Wave Analyzer import failed:', error.message);
}

// Test 2: Check if enhanced katabatic analyzer works
try {
  const { katabaticAnalyzer } = await import('../services/katabaticAnalyzer.ts');
  console.log('\n✅ Enhanced Katabatic Analyzer imported successfully');
  
  // Create test weather data
  const testWeatherData = {
    morrison: {
      currentWeather: { temperature: 15, pressure: 1013, windSpeed: 3, windDirection: 270, humidity: 60, cloudCover: 20 },
      hourlyForecast: Array(24).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        temperature: 15 - i * 0.5,
        pressure: 1013 + Math.sin(i * 0.3) * 2,
        windSpeed: 3 + Math.random() * 2,
        windDirection: 270,
        humidity: 60 + Math.random() * 20,
        cloudCover: 20 + Math.random() * 30,
        precipitationProbability: Math.random() * 20
      }))
    },
    mountain: {
      currentWeather: { temperature: 10, pressure: 1015, windSpeed: 8, windDirection: 270, humidity: 70, cloudCover: 25 },
      hourlyForecast: Array(24).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        temperature: 10 - i * 0.6,
        pressure: 1015 + Math.sin(i * 0.3) * 1.5,
        windSpeed: 8 + Math.random() * 3,
        windDirection: 270,
        humidity: 70 + Math.random() * 15,
        cloudCover: 25 + Math.random() * 25,
        precipitationProbability: Math.random() * 15
      }))
    },
    lastFetch: new Date().toISOString(),
    dataSource: 'mock',
    error: null
  };
  
  // Test enhanced 6-factor prediction
  const prediction = katabaticAnalyzer.predict(testWeatherData);
  console.log('✅ 6-factor MKI prediction completed');
  console.log(`   Overall Probability: ${prediction.probability}%`);
  console.log(`   Confidence: ${prediction.confidence}`);
  console.log(`   Recommendation: ${prediction.recommendation}`);
  
  // Show factor breakdown
  console.log('\n📊 Factor Analysis:');
  console.log(`   ☔ Precipitation: ${prediction.factors.precipitation.meets ? '✅' : '❌'} (${prediction.factors.precipitation.confidence.toFixed(0)}%)`);
  console.log(`   ☀️ Sky Conditions: ${prediction.factors.skyConditions.meets ? '✅' : '❌'} (${prediction.factors.skyConditions.confidence.toFixed(0)}%)`);
  console.log(`   📊 Pressure: ${prediction.factors.pressureChange.meets ? '✅' : '❌'} (${prediction.factors.pressureChange.confidence.toFixed(0)}%)`);
  console.log(`   🌡️ Temperature: ${prediction.factors.temperatureDifferential.meets ? '✅' : '❌'} (${prediction.factors.temperatureDifferential.confidence.toFixed(0)}%)`);
  console.log(`   🌊 Wave Pattern: ${prediction.factors.wavePattern.meets ? '✅' : '❌'} (${prediction.factors.wavePattern.confidence.toFixed(0)}%) - ${prediction.factors.wavePattern.waveEnhancement}`);
  console.log(`   🏔️ Stability: ${prediction.factors.atmosphericStability.meets ? '✅' : '❌'} (${prediction.factors.atmosphericStability.confidence.toFixed(0)}%)`);
  
  console.log(`\n💡 ${prediction.explanation}`);
  
} catch (error) {
  console.log('❌ Enhanced Katabatic Analyzer test failed:', error.message);
}

console.log('\n🎯 MKI Integration Test Complete!');
console.log('\nIf all tests passed, the Mountain Wave-Katabatic Interaction system is working correctly.');
console.log('The Wind Guru app now uses sophisticated 6-factor atmospheric analysis.');
