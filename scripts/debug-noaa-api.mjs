#!/usr/bin/env node

/**
 * Debug script to investigate NOAA Weather API (weather.gov) capabilities
 * Focus: Upper-air data, atmospheric soundings, and stability indices for MKI analysis
 * 
 * GOAL: Determine if NOAA can provide the missing factors:
 * - Wave Pattern analysis (Froude numbers, upper-air winds)
 * - Atmospheric Stability (soundings, lapse rates, stability indices)
 */

import axios from 'axios';

// NOAA API Configuration
const BASE_URL = 'https://api.weather.gov';
const USER_AGENT = 'DawnPatrolAlarm/1.0 (contact@dawnpatrolalarm.com)'; // NOAA requires User-Agent

// Location coordinates for our MKI analysis
const LOCATIONS = {
  morrison: { lat: 39.6547, lon: -105.1956, name: 'Morrison, CO (Valley - 1740m)' },
  nederland: { lat: 40.0142, lon: -105.5108, name: 'Nederland, CO (Mountain - 2540m)' }
};

// Known radiosonde stations in Colorado area
const RADIOSONDE_STATIONS = [
  { id: 'DNR', name: 'Denver, CO', lat: 39.7817, lon: -104.8509 },
  { id: 'GJT', name: 'Grand Junction, CO', lat: 39.1219, lon: -108.5267 },
  { id: 'ABQ', name: 'Albuquerque, NM', lat: 35.0389, lon: -106.6056 },
  { id: 'DDC', name: 'Dodge City, KS', lat: 37.7581, lon: -99.9736 }
];

