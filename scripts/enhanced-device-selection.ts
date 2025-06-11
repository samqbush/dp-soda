// Enhanced device selection function for ecowittService.ts
// Add this function when you want to implement smarter device selection

import { EcowittDevice } from '../services/ecowittService';

/**
 * Enhanced device selection logic for Standley Lake monitoring
 * This function should replace the simple "first device" logic
 * once you've identified your available devices using the debug script
 */
export function selectBestDeviceForStandleyLake(devices: EcowittDevice[]): EcowittDevice | null {
  if (!devices || devices.length === 0) {
    return null;
  }

  // Priority 1: Look for devices with Standley Lake in the name
  const standleyDevices = devices.filter(d => 
    d.name && d.name.toLowerCase().includes('standley')
  );
  
  if (standleyDevices.length > 0) {
    console.log('✅ Selected Standley Lake device:', standleyDevices[0].name);
    return standleyDevices[0];
  }

  // Priority 2: Look for devices with lake, wind, or weather in name
  const locationDevices = devices.filter(d => 
    d.name && (
      d.name.toLowerCase().includes('lake') ||
      d.name.toLowerCase().includes('wind') ||
      d.name.toLowerCase().includes('weather')
    )
  );
  
  if (locationDevices.length > 0) {
    console.log('✅ Selected location-related device:', locationDevices[0].name);
    return locationDevices[0];
  }

  // Priority 3: Fall back to first device
  console.log('✅ Selected first available device:', devices[0].name);
  return devices[0];
}

/**
 * Alternative: Hardcoded device selection if you know the exact MAC
 * Replace 'YOUR_STANDLEY_LAKE_MAC' with the actual MAC address
 */
export function selectStandleyLakeDeviceByMAC(devices: EcowittDevice[]): EcowittDevice | null {
  const STANDLEY_LAKE_MAC = 'YOUR_STANDLEY_LAKE_MAC'; // Update this after running debug script
  
  const targetDevice = devices.find(d => d.mac === STANDLEY_LAKE_MAC);
  
  if (targetDevice) {
    console.log('✅ Found target Standley Lake device:', targetDevice.name);
    return targetDevice;
  }
  
  console.warn('❌ Target Standley Lake device not found, falling back to smart selection');
  return selectBestDeviceForStandleyLake(devices);
}

/**
 * Update the existing getDeviceMacAddress() function to use enhanced selection
 * Replace this section in your ecowittService.ts:
 * 
 * // OLD CODE:
 * let selectedDevice = devices.find(device => device && device.online);
 * if (!selectedDevice) {
 *   selectedDevice = devices[0];
 * }
 * 
 * // NEW CODE:
 * const selectedDevice = selectBestDeviceForStandleyLake(devices);
 * if (!selectedDevice) {
 *   throw new Error('No valid devices found in your Ecowitt account.');
 * }
 */
