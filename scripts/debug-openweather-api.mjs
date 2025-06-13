#!/usr/bin/env node

/**
 * Debug script to verify OpenWeatherMap API data availability
 * This checks what meteorological data is actually available for MKI analysis
 * 
 * IMPORTANT: Verifies if our 6-factor MKI system is based on real API data
 * or if we're using theoretical/calculated values that don't exist in the API
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get API configuration
function getOpenWeatherConfig() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Missing OPENWEATHER_API_KEY in .env file');
    process.exit(1);
  }
  
  return { apiKey };
}

// Location coordinates for our MKI analysis
const LOCATIONS = {
  morrison: { lat: 39.6547, lon: -105.1956, name: 'Morrison, CO (Valley - 1740m)' },
  nederland: { lat: 40.0142, lon: -105.5108, name: 'Nederland, CO (Mountain - 2540m)' }
};

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

async function debugCurrentWeatherAPI(config, location, locationName) {
  console.log(`🌤️  Testing Current Weather API for ${locationName}`);
  console.log('-'.repeat(50));
  
  try {
    const url = `${BASE_URL}/weather`;
    const params = {
      lat: location.lat,
      lon: location.lon,
      appid: config.apiKey,
      units: 'metric'
    };

    console.log('📡 API Request:');
    console.log(`   URL: ${url}`);
    console.log(`   Params:`, JSON.stringify(params, null, 2));
    
    const response = await axios.get(url, { params, timeout: 10000 });
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Raw Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Analyze available data for MKI factors
    console.log('\n🔍 MKI FACTOR ANALYSIS:');
    console.log('-'.repeat(30));
    
    const data = response.data;
    
    // Factor 1: Rain Probability - Check if available
    console.log('☔ Rain Probability:');
    if (data.rain) {
      console.log(`   ✅ Rain data available:`, data.rain);
    } else {
      console.log(`   ❌ No rain data in current weather`);
    }
    
    // Factor 2: Cloud Cover (for clear sky analysis)
    console.log('🌙 Cloud Cover (Clear Sky):');
    if (data.clouds && typeof data.clouds.all !== 'undefined') {
      console.log(`   ✅ Cloud cover: ${data.clouds.all}% (clear sky: ${100 - data.clouds.all}%)`);
    } else {
      console.log(`   ❌ No cloud cover data`);
    }
    
    // Factor 3: Pressure (for pressure change analysis)
    console.log('📈 Pressure:');
    if (data.main && data.main.pressure) {
      console.log(`   ✅ Pressure: ${data.main.pressure} hPa`);
      if (data.main.sea_level) {
        console.log(`   ✅ Sea level pressure: ${data.main.sea_level} hPa`);
      }
      if (data.main.grnd_level) {
        console.log(`   ✅ Ground level pressure: ${data.main.grnd_level} hPa`);
      }
    } else {
      console.log(`   ❌ No pressure data`);
    }
    
    // Factor 4: Temperature (for temperature difference)
    console.log('🌡️  Temperature:');
    if (data.main && data.main.temp) {
      console.log(`   ✅ Temperature: ${data.main.temp}°C`);
      console.log(`   ✅ Feels like: ${data.main.feels_like}°C`);
    } else {
      console.log(`   ❌ No temperature data`);
    }
    
    // Factor 5: Wave Pattern (Froude number) - CHECK IF THIS EXISTS
    console.log('🌊 Wave Pattern (Froude Number):');
    console.log(`   ❓ Checking for wave-related data...`);
    
    const waveRelatedFields = [];
    if (data.wind) {
      console.log(`   ✅ Wind data available:`, data.wind);
      waveRelatedFields.push('wind');
    }
    
    // Look for any atmospheric stability indicators
    console.log('🏔️  Atmospheric Stability:');
    console.log(`   ❓ Checking for stability indicators...`);
    
    const stabilityFields = [];
    if (data.main.humidity) {
      console.log(`   ✅ Humidity: ${data.main.humidity}%`);
      stabilityFields.push('humidity');
    }
    if (data.visibility) {
      console.log(`   ✅ Visibility: ${data.visibility}m`);
      stabilityFields.push('visibility');
    }
    
    // Check for any advanced meteorological data
    console.log('\n🔬 ADVANCED METEOROLOGICAL DATA:');
    console.log('-'.repeat(30));
    
    const advancedFields = ['uvi', 'dew_point', 'pressure_trends', 'atmospheric_pressure', 'wind_gust'];
    advancedFields.forEach(field => {
      if (data[field] !== undefined) {
        console.log(`   ✅ ${field}:`, data[field]);
      }
    });
    
    // Check all available fields
    console.log('\n📋 ALL AVAILABLE FIELDS:');
    console.log('-'.repeat(30));
    const allFields = Object.keys(data);
    allFields.forEach(field => {
      console.log(`   • ${field}: ${typeof data[field]}`);
      if (typeof data[field] === 'object' && data[field] !== null) {
        Object.keys(data[field]).forEach(subField => {
          console.log(`     - ${field}.${subField}: ${data[field][subField]}`);
        });
      }
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ Current Weather API failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('   Response:', error.response?.data);
      console.error('   Status:', error.response?.status);
    }
    throw error;
  }
}

async function debugForecastAPI(config, location, locationName) {
  console.log(`\n⏰ Testing 5-Day Forecast API for ${locationName}`);
  console.log('-'.repeat(50));
  
  try {
    const url = `${BASE_URL}/forecast`;
    const params = {
      lat: location.lat,
      lon: location.lon,
      appid: config.apiKey,
      units: 'metric'
    };

    console.log('📡 API Request:');
    console.log(`   URL: ${url}`);
    console.log(`   Params:`, JSON.stringify(params, null, 2));
    
    const response = await axios.get(url, { params, timeout: 10000 });
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Forecast List Count:', response.data.list?.length || 0);
    
    if (response.data.list && response.data.list.length > 0) {
      console.log('\n📋 SAMPLE FORECAST ENTRY (First Entry):');
      console.log(JSON.stringify(response.data.list[0], null, 2));
      
      // Analyze forecast data structure
      console.log('\n🔍 FORECAST DATA ANALYSIS:');
      console.log('-'.repeat(30));
      
      const sampleEntry = response.data.list[0];
      
      console.log('Available forecast fields:');
      Object.keys(sampleEntry).forEach(field => {
        console.log(`   • ${field}: ${typeof sampleEntry[field]}`);
        if (typeof sampleEntry[field] === 'object' && sampleEntry[field] !== null) {
          Object.keys(sampleEntry[field]).forEach(subField => {
            console.log(`     - ${field}.${subField}: ${sampleEntry[field][subField]}`);
          });
        }
      });
      
      // Check for rain probability in forecast
      console.log('\n☔ RAIN PROBABILITY IN FORECAST:');
      if (sampleEntry.pop !== undefined) {
        console.log(`   ✅ Precipitation probability: ${(sampleEntry.pop * 100).toFixed(1)}%`);
      } else {
        console.log(`   ❌ No precipitation probability in forecast`);
      }
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Forecast API failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('   Response:', error.response?.data);
      console.error('   Status:', error.response?.status);
    }
    throw error;
  }
}

async function analyzeMKIDataAvailability(morrisonData, nederlandData, morrisonForecast, nederlandForecast) {
  console.log('\n🎯 MKI SYSTEM DATA AVAILABILITY ANALYSIS');
  console.log('='.repeat(60));
  
  console.log('\n📊 FACTOR-BY-FACTOR ANALYSIS:');
  console.log('-'.repeat(40));
  
  // Factor 1: Rain Probability (25% weight)
  console.log('1️⃣  Rain Probability (25% weight):');
  const rainAvailable = morrisonForecast?.list?.[0]?.pop !== undefined;
  console.log(`   Status: ${rainAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (rainAvailable) {
    console.log(`   Source: forecast.pop (precipitation probability)`);
    console.log(`   Sample: ${(morrisonForecast.list[0].pop * 100).toFixed(1)}%`);
  } else {
    console.log(`   Issue: No precipitation probability in API`);
  }
  
  // Factor 2: Clear Sky 2-5am (20% weight)
  console.log('\n2️⃣  Clear Sky 2-5am (20% weight):');
  const cloudsAvailable = morrisonData?.clouds?.all !== undefined;
  console.log(`   Status: ${cloudsAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (cloudsAvailable) {
    console.log(`   Source: clouds.all (cloud cover percentage)`);
    console.log(`   Sample: ${100 - morrisonData.clouds.all}% clear sky`);
  } else {
    console.log(`   Issue: No cloud cover data in API`);
  }
  
  // Factor 3: Pressure Change (20% weight)
  console.log('\n3️⃣  Pressure Change (20% weight):');
  const pressureAvailable = morrisonData?.main?.pressure !== undefined;
  console.log(`   Status: ${pressureAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (pressureAvailable) {
    console.log(`   Source: main.pressure (current pressure)`);
    console.log(`   Note: Need historical data to calculate change`);
    console.log(`   Morrison: ${morrisonData.main.pressure} hPa`);
    console.log(`   Nederland: ${nederlandData.main.pressure} hPa`);
  } else {
    console.log(`   Issue: No pressure data in API`);
  }
  
  // Factor 4: Temperature Difference (15% weight)
  console.log('\n4️⃣  Temperature Difference (15% weight):');
  const tempAvailable = morrisonData?.main?.temp !== undefined && nederlandData?.main?.temp !== undefined;
  console.log(`   Status: ${tempAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (tempAvailable) {
    console.log(`   Source: main.temp (current temperature)`);
    const tempDiff = nederlandData.main.temp - morrisonData.main.temp;
    const tempDiffF = tempDiff * 9/5;
    console.log(`   Morrison: ${morrisonData.main.temp}°C`);
    console.log(`   Nederland: ${nederlandData.main.temp}°C`);
    console.log(`   Difference: ${tempDiffF.toFixed(1)}°F`);
  } else {
    console.log(`   Issue: Temperature data missing`);
  }
  
  // Factor 5: Wave Pattern (15% weight) - CRITICAL CHECK
  console.log('\n5️⃣  Wave Pattern / Froude Number (15% weight):');
  console.log(`   Status: ❌ NOT AVAILABLE IN OPENWEATHER API`);
  console.log(`   Issue: Froude number requires:`);
  console.log(`     - Wind speed at different altitudes ❌`);
  console.log(`     - Atmospheric density profiles ❌`);
  console.log(`     - Brunt-Väisälä frequency ❌`);
  console.log(`     - Mountain wave analysis ❌`);
  console.log(`   Reality: OpenWeather only provides surface wind data`);
  
  // Factor 6: Atmospheric Stability (5% weight) - CRITICAL CHECK
  console.log('\n6️⃣  Atmospheric Stability (5% weight):');
  console.log(`   Status: ❌ NOT AVAILABLE IN OPENWEATHER API`);
  console.log(`   Issue: Atmospheric stability requires:`);
  console.log(`     - Temperature profiles at multiple altitudes ❌`);
  console.log(`     - Lapse rate calculations ❌`);
  console.log(`     - Richardson number ❌`);
  console.log(`     - Atmospheric soundings ❌`);
  console.log(`   Reality: OpenWeather only provides surface measurements`);
  
  console.log('\n🚨 CRITICAL FINDINGS:');
  console.log('='.repeat(40));
  console.log('✅ AVAILABLE: Rain probability, cloud cover, pressure, temperature');
  console.log('❌ NOT AVAILABLE: Wave patterns, Froude numbers, atmospheric stability');
  console.log('');
  console.log('🎯 RECOMMENDATION:');
  console.log('   The current 6-factor MKI system claims to use data that');
  console.log('   DOES NOT EXIST in the OpenWeatherMap API.');
  console.log('');
  console.log('   Options:');
  console.log('   1. Revert to realistic 4-factor system using available data');
  console.log('   2. Use calculated approximations (clearly labeled as estimates)');
  console.log('   3. Find specialized meteorological APIs with upper-air data');
  console.log('');
  console.log('📝 SUGGESTED REALISTIC FACTORS:');
  console.log('   1. Rain Probability (25%) - ✅ Available');
  console.log('   2. Clear Sky (25%) - ✅ Available');
  console.log('   3. Pressure Change (25%) - ✅ Available (with history)');
  console.log('   4. Temperature Difference (25%) - ✅ Available');
  console.log('   Total: 100% - All factors use real API data');
}

async function main() {
  console.log('🔍 OPENWEATHERMAP API DATA VERIFICATION');
  console.log('='.repeat(60));
  console.log('Purpose: Verify if MKI 6-factor system uses real API data');
  console.log('');
  
  const config = getOpenWeatherConfig();
  console.log('✅ Loaded OpenWeatherMap API key');
  
  try {
    // Test current weather for both locations
    const morrisonData = await debugCurrentWeatherAPI(config, LOCATIONS.morrison, LOCATIONS.morrison.name);
    const nederlandData = await debugCurrentWeatherAPI(config, LOCATIONS.nederland, LOCATIONS.nederland.name);
    
    // Test forecast API
    const morrisonForecast = await debugForecastAPI(config, LOCATIONS.morrison, LOCATIONS.morrison.name);
    const nederlandForecast = await debugForecastAPI(config, LOCATIONS.nederland, LOCATIONS.nederland.name);
    
    // Analyze what MKI factors are actually available
    await analyzeMKIDataAvailability(morrisonData, nederlandData, morrisonForecast, nederlandForecast);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n🔑 API KEY ISSUE:');
      console.log('   Your OpenWeatherMap API key may be invalid or expired');
      console.log('   Check your .env file and verify the key at openweathermap.org');
    } else if (error.message.includes('403')) {
      console.log('\n🚫 API ACCESS ISSUE:');
      console.log('   Your API key may not have access to required endpoints');
      console.log('   Some features require a paid subscription');
    }
  }
}

// Run the script
main().catch(console.error);
