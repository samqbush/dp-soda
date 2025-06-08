#!/usr/bin/env node

/**
 * Debug script to show all Ecowitt devices returned by the API
 * This helps identify which device should be used for Standley Lake monitoring
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get API configuration from environment variables
function getEcowittConfig() {
  const applicationKey = process.env.ECOWITT_APPLICATION_KEY;
  const apiKey = process.env.ECOWITT_API_KEY;
  
  if (!applicationKey || !apiKey) {
    console.error('❌ Missing required environment variables:');
    if (!applicationKey) console.error('   - ECOWITT_APPLICATION_KEY');
    if (!apiKey) console.error('   - ECOWITT_API_KEY');
    console.log('💡 Make sure these are set in your .env file');
    process.exit(1);
  }
  
  return { applicationKey, apiKey };
}

// Ecowitt API constants
const BASE_URL = 'https://api.ecowitt.net/api/v3';

async function debugDeviceListAPI(config) {
  console.log('🔍 DEBUG: Testing device list API...');
  
  try {
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      call_back: 'device',
    };

    console.log('📡 DEBUG: Making API request to device/list');
    console.log('📡 DEBUG: API URL:', `${BASE_URL}/device/list`);
    console.log('📡 DEBUG: Request params:', JSON.stringify(params, null, 2));
    
    const response = await axios.get(`${BASE_URL}/device/list`, {
      params,
      timeout: 5000, // Reduced timeout to 5 seconds
      headers: {
        'User-Agent': 'DawnPatrol/1.0'
      }
    });

    console.log('📊 DEBUG: Raw API response status:', response.status);
    console.log('📊 DEBUG: Raw API response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code !== 0) {
      console.error('❌ DEBUG: API returned error code:', response.data.code, response.data.msg);
    } else {
      console.log('✅ DEBUG: API call successful');
      console.log('📊 DEBUG: Response data structure:');
      console.log('  - data exists:', !!response.data.data);
      console.log('  - list exists:', !!response.data.data?.list);
      console.log('  - list is array:', Array.isArray(response.data.data?.list));
      console.log('  - list length:', response.data.data?.list?.length);
      console.log('  - pageNum:', response.data.data?.pageNum);
      console.log('  - total:', response.data.data?.total);
      
      if (response.data.data?.list) {
        response.data.data.list.forEach((device, index) => {
          console.log(`  - Device ${index}:`, JSON.stringify(device, null, 4));
        });
      }
    }
    
  } catch (error) {
    console.error('❌ DEBUG: Device list API failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.error('❌ DEBUG: Response data:', error.response?.data);
      console.error('❌ DEBUG: Response status:', error.response?.status);
      
      // Handle specific 502 error
      if (error.response?.status === 502) {
        console.log('');
        console.log('🚨 ECOWITT API SERVER ERROR (502 Bad Gateway)');
        console.log('   The Ecowitt API is currently experiencing issues.');
        console.log('   This is not a problem with your credentials or code.');
        console.log('');
        console.log('💡 RECOMMENDATIONS:');
        console.log('   1. Wait 1-2 hours and try again');
        console.log('   2. Check Ecowitt\'s status page or support channels');
        console.log('   3. Test API recovery with: curl -s "https://api.ecowitt.net/api/v3/device/list"');
        console.log('');
        console.log('📝 WHEN API RECOVERS:');
        console.log('   Re-run this script to see your available devices');
        console.log('   Use the output to improve device selection logic');
        return;
      }
    }
    throw error;
  }
}

async function fetchEcowittDeviceList(config) {
  console.log('📱 Fetching Ecowitt device list...');
  
  try {
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      call_back: 'device',
    };

    console.log('📡 Making Ecowitt device list API request');

    const response = await axios.get(`${BASE_URL}/device/list`, {
      params,
      timeout: 5000, // Reduced timeout
      headers: {
        'User-Agent': 'DawnPatrol/1.0'
      }
    });

    if (response.data.code !== 0) {
      throw new Error(`Ecowitt device list API error: ${response.data.msg}`);
    }

    if (!response.data.data || !Array.isArray(response.data.data.list)) {
      console.error('❌ Invalid device list response structure:', response.data);
      throw new Error('Invalid device list response from Ecowitt API');
    }

    const deviceList = response.data.data.list;
    console.log('📊 Received Ecowitt devices:', deviceList.length);
    return deviceList;

  } catch (error) {
    console.error('❌ Error fetching Ecowitt device list:', error.message);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 502) {
        console.log('');
        console.log('🚨 API SERVER ERROR: The Ecowitt API is currently down (502 Bad Gateway)');
        console.log('   This is a server-side issue, not related to your configuration.');
        console.log('   Please try again later when the API service is restored.');
        return [];
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API credentials for device list.');
      } else if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      } else if (error.response && error.response.status >= 500) {
        throw new Error('Ecowitt server error. Please try again later.');
      }
    }
    
    throw error;
  }
}

console.log('🔍 ECOWITT DEVICE DISCOVERY SCRIPT');
console.log('='.repeat(50));
console.log('');

async function main() {
  // Get config from environment
  const config = getEcowittConfig();
  console.log('✅ Loaded API configuration from environment variables');
  
  try {
    console.log('📡 Step 1: Raw API Debug (shows full API response structure)');
    console.log('-'.repeat(30));
    await debugDeviceListAPI(config);
    
    console.log('');
    console.log('📱 Step 2: Parsed Device List');
    console.log('-'.repeat(30));
    
    const devices = await fetchEcowittDeviceList(config);
    
    if (!devices || devices.length === 0) {
      console.log('❌ No devices found!');
      console.log('   This could mean:');
      console.log('   - Invalid API credentials');
      console.log('   - No devices registered to your account');
      console.log('   - API access issues');
      return;
    }
    
    console.log(`✅ Found ${devices.length} device(s):`);
    console.log('');
    
    devices.forEach((device, index) => {
      console.log(`📟 Device #${index + 1}:`);
      console.log(`   Name: ${device.name || 'Unknown'}`);
      console.log(`   MAC: ${device.mac || 'N/A'}`);
      console.log(`   Model: ${device.stationtype || 'Unknown'}`);
      console.log(`   ID: ${device.id || 'N/A'}`);
      console.log(`   Location: ${device.latitude}, ${device.longitude}`);
      console.log(`   Created: ${device.createtime ? new Date(device.createtime * 1000).toLocaleDateString() : 'Unknown'}`);
      
      // Show additional properties if they exist
      const additionalProps = Object.keys(device).filter(key => 
        !['name', 'mac', 'stationtype', 'id', 'latitude', 'longitude', 'createtime'].includes(key)
      );
      
      if (additionalProps.length > 0) {
        console.log('   Additional properties:');
        additionalProps.forEach(prop => {
          console.log(`     ${prop}: ${JSON.stringify(device[prop])}`);
        });
      }
      
      console.log('');
    });
    
    // Show current selection logic
    console.log('🎯 CURRENT SELECTION LOGIC:');
    console.log('-'.repeat(30));
    
    // Since API doesn't provide online status, select based on other criteria
    const selectedDevice = devices[0]; // Current logic just takes first device
    
    console.log(`✅ Currently selecting first device: "${selectedDevice.name}" (${selectedDevice.mac})`);
    console.log(`   📍 Location: ${selectedDevice.latitude}, ${selectedDevice.longitude}`);
    
    if (devices.length > 1) {
      console.log(`   Other devices available: ${devices.slice(1).map(d => d.name).join(', ')}`);
    }
    
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('-'.repeat(30));
    
    if (devices.length === 1) {
      console.log('✅ Only one device found - current logic is optimal');
    } else {
      console.log('🤔 Multiple devices found. Consider:');
      console.log('   1. Which device is physically located at Standley Lake?');
      console.log('   2. Should we prefer devices by name, location, or model?');
      console.log('   3. Should we allow user selection in the app?');
      console.log('');
      console.log('💡 IMPORTANT: API does not provide online/offline status');
      console.log('   All devices are assumed to be available');
      
      // Look for devices with location-related names
      const locationDevices = devices.filter(d => 
        d.name && (
          d.name.toLowerCase().includes('standley') ||
          d.name.toLowerCase().includes('lake') ||
          d.name.toLowerCase().includes('wind') ||
          d.name.toLowerCase().includes('weather')
        )
      );
      
      if (locationDevices.length > 0) {
        console.log('');
        console.log('   🏷️ Devices with location-related names:');
        locationDevices.forEach(d => {
          console.log(`      - "${d.name}" (${d.mac})`);
        });
      }
      
      // Show devices by location
      console.log('');
      console.log('   📍 Devices by location:');
      devices.forEach(d => {
        console.log(`      - "${d.name}": ${d.latitude}, ${d.longitude}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    
    if (error.message.includes('credentials')) {
      console.log('');
      console.log('🔧 API CREDENTIAL ISSUES:');
      console.log('   Check your Ecowitt API configuration in config/ecowittConfig.ts');
      console.log('   Make sure you have valid applicationKey and apiKey');
    } else if (error.message.includes('Network')) {
      console.log('');
      console.log('🌐 NETWORK ISSUES:');
      console.log('   Check your internet connection');
      console.log('   Verify Ecowitt API is accessible');
    }
  }
}

// Run the script
main().catch(console.error);
