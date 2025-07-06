import {
  formatLastUpdated,
  getCurrentWindSpeed,
  getCurrentWindDirection,
  getWindDirectionText,
  isDataStale,
  getDataFreshnessMessage,
  assessWindDirection,
  type WindDirectionAssessment
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
      windDirection: 315
    },
    {
      time: '2025-07-04T10:30:00.000Z',
      timestamp: 1720092600000,
      windSpeed: 7.1,
      windSpeedMph: 15.9,
      windGust: 9.2,
      windGustMph: 20.6,
      windDirection: 320
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

  describe('assessWindDirection', () => {
    const mockConfig = {
      name: 'Test Station',
      subtitle: 'Test Location',
      idealWindDirection: {
        range: { min: 270, max: 330 },
        perfect: 295,
        perfectTolerance: 15
      }
    };

    it('should return valid assessment for optimal direction', () => {
      const result = assessWindDirection(295, mockConfig);
      
      expect(result).not.toBe(null);
      if (result) {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('indicator');
        expect(result).toHaveProperty('description');
        expect(typeof result.status).toBe('string');
        expect(typeof result.indicator).toBe('string');
        expect(typeof result.description).toBe('string');
      }
    });

    it('should return valid assessment for good direction', () => {
      const result = assessWindDirection(285, mockConfig);
      
      expect(result).not.toBe(null);
      if (result) {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('indicator');
        expect(result).toHaveProperty('description');
      }
    });

    it('should return valid assessment for poor direction', () => {
      const result = assessWindDirection(180, mockConfig);
      
      expect(result).not.toBe(null);
      if (result) {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('indicator');
        expect(result).toHaveProperty('description');
      }
    });

    it('should return null for null direction', () => {
      const result = assessWindDirection(null, mockConfig);
      expect(result).toBe(null);
    });

    it('should return null when config missing ideal wind direction', () => {
      const configWithoutIdeal = {
        name: 'Test Station',
        subtitle: 'Test Location'
      };
      
      const result = assessWindDirection(295, configWithoutIdeal);
      expect(result).toBe(null);
    });
  });

  describe('Edge Cases and Internal Function Coverage', () => {
    it('should handle negative wind directions in normalization', () => {
      // This tests the normalizeWindDirection function with negative values
      // which should trigger the while loop (lines 132-133)
      const configWithNegativeIdeal = {
        name: 'Test Station',
        subtitle: 'Test Location',
        idealWindDirection: {
          perfect: -30, // This will be normalized to 330
          range: { min: -50, max: -10 }, // This will be normalized to 310-350
          perfectTolerance: 5 // Small tolerance to get 'ideal' not 'perfect'
        }
      };
      
      const result = assessWindDirection(315, configWithNegativeIdeal); // Should be in ideal range
      expect(result).not.toBe(null);
      expect(result?.status).toBe('ideal'); // Should be in range after normalization
    });

    it('should handle wind directions greater than 360 degrees', () => {
      // This tests the normalizeWindDirection function with values >= 360
      // which should trigger the second while loop (line 133)
      const configWithLargeIdeal = {
        name: 'Test Station',
        subtitle: 'Test Location',
        idealWindDirection: {
          perfect: 450, // This will be normalized to 90
          range: { min: 440, max: 480 }, // This will be normalized to 80-120
          perfectTolerance: 3 // Small tolerance to avoid perfect match
        }
      };
      
      const result = assessWindDirection(100, configWithLargeIdeal); // Should be in ideal range but not perfect
      expect(result).not.toBe(null);
      expect(result?.status).toBe('ideal'); // Should be in range after normalization
    });

    it('should handle wrap-around wind direction ranges', () => {
      // This tests the wrap-around logic in isDirectionInRange (line 158)
      const configWithWrapAround = {
        name: 'Test Station',
        subtitle: 'Test Location',
        idealWindDirection: {
          perfect: 10,
          perfectTolerance: 5, // Small tolerance to avoid perfect match
          range: { min: 350, max: 30 } // Wrap-around range: 350-360 and 0-30
        }
      };
      
      // Test direction in the wrap-around range
      const result1 = assessWindDirection(355, configWithWrapAround); // Should be in range
      expect(result1?.status).toBe('ideal');
      
      const result2 = assessWindDirection(25, configWithWrapAround); // Should be in range, far from perfect
      expect(result2?.status).toBe('ideal');
      
      const result3 = assessWindDirection(180, configWithWrapAround); // Should NOT be in range
      expect(result3?.status).toBe('suboptimal');
    });

    it('should handle large angular differences in direction distance calculation', () => {
      // This tests the diff > 180 case in getDirectionDistance (line 171)
      const configForLargeDistance = {
        name: 'Test Station',
        subtitle: 'Test Location',
        idealWindDirection: {
          perfect: 10, // Perfect direction at 10°
          perfectTolerance: 5, // Small tolerance
          range: { min: 350, max: 30 }
        }
      };
      
      // Test with direction that's >180° away, should calculate shorter distance
      const result = assessWindDirection(200, configForLargeDistance); // 200° is far from 10°
      expect(result?.status).toBe('suboptimal');
      expect(result?.description).toContain('150°'); // Should calculate shorter distance to range
    });

    it('should handle directions outside ideal range', () => {
      // This tests the fallback case in assessWindDirection (line 209+)
      const config = {
        name: 'Test Station', 
        subtitle: 'Test Location',
        idealWindDirection: {
          perfect: 270,
          perfectTolerance: 5,
          range: { min: 240, max: 300 }
        }
      };
      
      // Test direction far outside the ideal range
      const result = assessWindDirection(90, config); // 90° is far from 240-300 range
      expect(result?.status).toBe('suboptimal');
      expect(result?.indicator).toBe('📍'); // This is the actual indicator used
      expect(result?.description).toContain('from ideal range');
    });

    it('should handle edge case with exact boundary directions', () => {
      const config = {
        name: 'Test Station',
        subtitle: 'Test Location',
        idealWindDirection: {
          perfect: 270,
          range: { min: 240, max: 300 }
        }
      };
      
      // Test exact boundary cases
      const result1 = assessWindDirection(240, config); // Exact min boundary
      expect(result1?.status).toBe('ideal');
      
      const result2 = assessWindDirection(300, config); // Exact max boundary  
      expect(result2?.status).toBe('ideal');
      
      const result3 = assessWindDirection(270, config); // Exact perfect direction
      expect(result3?.status).toBe('perfect');
    });
  });
});
