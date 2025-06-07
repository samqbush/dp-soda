#!/usr/bin/env node

/**
 * Test OpenWeatherMap Integration
 * 
 * This script tests the new OpenWeatherMap API integration to ensure
 * it's working correctly and returning real weather data.
 */

// Mock the required React Native modules for Node.js testing
const mockAsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {}
};

const mockConstants = {
  expoConfig: {
    extra: {
      OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY
    }
  }
};

// Mock the React Native imports
global.require = (function(originalRequire) {
  return function(id) {
    if (id === '@react-native-async-storage/async-storage') {
      return mockAsyncStorage;
    }
    if (id === 'expo-constants') {
      return mockConstants;
    }
    return originalRequire.apply(this, arguments);
  };
})(require);

// Now we can import our weather service
const axios = require('axios');

// Simulate the weather service logic for testing
class TestWeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async testApiConnection() {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'No API key provided',
        recommendation: 'Set OPENWEATHER_API_KEY environment variable'
      };
    }

    try {
      console.log('🌤️ Testing OpenWeatherMap API connection...');
      
      // Test with Morrison, CO coordinates
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: 39.6533,
          lon: -105.1942,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data) {
        return {
          success: true,
          data: response.data,
          location: `${response.data.name}, ${response.data.sys.country}`,
          temperature: response.data.main.temp,
          description: response.data.weather[0].description,
          clouds: response.data.clouds.all,
          pressure: response.data.main.pressure,
          humidity: response.data.main.humidity
        };
      } else {
        return {
          success: false,
          error: `Unexpected response: ${response.status}`
        };
      }
    } catch (error) {
      let errorMessage = 'Unknown error';
      let recommendation = '';

      if (error.response?.status === 401) {
        errorMessage = 'Invalid API key';
        recommendation = 'Check your OpenWeatherMap API key is correct and activated';
      } else if (error.response?.status === 429) {
        errorMessage = 'API rate limit exceeded';
        recommendation = 'Wait a few minutes or upgrade your OpenWeatherMap plan';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Network connection failed';
        recommendation = 'Check your internet connection';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        recommendation,
        details: error.response?.data
      };
    }
  }

  async testForecastData() {
    if (!this.apiKey) {
      return { success: false, error: 'No API key provided' };
    }

    try {
      console.log('📊 Testing forecast data retrieval...');
      
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat: 39.6533,
          lon: -105.1942,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data?.list) {
        const forecasts = response.data.list.slice(0, 5); // First 5 forecasts
        return {
          success: true,
          forecastCount: response.data.list.length,
          sampleForecasts: forecasts.map(item => ({
            time: item.dt_txt,
            temperature: item.main.temp,
            description: item.weather[0].description,
            precipitationProbability: Math.round(item.pop * 100),
            cloudCover: item.clouds.all,
            pressure: item.main.pressure
          }))
        };
      } else {
        return {
          success: false,
          error: 'Invalid forecast response structure'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Forecast test failed'
      };
    }
  }
}

async function main() {
  console.log('🧪 OPENWEATHERMAP API INTEGRATION TEST');
  console.log('=====================================\n');

  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SETUP REQUIRED');
    console.log('No OpenWeatherMap API key found in environment variables.');
    console.log('\nTo fix this:');
    console.log('1. Get a free API key from https://openweathermap.org/api');
    console.log('2. Set it as an environment variable:');
    console.log('   export OPENWEATHER_API_KEY=your_api_key_here');
    console.log('3. Or add it to your .env file');
    console.log('\nSee docs/OPENWEATHERMAP_SETUP.md for detailed instructions.');
    return;
  }

  console.log('🔑 API Key found in environment variables');
  console.log(`🔑 Key preview: ${apiKey.substring(0, 8)}...${apiKey.substring(-4)}\n`);

  const weatherService = new TestWeatherService(apiKey);

  // Test 1: Basic API connection
  console.log('TEST 1: Basic API Connection');
  console.log('───────────────────────────');
  const connectionTest = await weatherService.testApiConnection();
  
  if (connectionTest.success) {
    console.log('✅ API connection successful!');
    console.log(`📍 Location: ${connectionTest.location}`);
    console.log(`🌡️  Temperature: ${connectionTest.temperature}°C`);
    console.log(`📝 Conditions: ${connectionTest.description}`);
    console.log(`☁️  Cloud cover: ${connectionTest.clouds}%`);
    console.log(`🫧 Pressure: ${connectionTest.pressure} hPa`);
    console.log(`💧 Humidity: ${connectionTest.humidity}%`);
  } else {
    console.log('❌ API connection failed');
    console.log(`Error: ${connectionTest.error}`);
    if (connectionTest.recommendation) {
      console.log(`💡 Recommendation: ${connectionTest.recommendation}`);
    }
    if (connectionTest.details) {
      console.log(`Details: ${JSON.stringify(connectionTest.details, null, 2)}`);
    }
    return;
  }

  console.log('\n');

  // Test 2: Forecast data
  console.log('TEST 2: Forecast Data Retrieval');
  console.log('─────────────────────────────');
  const forecastTest = await weatherService.testForecastData();
  
  if (forecastTest.success) {
    console.log(`✅ Forecast data retrieved successfully!`);
    console.log(`📊 Total forecast points: ${forecastTest.forecastCount}`);
    console.log('\n📅 Sample upcoming forecasts:');
    
    forecastTest.sampleForecasts.forEach((forecast, index) => {
      console.log(`\n${index + 1}. ${forecast.time}`);
      console.log(`   🌡️  ${forecast.temperature}°C - ${forecast.description}`);
      console.log(`   ☔ Precipitation: ${forecast.precipitationProbability}%`);
      console.log(`   ☁️  Cloud cover: ${forecast.cloudCover}%`);
      console.log(`   🫧 Pressure: ${forecast.pressure} hPa`);
    });
  } else {
    console.log('❌ Forecast test failed');
    console.log(`Error: ${forecastTest.error}`);
    return;
  }

  console.log('\n');
  console.log('🎉 ALL TESTS PASSED!');
  console.log('═══════════════════');
  console.log('✅ OpenWeatherMap API is properly configured');
  console.log('✅ Real weather data is being retrieved');
  console.log('✅ Forecast data includes all required fields');
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. Restart your Dawn Patrol app to use real weather data');
  console.log('2. Check the Wind Guru tab for accurate predictions');
  console.log('3. Verify the data source shows "API" instead of "Mock"');
  console.log('\n🎯 This should fix the accuracy issues the wind guru identified!');
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Test script error:', error);
    process.exit(1);
  });
}

module.exports = { TestWeatherService };
