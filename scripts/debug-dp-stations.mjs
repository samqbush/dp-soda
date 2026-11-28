#!/usr/bin/env node

/**
 * Debug script to check what data is being returned from DP weather stations
 * This helps diagnose when stations are not reporting or have stale data
 */

import axios from 'axios';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: join(__dirname, '..', '.env') });

// Ecowitt API configuration from environment variables
const ECOWITT_CONFIG = {
  applicationKey: process.env.ECOWITT_APPLICATION_KEY,
  apiKey: process.env.ECOWITT_API_KEY
};

// Device MAC addresses - these need to be determined from the device list API
// We'll fetch them dynamically
const DEVICE_NAMES = [
  'DP Soda Lakes',
  'DP Standley West'
];

const BASE_URL = 'https://api.ecowitt.net/api/v3';

/**
 * Format date for Ecowitt API
 */
function formatEcowittDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Check device list to get MAC addresses for DP devices
 */
async function getDeviceList() {
  console.log('\n🌐 Fetching device list...');
  console.log('─'.repeat(50));
  
  try {
    const params = {
      application_key: ECOWITT_CONFIG.applicationKey,
      api_key: ECOWITT_CONFIG.apiKey,
    };

    const response = await axios.get(`${BASE_URL}/device/list`, {
      params,
      timeout: 10000,
    });

    if (response.data.code !== 0) {
      throw new Error(`Device list API error: ${response.data.msg}`);
    }

    const devices = response.data.data?.list || [];
    console.log(`📱 Found ${devices.length} total devices`);
    
    // Find DP devices
    const dpDevices = {};
    devices.forEach((device) => {
      if (DEVICE_NAMES.some(name => device.name.includes('DP') || name.includes(device.name))) {
        dpDevices[device.name] = {
          name: device.name,
          mac: device.mac,
          type: device.stationtype,
          created: new Date(device.createtime * 1000).toLocaleDateString(),
          latitude: device.latitude,
          longitude: device.longitude
        };
        console.log(`✅ Found DP device: ${device.name} (MAC: ${device.mac})`);
      }
    });

    if (Object.keys(dpDevices).length === 0) {
      console.warn('⚠️  No DP devices found in device list');
      console.log('📋 All devices:');
      devices.forEach((device, index) => {
        console.log(`   ${index + 1}. ${device.name} (MAC: ${device.mac})`);
      });
    }

    return dpDevices;

  } catch (error) {
    console.error('❌ Error fetching device list:', error.message);
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
    }
    throw error;
  }
}

/**
 * Check device status and recent data
 */
