import {
  getWindChartTimeWindow,
  filterWindDataByTimeWindow,
  type TimeWindow
} from '@/utils/timeWindowUtils';

describe('Time Window Utilities Tests', () => {
  // Mock console.log to reduce noise in tests
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getWindChartTimeWindow', () => {
    beforeEach(() => {
      // Reset any date mocks
      jest.useRealTimers();
    });

    it('should return correct window for different times of day', () => {
      // Test that the function returns some expected structure
      // Let's test without mocking specific times first
      const result = getWindChartTimeWindow();

      // Basic structure validation
      expect(result).toHaveProperty('startHour');
      expect(result).toHaveProperty('endHour');
      expect(typeof result.startHour).toBe('number');
      expect(typeof result.endHour).toBe('number');
      expect(result.startHour).toBeGreaterThanOrEqual(0);
      expect(result.startHour).toBeLessThanOrEqual(23);
      expect(result.endHour).toBeGreaterThanOrEqual(0);
      expect(result.endHour).toBeLessThanOrEqual(23);
    });

    it('should handle early morning times (multi-day scenario)', () => {
      jest.useFakeTimers();
      
      // Early morning time - should trigger multi-day scenario
      // Use local time constructor to ensure consistent behavior across environments
      jest.setSystemTime(new Date(2025, 6, 4, 2, 30, 0)); // July 4, 2025, 2:30 AM local time
      const earlyMorningResult = getWindChartTimeWindow();
      
      expect(earlyMorningResult.startHour).toBe(4);
      expect(earlyMorningResult.endHour).toBe(21);
      expect(earlyMorningResult.isMultiDay).toBe(true);

      jest.useRealTimers();
    });

    it('should handle midnight edge case', () => {
      jest.useFakeTimers();
      
      // Exactly midnight
      jest.setSystemTime(new Date(2025, 6, 4, 0, 0, 0)); // July 4, 2025, midnight local time
      const midnightResult = getWindChartTimeWindow();
      
      expect(midnightResult.startHour).toBe(4);
      expect(midnightResult.isMultiDay).toBe(true);

      jest.useRealTimers();
    });

    it('should handle 4 AM boundary correctly', () => {
      jest.useFakeTimers();
      
      // Exactly 4 AM - should switch from multi-day to same-day
      jest.setSystemTime(new Date(2025, 6, 4, 4, 0, 0)); // July 4, 2025, 4 AM local time
      const boundaryResult = getWindChartTimeWindow();
      
      expect(boundaryResult.startHour).toBe(4);
      expect(boundaryResult.isMultiDay || false).toBe(false);

      jest.useRealTimers();
    });

    it('should return previous day window for early morning hours (0-4am)', () => {
      jest.useFakeTimers();
      
      // Test 2am - should return previous day window
      jest.setSystemTime(new Date(2025, 6, 4, 2, 0, 0)); // July 4, 2025, 2 AM local time
      const earlyMorningResult = getWindChartTimeWindow();
      
      expect(earlyMorningResult.startHour).toBe(4);
      expect(earlyMorningResult.endHour).toBe(21); // 9pm
      expect(earlyMorningResult.isMultiDay).toBe(true);

      jest.useRealTimers();
    });

    it('should return current day window for daytime hours (4am-9pm)', () => {
      jest.useFakeTimers();
      
      // Test 10am - should return current day window
      jest.setSystemTime(new Date(2025, 6, 4, 10, 0, 0)); // July 4, 2025, 10 AM local time
      const daytimeResult = getWindChartTimeWindow();
      
      expect(daytimeResult.startHour).toBe(4);
      expect(daytimeResult.endHour).toBe(23); // Show through current time
      expect(daytimeResult.isMultiDay).toBeUndefined(); // No isMultiDay property

      jest.useRealTimers();
    });

    it('should return full day window for evening hours (after 9pm)', () => {
      jest.useFakeTimers();
      
      // Test 10pm - should return full day window
      jest.setSystemTime(new Date(2025, 6, 4, 22, 0, 0)); // July 4, 2025, 10 PM local time
      const eveningResult = getWindChartTimeWindow();
      
      expect(eveningResult.startHour).toBe(4);
      expect(eveningResult.endHour).toBe(21); // 9pm
      expect(eveningResult.isMultiDay).toBeUndefined(); // No isMultiDay property

      jest.useRealTimers();
    });
  });

  describe('filterWindDataByTimeWindow', () => {
    const mockWindData = [
      { time: new Date(2025, 6, 3, 6, 0, 0).toISOString(), windSpeed: 12 }, // July 3, 2025, 6am local
      { time: new Date(2025, 6, 3, 12, 0, 0).toISOString(), windSpeed: 15 }, // July 3, 2025, noon local
      { time: new Date(2025, 6, 3, 18, 0, 0).toISOString(), windSpeed: 18 }, // July 3, 2025, 6pm local
      { time: new Date(2025, 6, 4, 6, 0, 0).toISOString(), windSpeed: 14 }, // July 4, 2025, 6am local
      { time: new Date(2025, 6, 4, 12, 0, 0).toISOString(), windSpeed: 20 }, // July 4, 2025, noon local
      { time: new Date(2025, 6, 4, 15, 0, 0).toISOString(), windSpeed: 22 }, // July 4, 2025, 3pm local
    ];

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle multi-day filtering correctly', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 6, 4, 2, 0, 0)); // July 4, 2025, 2 AM local time
      
      const multiDayTimeWindow = { startHour: 4, endHour: 21, isMultiDay: true };
      
      // Create test data spanning yesterday and today
      const yesterday = new Date(2025, 6, 3, 18, 0, 0); // July 3, 2025, 6 PM local time (within window)
      const yesterdayEarly = new Date(2025, 6, 3, 2, 0, 0); // July 3, 2025, 2 AM local time (outside window)
      const todayEarly = new Date(2025, 6, 4, 1, 0, 0); // July 4, 2025, 1 AM local time (current day)
      
      const testData = [
        { time: yesterday.toISOString(), windSpeed: 5, windDirection: 180 },
        { time: yesterdayEarly.toISOString(), windSpeed: 6, windDirection: 200 },
        { time: todayEarly.toISOString(), windSpeed: 7, windDirection: 220 }
      ];
      
      const result = filterWindDataByTimeWindow(testData, multiDayTimeWindow);
      
      // Should only include yesterday's data within the time window (6 PM)
      expect(result).toHaveLength(1);
      expect(result[0].windSpeed).toBe(5);
      
      jest.useRealTimers();
    });

    it('should handle same-day filtering with before current time check', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 6, 4, 10, 0, 0)); // July 4, 2025, 10 AM local time
      
      const sameDayTimeWindow = { startHour: 4, endHour: 21, isMultiDay: false };
      
      // Create test data
      const earlyMorning = new Date(2025, 6, 4, 6, 0, 0); // July 4, 2025, 6 AM local time (within window, before current)
      const futureTime = new Date(2025, 6, 4, 12, 0, 0); // July 4, 2025, 12 PM local time (after current time)
      const beforeWindow = new Date(2025, 6, 4, 2, 0, 0); // July 4, 2025, 2 AM local time (before window)
      
      const testData = [
        { time: earlyMorning.toISOString(), windSpeed: 5, windDirection: 180 },
        { time: futureTime.toISOString(), windSpeed: 6, windDirection: 200 },
        { time: beforeWindow.toISOString(), windSpeed: 7, windDirection: 220 }
      ];
      
      const result = filterWindDataByTimeWindow(testData, sameDayTimeWindow);
      
      // Should only include early morning data (within window and before current time)
      expect(result).toHaveLength(1);
      expect(result[0].windSpeed).toBe(5);
      
      jest.useRealTimers();
    });

    it('should properly log when no data remains after filtering', () => {
      // Set up mock console.log to capture the logging
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 6, 4, 10, 0, 0)); // July 4, 2025, 10 AM local time
      
      // Create data that will be filtered out (from tomorrow)
      const futureData = [
        {
          time: new Date(2025, 6, 5, 6, 0, 0).toISOString(), // July 5, 2025, 6 AM local time (tomorrow)
          windSpeed: 15,
          windDirection: 270,
          windGust: 20
        }
      ];

      const timeWindow = { startHour: 4, endHour: 21, isMultiDay: false };
      const result = filterWindDataByTimeWindow(futureData, timeWindow);

      expect(result).toEqual([]);
      
      // Check that the logging occurred for no data scenario
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Filtered result:', {
        filteredPoints: 0,
        timeRange: 'No data'
      });

      consoleLogSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
