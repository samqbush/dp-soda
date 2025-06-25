/**
 * Utility functions for calculating smart time windows for wind charts
 * Used to show data from 4am to current time, with 9pm cutoff for nighttime hours
 */

export interface TimeWindow {
  startHour: number;
  endHour: number;
  isMultiDay?: boolean; // true if window spans multiple days
}

/**
 * Calculates the appropriate time window for wind charts based on current time
 * Rules:
 * - Start at 4am
 * - End at current time, but not past 9pm
 * - If current time is between midnight and 4am, use previous day's 4am-9pm window
 * 
 * @returns TimeWindow object with startHour and endHour
 */
export function getWindChartTimeWindow(): TimeWindow {
  const now = new Date();
  const currentHour = now.getHours();
  
  console.log('🕐 Calculating time window:', {
    currentTime: now.toISOString(),
    currentHour: currentHour
  });
  
  // If it's between midnight and 4am, we want to show yesterday's 4am-9pm window
  if (currentHour >= 0 && currentHour < 4) {
    const result = {
      startHour: 4,
      endHour: 21, // 9pm
      isMultiDay: true // This indicates we want previous day's data
    };
    console.log('🌙 Early morning detected - using previous day window:', result);
    return result;
  }
  
  // If it's between 4am and 9pm, show from 4am up to current time
  if (currentHour >= 4 && currentHour <= 21) {
    const result = {
      startHour: 4,
      endHour: 23 // Show all available data for the day up to current time
    };
    console.log('☀️ Daytime detected - using current day window through current time:', result);
    return result;
  }
  
  // If it's after 9pm, show 4am to 9pm (full windsurfing day)
  const result = {
    startHour: 4,
    endHour: 21 // 9pm
  };
  console.log('🌆 Evening detected - using full day window:', result);
  return result;
}

/**
 * Filters wind data points based on the smart time window
 * Handles multi-day scenarios correctly
 * 
 * @param data Array of wind data points
 * @param timeWindow TimeWindow object from getWindChartTimeWindow()
 * @returns Filtered array of wind data points
 */
export function filterWindDataByTimeWindow<T extends { time: string | Date }>(
  data: T[], 
  timeWindow: TimeWindow
): T[] {
  if (!data || data.length === 0) return [];
  
  const now = new Date();
  
  console.log('🔍 Filtering wind data:', {
    totalPoints: data.length,
    timeWindow: timeWindow,
    currentTime: now.toISOString(),
    firstPoint: data.length > 0 ? new Date(data[0].time).toISOString() : 'No data',
    lastPoint: data.length > 0 ? new Date(data[data.length - 1].time).toISOString() : 'No data'
  });
  
  const filtered = data.filter(point => {
    const pointDate = new Date(point.time);
    const pointHour = pointDate.getHours();
    
    if (timeWindow.isMultiDay) {
      // For multi-day scenarios (current time is 0-4am), 
      // we want yesterday's data from 4am-9pm
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if point is from yesterday and within 4am-9pm window
      const isFromYesterday = pointDate.toDateString() === yesterday.toDateString();
      const isInTimeWindow = pointHour >= timeWindow.startHour && pointHour <= timeWindow.endHour;
      
      return isFromYesterday && isInTimeWindow;
    } else {
      // For same-day scenarios, check if point is from today and within time window
      const isFromToday = pointDate.toDateString() === now.toDateString();
      
      // Check if point is after start time and before/at current time
      const isAfterStartTime = pointHour >= timeWindow.startHour;
      const isBeforeCurrentTime = pointDate <= now;
      
      return isFromToday && isAfterStartTime && isBeforeCurrentTime;
    }
  });
  
  console.log('✅ Filtered result:', {
    filteredPoints: filtered.length,
    timeRange: filtered.length > 0 ? {
      first: new Date(filtered[0].time).toISOString(),
      last: new Date(filtered[filtered.length - 1].time).toISOString()
    } : 'No data'
  });
  
  return filtered;
}
