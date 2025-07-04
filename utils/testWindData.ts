// filepath: /Users/samquakenbush/Code/dp-react/utils/testWindData.ts
import { WindDataPoint } from '@/services/windService';

/**
 * Generate test wind data for testing the wind alarm functionality.
 * This file contains functions to create simulated wind data for each test scenario.
 */

/**
 * Generate wind data with good early morning conditions that should trigger alarm
 */
export function generateGoodMorningData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseDate = new Date();
  
  // Ensure we start at midnight
  baseDate.setHours(0, 0, 0, 0);
  
  // Generate 24 hours of data, one point every hour
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(hour);
    
    let windSpeed: number;
    let windDirection: number;
    
    // 3am-5am: Good conditions (12-15 mph, consistent NW direction)
    if (hour >= 3 && hour < 5) {
      windSpeed = 12 + Math.random() * 3;
      windDirection = 315 + (Math.random() * 20 - 10); // NW with minimal variation
    } 
    // 6am-8am: Verification window (similar to morning conditions)
    else if (hour >= 6 && hour < 8) {
      windSpeed = 13 + Math.random() * 4;
      windDirection = 320 + (Math.random() * 30 - 15);
    } 
    // Rest of day: Variable conditions
    else {
      windSpeed = 5 + Math.random() * 10;
      windDirection = Math.random() * 360;
    }
    
    // Convert mph to kph for storage (service will convert back)
    const windSpeedKph = windSpeed * 1.60934;
    
    data.push({
      time: timestamp.toISOString(),
      timestamp: timestamp.toISOString(),
      windSpeed: windSpeedKph.toString(),
      windSpeedMph: windSpeed,
      windGust: (windSpeedKph * (1 + Math.random() * 0.3)).toString(),
      windDirection: windDirection.toString()
    });
  }
  
  return data;
}

/**
 * Generate wind data with weak early morning conditions that should not trigger alarm
 */
export function generateWeakMorningData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseDate = new Date();
  
  // Ensure we start at midnight
  baseDate.setHours(0, 0, 0, 0);
  
  // Generate 24 hours of data, one point every hour
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(hour);
    
    let windSpeed: number;
    let windDirection: number;
    
    // 3am-5am: Weak conditions (5-8 mph, somewhat consistent NW direction)
    if (hour >= 3 && hour < 5) {
      windSpeed = 5 + Math.random() * 3;
      windDirection = 315 + (Math.random() * 20 - 10);
    } 
    // 6am-8am: Verification window (similar to morning conditions)
    else if (hour >= 6 && hour < 8) {
      windSpeed = 6 + Math.random() * 3;
      windDirection = 320 + (Math.random() * 30 - 15);
    } 
    // Rest of day: Variable conditions
    else {
      windSpeed = 4 + Math.random() * 8;
      windDirection = Math.random() * 360;
    }
    
    // Convert mph to kph for storage (service will convert back)
    const windSpeedKph = windSpeed * 1.60934;
    
    data.push({
      time: timestamp.toISOString(),
      timestamp: timestamp.toISOString(),
      windSpeed: windSpeedKph.toString(),
      windSpeedMph: windSpeed,
      windGust: (windSpeedKph * (1 + Math.random() * 0.3)).toString(),
      windDirection: windDirection.toString()
    });
  }
  
  return data;
}

/**
 * Generate wind data with inconsistent direction in early morning
 */
export function generateInconsistentDirectionData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseDate = new Date();
  
  // Ensure we start at midnight
  baseDate.setHours(0, 0, 0, 0);
  
  // Generate 24 hours of data, one point every hour
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(hour);
    
    let windSpeed: number;
    let windDirection: number;
    
    // 3am-5am: Good speed but inconsistent direction
    if (hour >= 3 && hour < 5) {
      windSpeed = 12 + Math.random() * 4;
      
      // Highly variable direction between NW and NE
      if (hour === 3) {
        windDirection = 315 + (Math.random() * 20 - 10); // NW
      } else { // hour === 4
        windDirection = 45 + (Math.random() * 20 - 10); // NE
      }
    } 
    // 6am-8am: Still variable direction
    else if (hour >= 6 && hour < 8) {
      windSpeed = 13 + Math.random() * 4;
      windDirection = Math.random() * 360;
    } 
    // Rest of day: Variable conditions
    else {
      windSpeed = 5 + Math.random() * 10;
      windDirection = Math.random() * 360;
    }
    
    // Convert mph to kph for storage (service will convert back)
    const windSpeedKph = windSpeed * 1.60934;
    
    data.push({
      time: timestamp.toISOString(),
      timestamp: timestamp.toISOString(),
      windSpeed: windSpeedKph.toString(),
      windSpeedMph: windSpeed,
      windGust: (windSpeedKph * (1 + Math.random() * 0.3)).toString(),
      windDirection: windDirection.toString()
    });
  }
  
  return data;
}

