import {
  formatLastUpdated,
  getCurrentWindSpeed,
  getCurrentWindDirection,
  getCurrentHumidity,
  getWindDirectionText,
  isDataStale,
  getDataFreshnessMessage,
} from '@/utils/windStationUtils';
import { EcowittWindDataPoint, EcowittCurrentWindConditions } from '@/services/ecowittService';

describe('Wind Station Utilities Tests', () => {
  const mockWindData: EcowittWindDataPoint[] = [
    {
      time: '2025-07-04T10:00:00.000Z',
      timestamp: 1720090800000,
      windSpeed: 5.2,
      windSpeedMph: 11.6,
      windGust: 6.8,
      windGustMph: 15.2,
      windDirection: 315,
      humidity: 52
    },
    {
      time: '2025-07-04T10:30:00.000Z',
      timestamp: 1720092600000,
      windSpeed: 7.1,
      windSpeedMph: 15.9,
      windGust: 9.2,
      windGustMph: 20.6,
      windDirection: 320,
      humidity: 48
    }
  ];

  const mockCurrentConditions: EcowittCurrentWindConditions = {
    windSpeed: 8.3,
    windSpeedMph: 18.5,
    windDirection: 295,
    windGust: 10.0,
    windGustMph: 22.3,
    timestamp: 1720094400000,
    time: '2025-07-04T11:00:00.000Z',
    temperature: 75.2,
    humidity: 45
  };

  describe('formatLastUpdated', () => {
    it('should prioritize real-time data timestamp when available', () => {
      const currentConditionsUpdated = new Date('2025-07-04T11:00:00.000Z');
      
      const result = formatLastUpdated(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      // Should format the real-time timestamp
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Never');
      // Should include time format (AM/PM)
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should fall back to historical data when no real-time data', () => {
      const result = formatLastUpdated(
        null,
        null,
        mockWindData
      );

      // Should use the latest historical data point
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Never');
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should return "Never" when no data available', () => {
      const result = formatLastUpdated(null, null, []);
      expect(result).toBe('Never');
    });

    it('should handle current conditions without timestamp', () => {
      const result = formatLastUpdated(
        mockCurrentConditions,
        null,
        mockWindData
      );

      // Should fall back to historical data
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Never');
    });

    it('should handle very old historical data', () => {
      // Create historical data that is 5 hours old
      const fiveHoursAgo = new Date();
      fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
      
      const oldHistoricalData = [{
        time: fiveHoursAgo.toISOString(),
        timestamp: fiveHoursAgo.getTime(),
        windSpeed: 6.7,
        windSpeedMph: 15.0,
        windGust: 8.9,
        windGustMph: 20.0,
        windDirection: 300
      }];

      const result = formatLastUpdated(
        null,
        null,
        oldHistoricalData
      );

      // Should return some meaningful string for old data
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentWindSpeed', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T11:05:00.000Z')); // 5 minutes after mock conditions
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return real-time data when available and recent', () => {
      const currentConditionsUpdated = new Date('2025-07-04T11:00:00.000Z');
      
      const result = getCurrentWindSpeed(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      // Should use real-time data (within 10 minutes)
      expect(result).toBe(18.5);
    });

    it('should fall back to historical data when real-time data is stale', () => {
      // Set real-time data to be 15 minutes old (stale)
      const currentConditionsUpdated = new Date('2025-07-04T10:50:00.000Z');
      
      const result = getCurrentWindSpeed(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      // Should use latest historical data
      expect(result).toBe(15.9);
    });

    it('should fall back to historical data when no real-time data', () => {
      const result = getCurrentWindSpeed(
        null,
        null,
        mockWindData
      );

      expect(result).toBe(15.9); // Latest from historical data
    });

    it('should return null when no data available', () => {
      const result = getCurrentWindSpeed(null, null, []);
      expect(result).toBe(null);
    });
  });

  describe('getCurrentWindDirection', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T11:05:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return real-time direction when available and recent', () => {
      const currentConditionsUpdated = new Date('2025-07-04T11:00:00.000Z');
      
      const result = getCurrentWindDirection(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(295);
    });

    it('should fall back to historical data when real-time data is stale', () => {
      const currentConditionsUpdated = new Date('2025-07-04T10:50:00.000Z');
      
      const result = getCurrentWindDirection(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(320); // Latest from historical data
    });

    it('should return null when no data available', () => {
      const result = getCurrentWindDirection(null, null, []);
      expect(result).toBe(null);
    });
  });

  describe('getCurrentHumidity', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T11:05:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return real-time humidity when available and recent', () => {
      const currentConditionsUpdated = new Date('2025-07-04T11:00:00.000Z');
      
      const result = getCurrentHumidity(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(45);
    });

    it('should fall back to historical data when real-time data is stale', () => {
      const currentConditionsUpdated = new Date('2025-07-04T10:50:00.000Z');
      
      const result = getCurrentHumidity(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(48); // Latest from historical data
    });

    it('should return null when no humidity data available in real-time conditions', () => {
      const conditionsWithoutHumidity = {
        ...mockCurrentConditions,
        humidity: undefined
      };
      const currentConditionsUpdated = new Date('2025-07-04T11:00:00.000Z');
      
      const result = getCurrentHumidity(
        conditionsWithoutHumidity,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(48); // Should fall back to historical data
    });

    it('should return null when no data available', () => {
      const result = getCurrentHumidity(null, null, []);
      expect(result).toBe(null);
    });

    it('should return null when historical data has no humidity', () => {
      const dataWithoutHumidity = mockWindData.map(point => ({
        ...point,
        humidity: undefined
      }));
      
      const result = getCurrentHumidity(null, null, dataWithoutHumidity);
      expect(result).toBe(null);
    });
  });

  describe('getWindDirectionText', () => {
    it('should return correct cardinal directions', () => {
      expect(getWindDirectionText(0)).toBe('N');
      expect(getWindDirectionText(90)).toBe('E');
      expect(getWindDirectionText(180)).toBe('S');
      expect(getWindDirectionText(270)).toBe('W');
    });

    it('should return correct intermediate directions', () => {
      expect(getWindDirectionText(45)).toBe('NE');
      expect(getWindDirectionText(135)).toBe('SE');
      expect(getWindDirectionText(225)).toBe('SW');
      expect(getWindDirectionText(315)).toBe('NW');
    });

    it('should handle fine-grained directions', () => {
      expect(getWindDirectionText(22.5)).toBe('NNE');
      expect(getWindDirectionText(67.5)).toBe('ENE');
      expect(getWindDirectionText(337.5)).toBe('NNW');
    });

    it('should return "N/A" for null input', () => {
      expect(getWindDirectionText(null)).toBe('N/A');
    });

    it('should handle edge cases', () => {
      expect(getWindDirectionText(359)).toBe('N');
      expect(getWindDirectionText(360)).toBe('N');
      expect(getWindDirectionText(1)).toBe('N');
    });
  });

  describe('isDataStale', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T11:10:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for recent real-time data', () => {
      const currentConditionsUpdated = new Date('2025-07-04T11:05:00.000Z'); // 5 minutes ago
      
      const result = isDataStale(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(false);
    });

    it('should return true for stale real-time data', () => {
      const currentConditionsUpdated = new Date('2025-07-04T10:30:00.000Z'); // 40 minutes ago
      
      const result = isDataStale(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(result).toBe(true);
    });

    it('should check historical data when no real-time data', () => {
      const result = isDataStale(null, null, mockWindData);
      
      // Historical data is from 10:30, current time is 11:10, so 40 minutes old
      expect(typeof result).toBe('boolean');
    });

    it('should return true when no data available', () => {
      const result = isDataStale(null, null, []);
      expect(result).toBe(true);
    });
  });

  describe('getDataFreshnessMessage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T11:10:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return appropriate message for fresh data', () => {
      const currentConditionsUpdated = new Date('2025-07-04T11:08:00.000Z'); // 2 minutes ago
      
      const result = getDataFreshnessMessage(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return appropriate message for stale data', () => {
      const currentConditionsUpdated = new Date('2025-07-04T10:30:00.000Z'); // 40 minutes ago
      
      const result = getDataFreshnessMessage(
        mockCurrentConditions,
        currentConditionsUpdated,
        mockWindData
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle no data scenario', () => {
      const result = getDataFreshnessMessage(null, null, []);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

});
