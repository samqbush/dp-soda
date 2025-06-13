#!/usr/bin/env node

/**
 * Enhanced NOAA Data Verification Script
 * Deep-dive into actual data values, not just parameter availability
 * 
 * PURPOSE: Verify if NOAA parameters actually contain usable data
 * - Fetch real values from time series
 * - Check data quality and completeness  
 * - Resolve discrepancies from previous debug script
 */

import axios from 'axios';

const BASE_URL = 'https://api.weather.gov';
const USER_AGENT = 'DawnPatrolAlarm/1.0 (contact@dawnpatrolalarm.com)';

// Our target locations
const LOCATIONS = {
  morrison: { lat: 39.6547, lon: -105.1956, name: 'Morrison, CO' },
  nederland: { lat: 40.0142, lon: -105.5108, name: 'Nederland, CO' }
};

// Key parameters we need to verify
const MKI_PARAMETERS = {
  'probabilityOfPrecipitation': 'Rain Probability',
  'skyCover': 'Sky Cover (Clear Sky)',
  'pressure': 'Atmospheric Pressure', 
  'temperature': 'Temperature',
  'transportWindSpeed': 'Transport Wind Speed',
  'transportWindDirection': 'Transport Wind Direction',
  'mixingHeight': 'Mixing Layer Height',
  'atmosphericDispersionIndex': 'Atmospheric Dispersion Index',
  'davisStabilityIndex': 'Davis Stability Index',
  'stability': 'Atmospheric Stability',
  'windSpeed': 'Surface Wind Speed',
  'windDirection': 'Surface Wind Direction'
};

async function getGridInfo(location) {
  const url = `${BASE_URL}/points/${location.lat},${location.lon}`;
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 10000
  });
  
  return {
    office: response.data.properties.cwa,
    gridX: response.data.properties.gridX,
    gridY: response.data.properties.gridY,
    gridDataUrl: response.data.properties.forecastGridData
  };
}

async function analyzeParameterData(gridDataUrl, locationName) {
  console.log(`🔍 DEEP DATA ANALYSIS: ${locationName}`);
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(gridDataUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    
    const properties = response.data.properties;
    
    console.log(`📊 Grid Data Retrieved: ${Object.keys(properties).length} parameters`);
    console.log(`🕒 Update Time: ${properties.updateTime}`);
    console.log(`⏰ Valid Times: ${properties.validTimes}`);
    console.log('');
    
    // Analyze each MKI parameter in detail
    for (const [paramKey, paramName] of Object.entries(MKI_PARAMETERS)) {
      console.log(`📈 PARAMETER: ${paramName} (${paramKey})`);
      console.log('-'.repeat(50));
      
      if (properties[paramKey]) {
        const paramData = properties[paramKey];
        
        console.log(`   ✅ Parameter exists`);
        console.log(`   📏 Unit of Measure: ${paramData.uom || 'N/A'}`);
        console.log(`   📊 Values array length: ${paramData.values ? paramData.values.length : 0}`);
        
        if (paramData.values && paramData.values.length > 0) {
          // Show first few values with timestamps
          console.log(`   📋 Sample Data (first 3 entries):`);
          
          for (let i = 0; i < Math.min(3, paramData.values.length); i++) {
            const entry = paramData.values[i];
            const timestamp = new Date(entry.validTime.split('/')[0]).toLocaleString();
            console.log(`      ${i+1}. ${timestamp}: ${entry.value} ${paramData.uom || ''}`);
          }
          
          // Analyze data quality
          const nonNullValues = paramData.values.filter(v => v.value !== null && v.value !== undefined);
          const nullValues = paramData.values.length - nonNullValues.length;
          
          console.log(`   📊 Data Quality:`);
          console.log(`      Total entries: ${paramData.values.length}`);
          console.log(`      Non-null values: ${nonNullValues.length}`);
          console.log(`      Null/missing values: ${nullValues}`);
          console.log(`      Data completeness: ${((nonNullValues.length / paramData.values.length) * 100).toFixed(1)}%`);
          
          if (nonNullValues.length > 0) {
            const values = nonNullValues.map(v => parseFloat(v.value)).filter(v => !isNaN(v));
            if (values.length > 0) {
              const min = Math.min(...values);
              const max = Math.max(...values);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              
              console.log(`   📊 Value Statistics:`);
              console.log(`      Min: ${min.toFixed(2)} ${paramData.uom || ''}`);
              console.log(`      Max: ${max.toFixed(2)} ${paramData.uom || ''}`);
              console.log(`      Average: ${avg.toFixed(2)} ${paramData.uom || ''}`);
            }
          }
          
          // Check time coverage
          if (paramData.values.length >= 2) {
            const firstTime = new Date(paramData.values[0].validTime.split('/')[0]);
            const lastTime = new Date(paramData.values[paramData.values.length - 1].validTime.split('/')[0]);
            const coverageHours = (lastTime - firstTime) / (1000 * 60 * 60);
            
            console.log(`   ⏰ Time Coverage:`);
            console.log(`      Start: ${firstTime.toLocaleString()}`);
            console.log(`      End: ${lastTime.toLocaleString()}`);
            console.log(`      Coverage: ${coverageHours.toFixed(1)} hours`);
          }
          
          console.log(`   🎯 MKI USABILITY: ✅ EXCELLENT - Real data available`);
          
        } else {
          console.log(`   ❌ No values array or empty values`);
          console.log(`   🎯 MKI USABILITY: ❌ UNUSABLE - No actual data`);
        }
        
      } else {
        console.log(`   ❌ Parameter does not exist in grid data`);
        console.log(`   🎯 MKI USABILITY: ❌ UNAVAILABLE`);
      }
      
      console.log('');
    }
    
    return properties;
    
  } catch (error) {
    console.error(`❌ Failed to analyze ${locationName}:`, error.message);
    return null;
  }
}