/**
 * Generate wind data with completely wrong direction in early morning
 */
export function generateWrongDirectionData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseDate = new Date();
  
  // Ensure we start at midnight
  baseDate.setHours(0, 0, 0, 0);
  
  // Generate 24 hours of data, one point every hour
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(hour);
    
    let windSpeed: number;
    let windDirection: number;
    
    // 3am-5am: Good speed but wrong direction (SE instead of NW)
    if (hour >= 3 && hour < 5) {
      windSpeed = 12 + Math.random() * 4;
      windDirection = 135 + (Math.random() * 20 - 10); // SE instead of NW
    } 
    // 6am-8am: Still SE direction
    else if (hour >= 6 && hour < 8) {
      windSpeed = 13 + Math.random() * 4;
      windDirection = 140 + (Math.random() * 30 - 15);
    } 
    // Rest of day: Variable conditions
    else {
      windSpeed = 5 + Math.random() * 10;
      windDirection = Math.random() * 360;
    }
    
    // Convert mph to kph for storage (service will convert back)
    const windSpeedKph = windSpeed * 1.60934;
    
    data.push({
      time: timestamp.toISOString(),
      timestamp: timestamp.toISOString(),
      windSpeed: windSpeedKph.toString(),
      windSpeedMph: windSpeed,
      windGust: (windSpeedKph * (1 + Math.random() * 0.3)).toString(),
      windDirection: windDirection.toString()
    });
  }
  
  return data;
}

/**
 * Generate wind data with not enough consecutive good points in early morning
 */
export function generateFewGoodPointsData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseDate = new Date();
  
  // Ensure we start at midnight
  baseDate.setHours(0, 0, 0, 0);
  
  // Generate 24 hours of data with 4 points per hour (15 min intervals)
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timestamp = new Date(baseDate);
      timestamp.setHours(hour, minute, 0, 0);
      
      let windSpeed: number;
      let windDirection: number;
      
      // 3am-5am: Only a few good points, not consecutive
      if (hour >= 3 && hour < 5) {
        if ((hour === 3 && minute === 0) || 
            (hour === 3 && minute === 30) || 
            (hour === 4 && minute === 15)) {
          // Good points - fast and consistent
          windSpeed = 13 + Math.random() * 3;
          windDirection = 315 + (Math.random() * 10 - 5);
        } else {
          // Weaker points
          windSpeed = 8 + Math.random() * 3;
          windDirection = 315 + (Math.random() * 40 - 20);
        }
      } 
      // 6am-8am: Similar pattern
      else if (hour >= 6 && hour < 8) {
        if ((hour === 6 && minute === 15) || 
            (hour === 7 && minute === 0) || 
            (hour === 7 && minute === 45)) {
          windSpeed = 12 + Math.random() * 3;
          windDirection = 315 + (Math.random() * 10 - 5);
        } else {
          windSpeed = 7 + Math.random() * 3;
          windDirection = 315 + (Math.random() * 40 - 20);
        }
      } 
      // Rest of day: Variable conditions
      else {
        windSpeed = 5 + Math.random() * 10;
        windDirection = Math.random() * 360;
      }
      
      // Convert mph to kph for storage (service will convert back)
      const windSpeedKph = windSpeed * 1.60934;
      
      data.push({
        time: timestamp.toISOString(),
        timestamp: timestamp.toISOString(),
        windSpeed: windSpeedKph.toString(),
        windSpeedMph: windSpeed,
        windGust: (windSpeedKph * (1 + Math.random() * 0.3)).toString(),
        windDirection: windDirection.toString()
      });
    }
  }
  
  return data;
}
