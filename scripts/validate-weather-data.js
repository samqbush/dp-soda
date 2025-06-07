#!/usr/bin/env node

/**
 * Weather Data Validation Script
 * 
 * This script helps validate the accuracy of our weather predictions
 * by comparing multiple data sources and providing diagnostic information.
 */

const axios = require('axios');

// Multiple weather data sources for validation
const VALIDATION_SOURCES = {
  // National Weather Service (Free, US Gov)
  nws: {
    name: 'National Weather Service',
    baseUrl: 'https://api.weather.gov',
    // Morrison, CO coordinates
    lat: 39.6533,
    lon: -105.1942
  },
  
  // OpenWeatherMap (Free tier available)
  openweather: {
    name: 'OpenWeatherMap',
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    // Requires API key - user needs to set this
    apiKey: process.env.OPENWEATHER_API_KEY,
    lat: 39.6533,
    lon: -105.1942
  },
  
  // WeatherAPI.com (Free tier available)
  weatherapi: {
    name: 'WeatherAPI.com',
    baseUrl: 'https://api.weatherapi.com/v1',
    apiKey: process.env.WEATHERAPI_KEY,
    location: 'Morrison,CO'
  }
};

/**
 * Fetch data from National Weather Service (Free)
 */
async function fetchNWSData() {
  try {
    console.log('🏛️ Fetching National Weather Service data...');
    
    // Get grid point info first
    const pointResponse = await axios.get(
      `${VALIDATION_SOURCES.nws.baseUrl}/points/${VALIDATION_SOURCES.nws.lat},${VALIDATION_SOURCES.nws.lon}`
    );
    
    const gridX = pointResponse.data.properties.gridX;
    const gridY = pointResponse.data.properties.gridY;
    const office = pointResponse.data.properties.gridId;
    
    // Get forecast
    const forecastResponse = await axios.get(
      `${VALIDATION_SOURCES.nws.baseUrl}/gridpoints/${office}/${gridX},${gridY}/forecast`
    );
    
    // Get hourly forecast
    const hourlyResponse = await axios.get(
      `${VALIDATION_SOURCES.nws.baseUrl}/gridpoints/${office}/${gridX},${gridY}/forecast/hourly`
    );
    
    console.log('✅ NWS Data retrieved successfully');
    
    // Extract tomorrow's forecast
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const tomorrowForecast = hourlyResponse.data.properties.periods.filter(period => {
      return period.startTime.startsWith(tomorrowStr);
    });
    
    return {
      source: 'National Weather Service',
      current: forecastResponse.data.properties.periods[0],
      tomorrow: tomorrowForecast.slice(0, 12), // First 12 hours of tomorrow
      raw: {
        forecast: forecastResponse.data,
        hourly: hourlyResponse.data
      }
    };
    
  } catch (error) {
    console.error('❌ Error fetching NWS data:', error.message);
    return null;
  }
}

/**
 * Fetch data from OpenWeatherMap (if API key provided)
 */
async function fetchOpenWeatherData() {
  if (!VALIDATION_SOURCES.openweather.apiKey) {
    console.log('⚠️ OpenWeatherMap API key not provided (set OPENWEATHER_API_KEY)');
    return null;
  }
  
  try {
    console.log('🌤️ Fetching OpenWeatherMap data...');
    
    const response = await axios.get(
      `${VALIDATION_SOURCES.openweather.baseUrl}/forecast`,
      {
        params: {
          lat: VALIDATION_SOURCES.openweather.lat,
          lon: VALIDATION_SOURCES.openweather.lon,
          appid: VALIDATION_SOURCES.openweather.apiKey,
          units: 'metric'
        }
      }
    );
    
    console.log('✅ OpenWeatherMap data retrieved successfully');
    
    // Extract tomorrow's forecast
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const tomorrowForecast = response.data.list.filter(item => {
      return item.dt_txt.startsWith(tomorrowStr);
    });
    
    return {
      source: 'OpenWeatherMap',
      tomorrow: tomorrowForecast,
      raw: response.data
    };
    
  } catch (error) {
    console.error('❌ Error fetching OpenWeatherMap data:', error.message);
    return null;
  }
}

/**
 * Compare weather forecasts for validation
 */