async function debugNOAAGridPoint(location, locationName) {
  console.log(`🎯 Testing NOAA Grid Point API for ${locationName}`);
  console.log('-'.repeat(60));
  
  try {
    const url = `${BASE_URL}/points/${location.lat},${location.lon}`;
    
    console.log('📡 API Request:');
    console.log(`   URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Grid Point Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Extract grid information
    const properties = response.data.properties;
    if (properties) {
      console.log('\n🏷️  GRID INFORMATION:');
      console.log(`   Office: ${properties.cwa}`);
      console.log(`   Grid X: ${properties.gridX}`);
      console.log(`   Grid Y: ${properties.gridY}`);
      console.log(`   Forecast URL: ${properties.forecast}`);
      console.log(`   Hourly Forecast URL: ${properties.forecastHourly}`);
      console.log(`   Forecast Grid Data URL: ${properties.forecastGridData}`);
      
      return {
        office: properties.cwa,
        gridX: properties.gridX,
        gridY: properties.gridY,
        forecastUrl: properties.forecast,
        gridDataUrl: properties.forecastGridData
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ NOAA Grid Point API failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('   Status:', error.response?.status);
      console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
    }
    throw error;
  }
}

async function debugNOAAGridData(gridInfo, locationName) {
  console.log(`\n🌡️  Testing NOAA Grid Data API for ${locationName}`);
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.get(gridInfo.gridDataUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Available Grid Data Parameters:');
    
    const properties = response.data.properties;
    if (properties) {
      Object.keys(properties).forEach(param => {
        if (typeof properties[param] === 'object' && properties[param] !== null) {
          console.log(`   ✅ ${param}: Available`);
          
          // Show sample data for key parameters
          if (['temperature', 'pressure', 'windSpeed', 'windDirection', 'relativeHumidity'].includes(param)) {
            const values = properties[param].values;
            if (values && values.length > 0) {
              console.log(`      Sample: ${values[0].value} ${properties[param].uom || ''}`);
            }
          }
        } else {
          console.log(`   • ${param}: ${typeof properties[param]}`);
        }
      });
      
      // Check for specific MKI-relevant parameters
      console.log('\n🎯 MKI-RELEVANT PARAMETERS:');
      console.log('-'.repeat(30));
      
      const mkiParams = {
        'temperature': 'Temperature profiles',
        'windSpeed': 'Wind speed at surface',
        'windDirection': 'Wind direction',
        'pressure': 'Atmospheric pressure',
        'relativeHumidity': 'Humidity',
        'dewpoint': 'Dew point temperature',
        'skyCover': 'Sky cover/cloud cover',
        'precipitationProbability': 'Precipitation probability',
        'atmosphericDispersionIndex': 'Atmospheric stability indicator',
        'mixingHeight': 'Mixing layer height',
        'transportWindSpeed': 'Transport wind speed',
        'transportWindDirection': 'Transport wind direction',
        'ventilationRate': 'Ventilation rate'
      };
      
      Object.entries(mkiParams).forEach(([param, description]) => {
        if (properties[param]) {
          console.log(`   ✅ ${param}: ${description}`);
        } else {
          console.log(`   ❌ ${param}: ${description} - NOT AVAILABLE`);
        }
      });
    }
    
    return properties;
    
  } catch (error) {
    console.error('❌ NOAA Grid Data API failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('   Status:', error.response?.status);
      if (error.response?.status === 500) {
        console.log('   Note: NOAA grid data endpoints can be unreliable');
      }
    }
    return null;
  }
}

async function debugRadiosondeStations() {
  console.log('\n🎈 Testing Radiosonde Station APIs (Upper-Air Data)');
  console.log('-'.repeat(60));
  
  for (const station of RADIOSONDE_STATIONS) {
    console.log(`\n📍 Testing ${station.name} (${station.id})`);
    
    try {
      // Test station metadata
      const stationUrl = `${BASE_URL}/stations/${station.id}`;
      console.log(`   Station URL: ${stationUrl}`);
      
      const stationResponse = await axios.get(stationUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      });
      
      console.log(`   ✅ Station exists: ${stationResponse.status}`);
      
      // Test latest observations
      const obsUrl = `${BASE_URL}/stations/${station.id}/observations/latest`;
      console.log(`   Observations URL: ${obsUrl}`);
      
      const obsResponse = await axios.get(obsUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      });
      
      if (obsResponse.data.properties) {
        const obs = obsResponse.data.properties;
        console.log(`   ✅ Latest observation available`);
        console.log(`   Time: ${obs.timestamp}`);
        
        // Check for upper-air specific data
        const upperAirParams = [
          'temperature', 'dewpoint', 'windDirection', 'windSpeed', 
          'barometricPressure', 'visibility', 'cloudLayers'
        ];
        
        upperAirParams.forEach(param => {
          if (obs[param] !== null && obs[param] !== undefined) {
            console.log(`   ✅ ${param}: ${JSON.stringify(obs[param])}`);
          }
        });
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ❌ Station ${station.id} not found or no data`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
}

async function investigateUpperAirProducts() {
  console.log('\n🌬️  Investigating NOAA Upper-Air Products');
  console.log('-'.repeat(60));
  
  // Try to find upper-air products and soundings
  const upperAirEndpoints = [
    '/products/types',
    '/products',
    '/glossary'
  ];
  
  for (const endpoint of upperAirEndpoints) {
    try {
      console.log(`\n📡 Testing: ${BASE_URL}${endpoint}`);
      
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      });
      
      console.log(`✅ Status: ${response.status}`);
      
      if (endpoint === '/products/types') {
        console.log('🔍 Searching for upper-air product types...');
        const productTypes = response.data['@graph'] || response.data;
        
        if (Array.isArray(productTypes)) {
          const upperAirTypes = productTypes.filter(type => {
            const name = (type.name || '').toLowerCase();
            return name.includes('upper') || name.includes('sounding') || 
                   name.includes('radiosonde') || name.includes('stability');
          });
          
          if (upperAirTypes.length > 0) {
            console.log('✅ Found upper-air product types:');
            upperAirTypes.forEach(type => {
              console.log(`   • ${type.name}: ${type.description || 'No description'}`);
            });
          } else {
            console.log('❌ No upper-air product types found');
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} failed: ${error.message}`);
    }
  }
}

async function analyzeMKIDataAvailabilityNOAA(morrisonGrid, nederlandGrid) {
  console.log('\n🎯 NOAA MKI SYSTEM DATA AVAILABILITY ANALYSIS');
  console.log('='.repeat(70));
  
  console.log('\n📊 FACTOR-BY-FACTOR ANALYSIS (NOAA API):');
  console.log('-'.repeat(50));
  
  // Factor 1: Rain Probability
  console.log('1️⃣  Rain Probability (25% weight):');
  const precipAvailable = morrisonGrid?.precipitationProbability !== undefined;
  console.log(`   Status: ${precipAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (precipAvailable) {
    console.log(`   Source: NOAA gridData.precipitationProbability`);
  }
  
  // Factor 2: Clear Sky
  console.log('\n2️⃣  Clear Sky Conditions (20% weight):');
  const skyAvailable = morrisonGrid?.skyCover !== undefined;
  console.log(`   Status: ${skyAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (skyAvailable) {
    console.log(`   Source: NOAA gridData.skyCover`);
  }
  
  // Factor 3: Pressure Change
  console.log('\n3️⃣  Pressure Change (20% weight):');
  const pressureAvailable = morrisonGrid?.pressure !== undefined;
  console.log(`   Status: ${pressureAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (pressureAvailable) {
    console.log(`   Source: NOAA gridData.pressure`);
    console.log(`   Note: Time series data available for trend analysis`);
  }
  
  // Factor 4: Temperature Difference
  console.log('\n4️⃣  Temperature Difference (15% weight):');
  const tempAvailable = morrisonGrid?.temperature !== undefined && nederlandGrid?.temperature !== undefined;
  console.log(`   Status: ${tempAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
  if (tempAvailable) {
    console.log(`   Source: NOAA gridData.temperature for both locations`);
  }
  
  // Factor 5: Wave Pattern (CRITICAL - Check NOAA capabilities)
  console.log('\n5️⃣  Wave Pattern / Upper-Air Analysis (15% weight):');
  const transportWindAvailable = morrisonGrid?.transportWindSpeed !== undefined;
  const mixingHeightAvailable = morrisonGrid?.mixingHeight !== undefined;
  
  if (transportWindAvailable || mixingHeightAvailable) {
    console.log(`   Status: 🟡 PARTIALLY AVAILABLE`);
    console.log(`   Available data:`);
    if (transportWindAvailable) console.log(`     ✅ Transport wind speed/direction`);
    if (mixingHeightAvailable) console.log(`     ✅ Mixing layer height`);
    console.log(`   Missing for full Froude analysis:`);
    console.log(`     ❌ Multi-level wind profiles`);
    console.log(`     ❌ Brunt-Väisälä frequency`);
    console.log(`     ❌ Direct mountain wave detection`);
    console.log(`   Potential: Calculate approximate Froude number from transport winds`);
  } else {
    console.log(`   Status: ❌ LIMITED DATA`);
    console.log(`   Issue: No upper-air wind data in grid endpoints`);
  }
  
  // Factor 6: Atmospheric Stability (CRITICAL - Check NOAA capabilities)
  console.log('\n6️⃣  Atmospheric Stability (5% weight):');
  const stabilityAvailable = morrisonGrid?.atmosphericDispersionIndex !== undefined;
  const ventilationAvailable = morrisonGrid?.ventilationRate !== undefined;
  
  if (stabilityAvailable || ventilationAvailable) {
    console.log(`   Status: 🟡 AVAILABLE (Stability Indices)`);
    console.log(`   Available data:`);
    if (stabilityAvailable) console.log(`     ✅ Atmospheric Dispersion Index`);
    if (ventilationAvailable) console.log(`     ✅ Ventilation Rate`);
    console.log(`   Note: These are calculated stability indicators, not raw soundings`);
  } else {
    console.log(`   Status: ❌ NOT AVAILABLE IN GRID DATA`);
    console.log(`   Alternative: Radiosonde stations may provide atmospheric profiles`);
  }
  
  console.log('\n🔬 ADVANCED NOAA CAPABILITIES ASSESSMENT:');
  console.log('-'.repeat(50));
  
  const advancedParams = [
    'mixingHeight', 'transportWindSpeed', 'transportWindDirection',
    'ventilationRate', 'atmosphericDispersionIndex'
  ];
  
  let advancedCount = 0;
  advancedParams.forEach(param => {
    if (morrisonGrid?.[param] !== undefined) {
      console.log(`   ✅ ${param}: Available`);
      advancedCount++;
    } else {
      console.log(`   ❌ ${param}: Not available`);
    }
  });
  
  console.log(`\n📈 ADVANCED DATA SCORE: ${advancedCount}/${advancedParams.length} parameters available`);
  
  console.log('\n🚨 NOAA API FINDINGS:');
  console.log('='.repeat(40));
  
  if (advancedCount >= 3) {
    console.log('✅ NOAA provides MORE advanced meteorological data than OpenWeather');
    console.log('✅ Mixing height and transport winds enable better wave analysis');
    console.log('✅ Atmospheric dispersion indices provide stability information');
    console.log('');
    console.log('🎯 RECOMMENDATION:');
    console.log('   NOAA API can support a legitimate 6-factor MKI system!');
    console.log('   Use NOAA as primary data source with OpenWeather as backup');
  } else {
    console.log('🟡 NOAA provides SOME advanced data but may not be complete');
    console.log('🟡 Consider hybrid approach: NOAA + calculated approximations');
  }
  
  console.log('\n💡 IMPLEMENTATION STRATEGY:');
  console.log('-'.repeat(30));
  console.log('1. Use NOAA grid data for enhanced meteorological parameters');
  console.log('2. Fall back to OpenWeather for basic weather if NOAA fails');
  console.log('3. Calculate Froude approximations using NOAA transport winds');
  console.log('4. Use NOAA stability indices instead of full atmospheric soundings');
  console.log('5. Clearly label which factors use measured vs. calculated data');
}

async function main() {
  console.log('🌪️  NOAA WEATHER API INVESTIGATION FOR MKI SYSTEM');
  console.log('='.repeat(70));
  console.log('Purpose: Determine if NOAA can provide advanced meteorological data');
  console.log('         for legitimate 6-factor Mountain Wave-Katabatic Interaction analysis');
  console.log('');
  
  try {
    // Step 1: Get grid points for both locations
    console.log('📍 STEP 1: Getting NOAA grid points for both locations');
    console.log('='.repeat(50));
    
    const morrisonGrid = await debugNOAAGridPoint(LOCATIONS.morrison, LOCATIONS.morrison.name);
    const nederlandGrid = await debugNOAAGridPoint(LOCATIONS.nederland, LOCATIONS.nederland.name);
    
    // Step 2: Get detailed grid data
    console.log('\n📊 STEP 2: Analyzing detailed grid data');
    console.log('='.repeat(50));
    
    let morrisonGridData = null;
    let nederlandGridData = null;
    
    if (morrisonGrid) {
      morrisonGridData = await debugNOAAGridData(morrisonGrid, LOCATIONS.morrison.name);
    }
    
    if (nederlandGrid) {
      nederlandGridData = await debugNOAAGridData(nederlandGrid, LOCATIONS.nederland.name);
    }
    
    // Step 3: Investigate upper-air data
    console.log('\n🎈 STEP 3: Investigating upper-air data sources');
    console.log('='.repeat(50));
    
    await debugRadiosondeStations();
    await investigateUpperAirProducts();
    
    // Step 4: Final MKI analysis
    await analyzeMKIDataAvailabilityNOAA(morrisonGridData, nederlandGridData);
    
  } catch (error) {
    console.error('\n❌ Investigation failed:', error.message);
    
    if (error.message.includes('403') || error.message.includes('User-Agent')) {
      console.log('\n🚫 USER-AGENT ISSUE:');
      console.log('   NOAA requires a proper User-Agent header');
      console.log('   Current User-Agent:', USER_AGENT);
      console.log('   Make sure to use a descriptive User-Agent in production');
    }
  }
}

// Run the investigation
main().catch(console.error);