async function compareParameterAvailability(morrisonData, nederlandData) {
  console.log('\n🔄 CROSS-LOCATION PARAMETER COMPARISON');
  console.log('='.repeat(60));
  
  for (const [paramKey, paramName] of Object.entries(MKI_PARAMETERS)) {
    console.log(`📊 ${paramName}:`);
    
    const morrisonHasData = morrisonData?.[paramKey]?.values?.length > 0;
    const nederlandHasData = nederlandData?.[paramKey]?.values?.length > 0;
    
    console.log(`   Morrison: ${morrisonHasData ? '✅ Has Data' : '❌ No Data'}`);
    console.log(`   Nederland: ${nederlandHasData ? '✅ Has Data' : '❌ No Data'}`);
    
    if (morrisonHasData && nederlandHasData) {
      console.log(`   🎯 MKI Factor Status: ✅ AVAILABLE FOR BOTH LOCATIONS`);
      
      // Compare current values if available
      const morrisonCurrent = morrisonData[paramKey].values[0]?.value;
      const nederlandCurrent = nederlandData[paramKey].values[0]?.value;
      
      if (morrisonCurrent !== null && nederlandCurrent !== null) {
        console.log(`   📊 Current Values:`);
        console.log(`      Morrison: ${morrisonCurrent} ${morrisonData[paramKey].uom || ''}`);
        console.log(`      Nederland: ${nederlandCurrent} ${nederlandData[paramKey].uom || ''}`);
        
        if (paramKey === 'temperature') {
          const tempDiff = parseFloat(nederlandCurrent) - parseFloat(morrisonCurrent);
          const tempDiffF = tempDiff * 9/5;
          console.log(`      Temperature Difference: ${tempDiffF.toFixed(1)}°F`);
        }
      }
    } else if (morrisonHasData || nederlandHasData) {
      console.log(`   🟡 MKI Factor Status: PARTIAL - Only one location has data`);
    } else {
      console.log(`   ❌ MKI Factor Status: UNAVAILABLE - No data at either location`);
    }
    
    console.log('');
  }
}

