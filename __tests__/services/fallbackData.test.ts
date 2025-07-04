import { EMERGENCY_FALLBACK_DATA } from '@/services/fallbackData';
import fallbackDataDefault from '@/services/fallbackData';

describe('Fallback Data Service', () => {
  describe('EMERGENCY_FALLBACK_DATA', () => {
    it('should export emergency fallback data', () => {
      expect(EMERGENCY_FALLBACK_DATA).toBeDefined();
      expect(Array.isArray(EMERGENCY_FALLBACK_DATA)).toBe(true);
      expect(EMERGENCY_FALLBACK_DATA.length).toBeGreaterThan(0);
    });

    it('should have valid wind data structure', () => {
      EMERGENCY_FALLBACK_DATA.forEach(dataPoint => {
        expect(dataPoint).toHaveProperty('time');
        expect(dataPoint).toHaveProperty('windSpeed');
        expect(dataPoint).toHaveProperty('windGust');
        expect(dataPoint).toHaveProperty('windDirection');
        
        // Validate data types
        expect(typeof dataPoint.time).toBe('string');
        expect(typeof dataPoint.windSpeed).toBe('string');
        expect(typeof dataPoint.windGust).toBe('string');
        expect(typeof dataPoint.windDirection).toBe('string');
        
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
      for (let i = 0; i < EMERGENCY_FALLBACK_DATA.length - 1; i++) {
        const currentTime = new Date(EMERGENCY_FALLBACK_DATA[i].time);
        const nextTime = new Date(EMERGENCY_FALLBACK_DATA[i + 1].time);
        expect(currentTime.getTime()).toBeGreaterThanOrEqual(nextTime.getTime());
      }
    });

    it('should have reasonable wind speed values', () => {
      EMERGENCY_FALLBACK_DATA.forEach(dataPoint => {
        const speed = parseFloat(String(dataPoint.windSpeed));
        const gust = parseFloat(String(dataPoint.windGust));
        
        // Wind speeds should be positive and within reasonable ranges
        expect(speed).toBeGreaterThanOrEqual(0);
        expect(speed).toBeLessThan(100); // Reasonable max wind speed
        
        // Gusts should be >= wind speed
        expect(gust).toBeGreaterThanOrEqual(speed);
        expect(gust).toBeLessThan(200); // Reasonable max gust speed
      });
    });

    it('should provide at least 5 data points for analysis', () => {
      expect(EMERGENCY_FALLBACK_DATA.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('default export', () => {
    it('should export the same data as named export', () => {
      expect(fallbackDataDefault).toBe(EMERGENCY_FALLBACK_DATA);
    });

    it('should be usable as default import', () => {
      expect(fallbackDataDefault).toBeDefined();
      expect(Array.isArray(fallbackDataDefault)).toBe(true);
      expect(fallbackDataDefault.length).toBe(EMERGENCY_FALLBACK_DATA.length);
    });
  });

  describe('data consistency', () => {
    it('should maintain consistent wind direction pattern', () => {
      // The fallback data should have a somewhat consistent wind direction
      // (all should be roughly southwest-ish: 200-250 degrees)
      EMERGENCY_FALLBACK_DATA.forEach(dataPoint => {
        const direction = parseFloat(String(dataPoint.windDirection));
        expect(direction).toBeGreaterThanOrEqual(200);
        expect(direction).toBeLessThanOrEqual(250);
      });
    });

    it('should span multiple hours for trend analysis', () => {
      const times = EMERGENCY_FALLBACK_DATA.map(d => new Date(d.time).getTime());
      const timeSpan = Math.max(...times) - Math.min(...times);
      const hoursSpan = timeSpan / (1000 * 60 * 60);
      
      // Should span at least 4 hours for meaningful analysis
      expect(hoursSpan).toBeGreaterThanOrEqual(4);
    });
  });
});
