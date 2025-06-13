/**
 * Node.js-compatible Ecowinterface EcowittHistoricResponse {
  code: number;
  msg: string;
  time: string;
  data: {
    wind: {
      wind_speed: {
        unit: string;
        list: { [timestamp: string]: string };
      };
      wind_gust?: {
        unit: string;
        list: { [timestamp: string]: string };
      };
      wind_direction: {
        unit: string;
        list: { [timestamp: string]: string };
      };
    };
  };
}tching dawn patrol wind data
 * Used by verification scripts to get actual historical wind measurements
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ecowitt API constants
const BASE_URL = 'https://api.ecowitt.net/api/v3';

export interface EcowittWindDataPoint {
  time: string;
  timestamp: number;
  windSpeed: number; // m/s from API
  windSpeedMph: number; // converted to mph
  windGust: number; // m/s from API
  windGustMph: number; // converted to mph
  windDirection: number; // degrees
}

interface EcowittApiConfig {
  applicationKey: string;
  apiKey: string;
  macAddress: string;
}

interface EcowittHistoricResponse {
  code: number;
  msg: string;
  time: string;
  data: {
    wind: {
      wind_speed: {
        list: Array<{ val: string; time: string }>;
      };
      wind_direction: {
        list: Array<{ val: string; time: string }>;
      };
      wind_gust?: {
        list: Array<{ val: string; time: string }>;
      };
    };
  };
}

/**
 * Fetch dawn patrol wind data (6-8am) for today from "DP Soda Lakes" device
 */
export async function getDawnPatrolWindData(): Promise<{
  averageWindSpeed: number;
  maxWindSpeed: number;
  dataPoints: number;
  rawData: EcowittWindDataPoint[];
} | null> {
  console.log('🌅 Fetching dawn patrol wind data (6-8am today)...');
  
  try {
    // Get the MAC address for "DP Soda Lakes" device dynamically
    const macAddress = await getDeviceMacForSodaLakes();
    
    if (!macAddress) {
      console.error('❌ Unable to find MAC address for DP Soda Lakes device');
      return null;
    }
    
    const config: EcowittApiConfig = {
      applicationKey: process.env.ECOWITT_APPLICATION_KEY!,
      apiKey: process.env.ECOWITT_API_KEY!,
      macAddress
    };
    
    // Get today's dawn patrol window (6-8am)
    const today = new Date();
    const dawnStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0); // 6:00 AM
    const dawnEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0);   // 8:00 AM

    // Format dates for Ecowitt API
    const formatEcowittDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      start_date: formatEcowittDate(dawnStart),
      end_date: formatEcowittDate(dawnEnd),
      cycle_type: '5min', // 5-minute intervals
      temp_unit: '1', // Celsius
      pressure_unit: '3', // hPa
      wind_unit: '6', // m/s (we'll convert to mph)
      call_back: 'wind',
    };

    console.log(`📡 Fetching Ecowitt data from ${formatEcowittDate(dawnStart)} to ${formatEcowittDate(dawnEnd)}`);

    const response = await axios.get<EcowittHistoricResponse>(`${BASE_URL}/device/history`, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'DawnPatrol-Verification/1.0'
      }
    });

    if (response.data.code !== 0) {
      console.error('❌ Ecowitt API error:', response.data.msg);
      return null;
    }

    // Handle empty data
    if (!response.data.data?.wind?.wind_speed?.list) {
      console.warn('⚠️ No wind data available for dawn patrol window');
      return null;
    }

    const windData = response.data.data.wind;
    const timestamps = Object.keys(windData.wind_speed.list);
    console.log('📊 Received dawn patrol data points:', timestamps.length);

    // Convert to mph and create data points
    const windDataPoints: EcowittWindDataPoint[] = timestamps.map(timestamp => {
      // Convert timestamp to Date object and ISO string
      const timestampMs = parseInt(timestamp) * 1000;
      const date = new Date(timestampMs);
      const timeString = date.toISOString();
      
      // Extract wind data from the response structure (API provides mph)
      const windSpeedMph = parseFloat((windData.wind_speed.list as any)[timestamp] || '0');
      const windGustMph = parseFloat((windData.wind_gust?.list as any)?.[timestamp] || windSpeedMph.toString());
      const windDirection = parseFloat((windData.wind_direction?.list as any)?.[timestamp] || '0');
      
      // Convert to m/s for internal consistency
      const windSpeedMs = windSpeedMph / 2.237;
      const windGustMs = windGustMph / 2.237;

      return {
        time: timeString,
        timestamp: timestampMs,
        windSpeed: windSpeedMs,
        windSpeedMph,
        windGust: windGustMs,
        windGustMph,
        windDirection
      };
    });

    if (windDataPoints.length === 0) {
      console.warn('⚠️ No valid wind data points in dawn patrol window');
      return null;
    }

    // Calculate statistics
    const windSpeeds = windDataPoints.map(d => d.windSpeedMph);
    const windGusts = windDataPoints.map(d => d.windGustMph);
    
    const averageWindSpeed = windSpeeds.reduce((sum: number, speed: number) => sum + speed, 0) / windSpeeds.length;
    const maxWindSpeed = Math.max(...windGusts); // Use max gust as the peak

    console.log(`✅ Dawn patrol data: ${windDataPoints.length} readings, avg ${averageWindSpeed.toFixed(1)} mph, max ${maxWindSpeed.toFixed(1)} mph`);

    return {
      averageWindSpeed,
      maxWindSpeed,
      dataPoints: windDataPoints.length,
      rawData: windDataPoints
    };

  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      console.error('❌ Network error connecting to Ecowitt API:', error.message);
    } else if (error.response) {
      console.error('❌ Ecowitt API error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error fetching dawn patrol wind data:', error.message);
    }
    return null;
  }
}

/**
 * Get device MAC address for "DP Soda Lakes" device
 * This would normally fetch from the device list API
 */
export async function getDeviceMacForSodaLakes(): Promise<string | null> {
  try {
    const applicationKey = process.env.ECOWITT_APPLICATION_KEY;
    const apiKey = process.env.ECOWITT_API_KEY;
    
    if (!applicationKey || !apiKey) {
      throw new Error(
        'Missing Ecowitt API credentials. Please set ECOWITT_APPLICATION_KEY and ECOWITT_API_KEY in your .env file.'
      );
    }
    
    const response = await axios.get(`${BASE_URL}/device/list`, {
      params: {
        application_key: applicationKey,
        api_key: apiKey
      },
      timeout: 10000
    });

    if (response.data.code !== 0) {
      console.error('❌ Error fetching device list:', response.data.msg);
      return null;
    }

    const devices = response.data.data?.list || [];
    const sodaLakesDevice = devices.find((device: any) => 
      device.name && device.name.includes('DP Soda Lakes')
    );

    if (sodaLakesDevice) {
      console.log(`✅ Found DP Soda Lakes device: ${sodaLakesDevice.mac}`);
      return sodaLakesDevice.mac;
    } else {
      console.warn('⚠️ DP Soda Lakes device not found in device list');
      console.log('Available devices:', devices.map((d: any) => d.name));
      return null;
    }

  } catch (error: any) {
    console.error('❌ Error fetching device MAC:', error.message);
    return null;
  }
}