function compareForecasts(sources) {
  console.log('\n📊 WEATHER FORECAST COMPARISON');
  console.log('=====================================');
  
  const validSources = sources.filter(s => s !== null);
  if (validSources.length === 0) {
    console.log('❌ No valid weather data sources available');
    return;
  }
  
  console.log(`\n🔍 Comparing ${validSources.length} data source(s):`);
  validSources.forEach(source => {
    console.log(`  - ${source.source}`);
  });
  
  // Focus on tomorrow's dawn patrol window (6-8 AM)
  console.log('\n🌅 TOMORROW\'S DAWN PATROL FORECAST (6-8 AM):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  validSources.forEach(source => {
    console.log(`\n${source.source}:`);
    
    if (source.source === 'National Weather Service' && source.tomorrow) {
      // Find 6-8 AM periods
      const dawnPeriods = source.tomorrow.filter(period => {
        const hour = new Date(period.startTime).getHours();
        return hour >= 6 && hour <= 8;
      });
      
      dawnPeriods.forEach(period => {
        const time = new Date(period.startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true 
        });
        console.log(`  ${time}: ${period.shortForecast}`);
        console.log(`    🌡️  Temp: ${period.temperature}°${period.temperatureUnit}`);
        console.log(`    💨 Wind: ${period.windSpeed} ${period.windDirection}`);
        if (period.probabilityOfPrecipitation?.value) {
          console.log(`    ☔ Precip: ${period.probabilityOfPrecipitation.value}%`);
        }
      });
    }
    
    if (source.source === 'OpenWeatherMap' && source.tomorrow) {
      // Find 6-8 AM periods
      const dawnPeriods = source.tomorrow.filter(item => {
        const hour = new Date(item.dt * 1000).getHours();
        return hour >= 6 && hour <= 8;
      });
      
      dawnPeriods.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true 
        });
        console.log(`  ${time}: ${item.weather[0].description}`);
        console.log(`    🌡️  Temp: ${Math.round(item.main.temp)}°C`);
        console.log(`    💨 Wind: ${Math.round(item.wind?.speed * 3.6)} km/h`);
        console.log(`    ☔ Precip: ${Math.round((item.pop || 0) * 100)}%`);
        console.log(`    ☁️  Clouds: ${item.clouds.all}%`);
      });
    }
  });
}

/**
 * Generate validation recommendations
 */
function generateRecommendations(sources) {
  console.log('\n💡 VALIDATION RECOMMENDATIONS');
  console.log('=====================================');
  
  console.log('\n🔧 Immediate Actions Needed:');
  console.log('1. Replace mock weather data with real API integration');
  console.log('2. Add multiple weather data sources for validation');
  console.log('3. Implement data quality checks and alerts');
  console.log('4. Create manual override system for expert input');
  
  console.log('\n📋 Data Source Priorities:');
  console.log('1. National Weather Service (Free, accurate, US Gov)');
  console.log('2. OpenWeatherMap (Free tier, good coverage)');
  console.log('3. WeatherAPI.com (Free tier, detailed forecasts)');
  
  console.log('\n🎯 Validation Strategy:');
  console.log('• Compare 2-3 sources for each prediction');
  console.log('• Flag discrepancies > 20% difference');
  console.log('• Weight sources by historical accuracy');
  console.log('• Allow expert override with reasoning');
  
  console.log('\n⚠️  Current App Issues:');
  console.log('• Using mock weather data (explains "clear skies" errors)');
  console.log('• No precipitation probability validation');
  console.log('• No cloud cover forecast integration');
  console.log('• No pressure change analysis');
}

/**
 * Main validation function
 */
async function main() {
  console.log('🏔️ DAWN PATROL WEATHER VALIDATION');
  console.log('=====================================');
  console.log('Validating weather predictions for katabatic wind forecasting\n');
  
  // Fetch data from multiple sources
  const sources = await Promise.all([
    fetchNWSData(),
    fetchOpenWeatherData()
  ]);
  
  // Compare and analyze
  compareForecasts(sources);
  generateRecommendations(sources);
  
  console.log('\n✅ Validation complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install axios (if not already installed)'); 
  console.log('2. Get API keys for additional validation sources');
  console.log('3. Replace mock weather service with real API integration');
}

// Run the validation
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchNWSData, fetchOpenWeatherData, compareForecasts };