async function generateMKIFactorReport(morrisonData, nederlandData) {
  console.log('\n🎯 FINAL MKI FACTOR AVAILABILITY REPORT');
  console.log('='.repeat(60));
  
  const factorAnalysis = {
    'Rain Probability': {
      param: 'probabilityOfPrecipitation',
      weight: '25%',
      available: false,
      quality: 'unknown'
    },
    'Clear Sky Conditions': {
      param: 'skyCover', 
      weight: '20%',
      available: false,
      quality: 'unknown'
    },
    'Pressure Change': {
      param: 'pressure',
      weight: '20%', 
      available: false,
      quality: 'unknown'
    },
    'Temperature Difference': {
      param: 'temperature',
      weight: '15%',
      available: false,
      quality: 'unknown'
    },
    'Wave Pattern Analysis': {
      param: ['transportWindSpeed', 'mixingHeight'],
      weight: '15%',
      available: false,
      quality: 'unknown'
    },
    'Atmospheric Stability': {
      param: ['atmosphericDispersionIndex', 'davisStabilityIndex', 'stability'],
      weight: '5%',
      available: false,
      quality: 'unknown'
    }
  };
  
  // Analyze each factor
  for (const [factorName, factorInfo] of Object.entries(factorAnalysis)) {
    console.log(`📊 ${factorName} (${factorInfo.weight} weight):`);
    
    const params = Array.isArray(factorInfo.param) ? factorInfo.param : [factorInfo.param];
    let availableParams = 0;
    let totalDataPoints = 0;
    
    for (const param of params) {
      const morrisonHasData = morrisonData?.[param]?.values?.length > 0;
      const nederlandHasData = nederlandData?.[param]?.values?.length > 0;
      
      if (morrisonHasData && nederlandHasData) {
        availableParams++;
        
        const morrisonValues = morrisonData[param].values.filter(v => v.value !== null).length;
        const nederlandValues = nederlandData[param].values.filter(v => v.value !== null).length;
        totalDataPoints += morrisonValues + nederlandValues;
        
        console.log(`   ✅ ${param}: Available (${morrisonValues + nederlandValues} data points)`);
      } else {
        console.log(`   ❌ ${param}: Not available`);
      }
    }
    
    // Determine factor status
    if (availableParams === params.length) {
      factorInfo.available = true;
      factorInfo.quality = totalDataPoints > 20 ? 'excellent' : 'good';
      console.log(`   🎯 Factor Status: ✅ FULLY AVAILABLE (${factorInfo.quality} quality)`);
    } else if (availableParams > 0) {
      factorInfo.available = true;
      factorInfo.quality = 'partial';
      console.log(`   🟡 Factor Status: PARTIALLY AVAILABLE (${availableParams}/${params.length} parameters)`);
    } else {
      console.log(`   ❌ Factor Status: UNAVAILABLE`);
    }
    
    console.log('');
  }
  
  // Generate final recommendation
  const availableFactors = Object.values(factorAnalysis).filter(f => f.available).length;
  const totalFactors = Object.keys(factorAnalysis).length;
  
  console.log('🚨 FINAL ASSESSMENT:');
  console.log('='.repeat(40));
  console.log(`✅ Available Factors: ${availableFactors}/${totalFactors}`);
  console.log(`📊 System Completeness: ${((availableFactors / totalFactors) * 100).toFixed(1)}%`);
  
  if (availableFactors >= 5) {
    console.log('🎯 RECOMMENDATION: ✅ NOAA CAN SUPPORT 6-FACTOR MKI SYSTEM');
    console.log('   Proceed with NOAA implementation');
  } else if (availableFactors >= 4) {
    console.log('🎯 RECOMMENDATION: 🟡 HYBRID APPROACH RECOMMENDED');
    console.log('   Use NOAA for available factors, calculate estimates for missing ones');
  } else {
    console.log('🎯 RECOMMENDATION: ❌ REVERT TO 4-FACTOR SYSTEM');
    console.log('   NOAA data insufficient for 6-factor MKI claims');
  }
}

async function main() {
  console.log('🔬 NOAA DATA VERIFICATION - DEEP DIVE');
  console.log('='.repeat(70));
  console.log('Purpose: Verify actual data availability vs. parameter listings');
  console.log('Resolving discrepancies from previous debug analysis');
  console.log('');
  
  try {
    // Get grid information for both locations
    console.log('📍 Getting NOAA grid coordinates...');
    const morrisonGrid = await getGridInfo(LOCATIONS.morrison);
    const nederlandGrid = await getGridInfo(LOCATIONS.nederland);
    
    console.log(`✅ Morrison Grid: ${morrisonGrid.office}/${morrisonGrid.gridX},${morrisonGrid.gridY}`);
    console.log(`✅ Nederland Grid: ${nederlandGrid.office}/${nederlandGrid.gridX},${nederlandGrid.gridY}`);
    console.log('');
    
    // Deep analysis of actual data values
    const morrisonData = await analyzeParameterData(morrisonGrid.gridDataUrl, LOCATIONS.morrison.name);
    const nederlandData = await analyzeParameterData(nederlandGrid.gridDataUrl, LOCATIONS.nederland.name);
    
    // Compare between locations  
    await compareParameterAvailability(morrisonData, nederlandData);
    
    // Generate final MKI factor report
    await generateMKIFactorReport(morrisonData, nederlandData);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    
    if (error.response?.status === 503) {
      console.log('\n⚠️  NOAA API SERVICE UNAVAILABLE');
      console.log('   This is a temporary server issue, not a data availability problem');
      console.log('   Try again in a few minutes');
    }
  }
}

// Run the verification
main().catch(console.error);