async function checkDeviceData(deviceInfo) {
  console.log(`\n🔍 Checking ${deviceInfo.name}...`);
  console.log('─'.repeat(50));
  
  try {
    console.log(`🏷️  Device: ${deviceInfo.name}`);
    console.log(`📍 MAC Address: ${deviceInfo.mac}`);
    console.log(`🗺️  Location: ${deviceInfo.latitude}, ${deviceInfo.longitude}`);
    console.log(`📅 Created: ${deviceInfo.created}`);

    // Set up date range (today)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const params = {
      application_key: ECOWITT_CONFIG.applicationKey,
      api_key: ECOWITT_CONFIG.apiKey,
      mac: deviceInfo.mac,
      start_date: formatEcowittDate(startOfDay),
      end_date: formatEcowittDate(endOfDay),
      cycle_type: '5min',
      temp_unitid: '1', // Celsius (1 = Celsius, 2 = Fahrenheit)
      pressure_unitid: '3', // hPa (3 = hPa, 4 = inHg, 5 = mmHg)
      wind_speed_unitid: '9', // mph (6 = m/s, 7 = km/h, 8 = knots, 9 = mph)
      call_back: 'wind',
    };

    console.log(`📅 Query Range: ${formatEcowittDate(startOfDay)} to ${formatEcowittDate(endOfDay)}`);
    console.log('🌐 Making API request...');

    const response = await axios.get(`${BASE_URL}/device/history`, {
      params,
      timeout: 15000,
    });

    if (response.data.code !== 0) {
      console.error(`❌ API Error: ${response.data.msg}`);
      return;
    }

    // Analyze the response
    const windData = response.data.data?.wind;
    if (!windData || !windData.wind_speed?.list) {
      console.error('❌ No wind data in response');
      console.log('📋 Raw response structure:', JSON.stringify(Object.keys(response.data.data || {})));
      return;
    }

    const timestamps = Object.keys(windData.wind_speed.list);
    console.log(`📊 Total data points: ${timestamps.length}`);

    if (timestamps.length === 0) {
      console.warn('⚠️  No data points returned - station may be offline');
      return;
    }

    // Analyze data freshness
    const sortedTimestamps = timestamps.map(t => parseInt(t)).sort((a, b) => b - a);
    const latestTimestamp = sortedTimestamps[0];
    const oldestTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
    
    const latestDate = new Date(latestTimestamp * 1000);
    const oldestDate = new Date(oldestTimestamp * 1000);
    
    console.log(`📈 Data Range:`);
    console.log(`   Oldest: ${oldestDate.toLocaleString()}`);
    console.log(`   Latest: ${latestDate.toLocaleString()}`);
    
    // Check freshness
    const minutesAgo = Math.floor((now.getTime() - latestDate.getTime()) / 60000);
    const hoursAgo = Math.floor(minutesAgo / 60);
    
    console.log(`🕒 Data Freshness:`);
    if (minutesAgo < 30) {
      console.log(`   ✅ Current (${minutesAgo} minutes ago)`);
    } else if (minutesAgo < 120) {
      console.log(`   ⚠️  Somewhat stale (${minutesAgo} minutes ago)`);
    } else {
      console.log(`   ❌ Very stale (${hoursAgo} hours ago) - Station likely offline`);
    }

    // Show recent data samples
    console.log(`📋 Recent Data Samples (mph):`);
    const recentTimestamps = sortedTimestamps.slice(0, 5);
    recentTimestamps.forEach((timestamp, index) => {
      const date = new Date(timestamp * 1000);
      const speed = windData.wind_speed.list[timestamp.toString()];
      const direction = windData.wind_direction.list[timestamp.toString()];
      const gust = windData.wind_gust?.list?.[timestamp.toString()] || speed;

      // Values are already mph because we requested wind_speed_unitid: '9'
      const speedMph = parseFloat(speed || '0').toFixed(1);
      const gustMph = parseFloat(gust || '0').toFixed(1);

      console.log(`   ${index + 1}. ${date.toLocaleTimeString()} - Speed: ${speedMph} mph, Dir: ${direction}°, Gust: ${gustMph} mph`);
    });

    // Data quality analysis
    const validDataPoints = timestamps.filter(t => {
      const speed = parseFloat(windData.wind_speed.list[t] || '0');
      return !isNaN(speed) && speed >= 0;
    });

    console.log(`📊 Data Quality:`);
    console.log(`   Valid points: ${validDataPoints.length}/${timestamps.length} (${Math.round(validDataPoints.length/timestamps.length*100)}%)`);
    
    // Check for data gaps
    const sortedValidTimestamps = validDataPoints.map(t => parseInt(t)).sort((a, b) => a - b);
    let gaps = 0;
    let maxGap = 0;
    for (let i = 1; i < sortedValidTimestamps.length; i++) {
      const gap = sortedValidTimestamps[i] - sortedValidTimestamps[i-1];
      if (gap > 300) { // More than 5 minutes
        gaps++;
        maxGap = Math.max(maxGap, gap);
      }
    }
    console.log(`   Data gaps (>5min): ${gaps}`);
    if (maxGap > 0) {
      console.log(`   Largest gap: ${Math.round(maxGap/60)} minutes`);
    }

  } catch (error) {
    console.error(`❌ Error checking ${deviceInfo.name}:`, error.message);
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      if (error.response.data) {
        console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 DP Weather Station Diagnostic Tool');
  console.log('═'.repeat(60));
  console.log(`📅 Current Time: ${new Date().toLocaleString()}`);
  console.log(`🌐 API Base URL: ${BASE_URL}`);
  
  // Check API configuration
  if (!ECOWITT_CONFIG.applicationKey || !ECOWITT_CONFIG.apiKey) {
    console.error('❌ Missing API keys in environment variables');
    console.log('💡 Make sure you have ECOWITT_APPLICATION_KEY and ECOWITT_API_KEY set in your .env file');
    process.exit(1);
  }
  
  console.log('✅ API keys configured');

  try {
    // Get device list and find DP devices
    const dpDevices = await getDeviceList();
    
    if (Object.keys(dpDevices).length === 0) {
      console.error('❌ No DP devices found');
      process.exit(1);
    }

    // Check each DP device
    for (const [deviceName, deviceInfo] of Object.entries(dpDevices)) {
      await checkDeviceData(deviceInfo);
    }

  } catch (error) {
    console.error('❌ Failed to complete diagnostic:', error.message);
    process.exit(1);
  }

  console.log('\n🏁 Diagnostic Complete');
  console.log('═'.repeat(60));
}

// Run the diagnostic
main().catch(error => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});
