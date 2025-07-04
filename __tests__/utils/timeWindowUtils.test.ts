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

    it('should handle boundary times correctly', () => {
      // Test a few specific scenarios with known outcomes
      jest.useFakeTimers();
      
      // Afternoon time - should be straightforward
      jest.setSystemTime(new Date('2025-07-04T18:00:00-06:00')); // 6 PM local time
      const afternoonResult = getWindChartTimeWindow();
      expect(afternoonResult.startHour).toBe(4);
      expect(typeof afternoonResult.endHour).toBe('number');

      jest.useRealTimers();
    });

    it('should return previous day window for early morning hours (0-4am)', () => {
      jest.useFakeTimers();
      
      // Test 2am - should return previous day window
      jest.setSystemTime(new Date('2025-07-04T02:00:00-06:00')); // 2 AM local time
      const earlyMorningResult = getWindChartTimeWindow();
      
      expect(earlyMorningResult.startHour).toBe(4);
      expect(earlyMorningResult.endHour).toBe(21); // 9pm
      expect(earlyMorningResult.isMultiDay).toBe(true);

      jest.useRealTimers();
    });

    it('should return current day window for daytime hours (4am-9pm)', () => {
      jest.useFakeTimers();
      
      // Test 10am - should return current day window
      jest.setSystemTime(new Date('2025-07-04T10:00:00-06:00')); // 10 AM local time
      const daytimeResult = getWindChartTimeWindow();
      
      expect(daytimeResult.startHour).toBe(4);
      expect(daytimeResult.endHour).toBe(23); // Show through current time
      expect(daytimeResult.isMultiDay).toBeUndefined(); // No isMultiDay property

      jest.useRealTimers();
    });

    it('should return full day window for evening hours (after 9pm)', () => {
      jest.useFakeTimers();
      
      // Test 10pm - should return full day window
      jest.setSystemTime(new Date('2025-07-04T22:00:00-06:00')); // 10 PM local time
      const eveningResult = getWindChartTimeWindow();
      
      expect(eveningResult.startHour).toBe(4);
      expect(eveningResult.endHour).toBe(21); // 9pm
      expect(eveningResult.isMultiDay).toBeUndefined(); // No isMultiDay property

      jest.useRealTimers();
    });
  });

  describe('filterWindDataByTimeWindow', () => {
    const mockWindData = [
      { time: '2025-07-03T06:00:00.000Z', windSpeed: 12 }, // Yesterday 6am UTC
      { time: '2025-07-03T12:00:00.000Z', windSpeed: 15 }, // Yesterday noon UTC
      { time: '2025-07-03T18:00:00.000Z', windSpeed: 18 }, // Yesterday 6pm UTC
      { time: '2025-07-04T06:00:00.000Z', windSpeed: 14 }, // Today 6am UTC
      { time: '2025-07-04T12:00:00.000Z', windSpeed: 20 }, // Today noon UTC
      { time: '2025-07-04T15:00:00.000Z', windSpeed: 22 }, // Today 3pm UTC
    ];

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle empty data array', () => {
      const timeWindow = { startHour: 4, endHour: 21, isMultiDay: false };
      const result = filterWindDataByTimeWindow([], timeWindow);
      
      expect(result).toEqual([]);
    });

    it('should handle null data input', () => {
      const timeWindow = { startHour: 4, endHour: 21, isMultiDay: false };
      const result = filterWindDataByTimeWindow(null as any, timeWindow);
      
      expect(result).toEqual([]);
    });

    it('should properly log when no data remains after filtering', () => {
      // Set up mock console.log to capture the logging
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T10:00:00-06:00')); // 10 AM local
      
      // Create data that will be filtered out (from tomorrow)
      const futureData = [
        {
          time: '2025-07-05T06:00:00-06:00', // Tomorrow at 6 AM
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
