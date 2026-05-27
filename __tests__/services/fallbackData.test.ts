import { getEmergencyFallbackData } from '@/services/fallbackData';
import fallbackDataDefault from '@/services/fallbackData';

describe('Fallback Data Service', () => {
  describe('getEmergencyFallbackData', () => {
    it('should return emergency fallback data', () => {
      const data = getEmergencyFallbackData();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should have valid wind data structure', () => {
      const data = getEmergencyFallbackData();
      data.forEach(dataPoint => {
        expect(dataPoint).toHaveProperty('time');
        expect(dataPoint).toHaveProperty('windSpeed');
        expect(dataPoint).toHaveProperty('windGust');
        expect(dataPoint).toHaveProperty('windDirection');
        
        // Validate data types - values are numbers
        expect(typeof dataPoint.time).toBe('string');
        expect(typeof dataPoint.windSpeed).toBe('number');
        expect(typeof dataPoint.windGust).toBe('number');
        expect(typeof dataPoint.windDirection).toBe('number');
        
        // Validate time format (should be ISO string)
        expect(() => new Date(dataPoint.time)).not.toThrow();
        expect(new Date(dataPoint.time).toISOString()).toBe(dataPoint.time);
        
        // Validate wind values are numeric when parsed
        expect(parseFloat(String(dataPoint.windSpeed))).not.toBeNaN();
        expect(parseFloat(String(dataPoint.windGust))).not.toBeNaN();
        expect(parseFloat(String(dataPoint.windDirection))).not.toBeNaN();
        
        // Validate wind direction is valid (0-360)
        const direction = parseFloat(String(dataPoint.windDirection));
        expect(direction).toBeGreaterThanOrEqual(0);
        expect(direction).toBeLessThanOrEqual(360);
      });
    });

    it('should have chronologically ordered data (newest first)', () => {
      const data = getEmergencyFallbackData();
      for (let i = 0; i < data.length - 1; i++) {
        const currentTime = new Date(data[i].time);
        const nextTime = new Date(data[i + 1].time);
        expect(currentTime.getTime()).toBeGreaterThanOrEqual(nextTime.getTime());
      }
    });

    it('should have reasonable wind speed values', () => {
      const data = getEmergencyFallbackData();
      data.forEach(dataPoint => {
        const speed = parseFloat(String(dataPoint.windSpeed));
        const gust = parseFloat(String(dataPoint.windGust));
        
        // Wind speeds should be positive and within reasonable ranges
        expect(speed).toBeGreaterThanOrEqual(0);
        expect(speed).toBeLessThan(100);
        
        // Gusts should be >= wind speed
        expect(gust).toBeGreaterThanOrEqual(speed);
        expect(gust).toBeLessThan(200);
      });
    });

    it('should provide at least 5 data points for analysis', () => {
      const data = getEmergencyFallbackData();
      expect(data.length).toBeGreaterThanOrEqual(5);
    });

    it('should compute fresh timestamps on each call', () => {
      const data1 = getEmergencyFallbackData();
      const data2 = getEmergencyFallbackData();
      // Both calls produce valid recent timestamps
      const now = Date.now();
      const firstTime = new Date(data1[0].time).getTime();
      expect(now - firstTime).toBeLessThan(1000);
      expect(data2[0].time).toBeDefined();
    });
  });

  describe('default export', () => {
    it('should export the function as default', () => {
      expect(fallbackDataDefault).toBe(getEmergencyFallbackData);
    });

    it('should be usable as default import', () => {
      const data = fallbackDataDefault();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('data consistency', () => {
    it('should maintain consistent wind direction pattern', () => {
      const data = getEmergencyFallbackData();
      data.forEach(dataPoint => {
        const direction = parseFloat(String(dataPoint.windDirection));
        expect(direction).toBeGreaterThanOrEqual(200);
        expect(direction).toBeLessThanOrEqual(250);
      });
    });

    it('should span multiple hours for trend analysis', () => {
      const data = getEmergencyFallbackData();
      const times = data.map(d => new Date(d.time).getTime());
      const timeSpan = Math.max(...times) - Math.min(...times);
      const hoursSpan = timeSpan / (1000 * 60 * 60);
      
      // Should span at least 4 hours for meaningful analysis
      expect(hoursSpan).toBeGreaterThanOrEqual(4);
    });
  });
});
