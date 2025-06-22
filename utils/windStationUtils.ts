// Wind Station Utilities - Extracted from Soda Lake implementation
import { EcowittWindDataPoint, EcowittCurrentWindConditions } from '@/services/ecowittService';

export const formatLastUpdated = (
  currentConditions: EcowittCurrentWindConditions | null,
  currentConditionsUpdated: Date | null,
  windData: EcowittWindDataPoint[]
): string => {
  // Prioritize real-time data timestamp if available
  if (currentConditions && currentConditionsUpdated) {
    return currentConditionsUpdated.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  // Fall back to latest historical data timestamp
  if (windData.length > 0) {
    const latest = windData[windData.length - 1];
    const latestTime = new Date(latest.time);
    return latestTime.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  return 'Never';
};

export const getCurrentWindSpeed = (
  currentConditions: EcowittCurrentWindConditions | null,
  currentConditionsUpdated: Date | null,
  windData: EcowittWindDataPoint[]
): number | null => {
  // Use real-time data if available and recent (within 10 minutes)
  if (currentConditions && currentConditionsUpdated) {
    const age = Date.now() - currentConditionsUpdated.getTime();
    if (age < 10 * 60 * 1000) { // 10 minutes
      return currentConditions.windSpeedMph;
    }
  }
  
  // Fall back to latest historical data
  if (windData.length === 0) return null;
  const latest = windData[windData.length - 1];
  return latest.windSpeedMph;
};

export const getCurrentWindDirection = (
  currentConditions: EcowittCurrentWindConditions | null,
  currentConditionsUpdated: Date | null,
  windData: EcowittWindDataPoint[]
): number | null => {
  // Use real-time data if available and recent (within 10 minutes)
  if (currentConditions && currentConditionsUpdated) {
    const age = Date.now() - currentConditionsUpdated.getTime();
    if (age < 10 * 60 * 1000) { // 10 minutes
      return currentConditions.windDirection;
    }
  }
  
  // Fall back to latest historical data
  if (windData.length === 0) return null;
  const latest = windData[windData.length - 1];
  return latest.windDirection;
};

export const getWindDirectionText = (degrees: number | null): string => {
  if (degrees === null) return 'N/A';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const isDataStale = (
  currentConditions: EcowittCurrentWindConditions | null,
  currentConditionsUpdated: Date | null,
  windData: EcowittWindDataPoint[]
): boolean => {
  // Check real-time data first - if we have recent real-time data, consider it fresh
  if (currentConditions && currentConditionsUpdated) {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    if (currentConditionsUpdated > thirtyMinutesAgo) {
      return false; // Real-time data is fresh
    }
  }
  
  // If no real-time data, check historical data  
  if (windData.length === 0) return true;
  
  const latest = windData[windData.length - 1];
  const latestTime = new Date(latest.time);
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  
  // Consider historical data fresh if it's within 30 minutes
  return latestTime < thirtyMinutesAgo;
};

export const getDataFreshnessMessage = (
  currentConditions: EcowittCurrentWindConditions | null,
  currentConditionsUpdated: Date | null,
  windData: EcowittWindDataPoint[]
): string => {
  // Check real-time data first
  if (currentConditions && currentConditionsUpdated) {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - currentConditionsUpdated.getTime()) / 60000);
    
    if (diffMinutes === 0) return 'Real-time data current';
    if (diffMinutes < 5) return `Real-time data from ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffMinutes < 30) return `Real-time data from ${diffMinutes} minutes ago`;
  }
  
  // Fall back to historical data messaging
  if (windData.length === 0) return 'No data available';
  
  const latest = windData[windData.length - 1];
  const latestTime = new Date(latest.time);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - latestTime.getTime()) / 60000);
  
  if (diffMinutes < 30) return 'Historical data is current';
  if (diffMinutes < 120) return `Last historical reading ${diffMinutes} minutes ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  return `⚠️ Station may be offline - last reading ${diffHours} hours ago`;
};
