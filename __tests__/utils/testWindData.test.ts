import {
  generateGoodMorningData,
  generateWeakMorningData,
  generateInconsistentDirectionData,
  generateWrongDirectionData,
  generateFewGoodPointsData
} from '@/utils/testWindData';
import { WindDataPoint } from '@/services/windService';

// Helper function to convert string|number to number
const toNumber = (value: string | number): number => {
  return typeof value === 'string' ? parseFloat(value) : value;
};

describe('Test Wind Data Generators', () => {
  describe('generateGoodMorningData', () => {
    it('should generate 24 hours of wind data', () => {
      const data = generateGoodMorningData();
      
      expect(data).toHaveLength(24);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have proper WindDataPoint structure', () => {
      const data = generateGoodMorningData();
      
      data.forEach(point => {
        expect(point).toHaveProperty('time');
        expect(point).toHaveProperty('windSpeed');
        expect(point).toHaveProperty('windDirection');
        expect(typeof point.time).toBe('string');
        expect(typeof point.windSpeed).toBe('string'); // Values are stored as strings
        expect(typeof point.windDirection).toBe('string'); // Values are stored as strings
        
        // But should be convertible to numbers
        expect(toNumber(point.windSpeed)).not.toBeNaN();
        expect(toNumber(point.windDirection)).not.toBeNaN();
      });
    });

    it('should generate good morning conditions between 3-5am', () => {
      const data = generateGoodMorningData();
      
      // Find 3am and 4am data points
      const morningPoints = data.filter(point => {
        const hour = new Date(point.time).getHours();
        return hour >= 3 && hour < 5;
      });

      expect(morningPoints.length).toBe(2);
      
      morningPoints.forEach(point => {
        // Good conditions: 12-15 mph winds (but stored as kph strings, so ~19-24 kph)
        const speed = toNumber(point.windSpeed);
        const direction = toNumber(point.windDirection);
        
        expect(speed).toBeGreaterThanOrEqual(19); // ~12 mph in kph
        expect(speed).toBeLessThanOrEqual(25); // ~15.5 mph in kph with some tolerance
        
        // Northwest direction (around 315°) with some variation
        expect(direction).toBeGreaterThanOrEqual(305);
        expect(direction).toBeLessThanOrEqual(325);
      });
    });

    it('should have chronological timestamps', () => {
      const data = generateGoodMorningData();
      
      for (let i = 1; i < data.length; i++) {
        const prevTime = new Date(data[i - 1].time);
        const currTime = new Date(data[i].time);
        
        expect(currTime.getTime()).toBeGreaterThan(prevTime.getTime());
      }
    });

    it('should have valid wind direction values (0-360)', () => {
      const data = generateGoodMorningData();
      
      data.forEach(point => {
        const direction = toNumber(point.windDirection);
        expect(direction).toBeGreaterThanOrEqual(0);
        expect(direction).toBeLessThanOrEqual(360);
      });
    });

    it('should have reasonable wind speed values', () => {
      const data = generateGoodMorningData();
      
      data.forEach(point => {
        const speed = toNumber(point.windSpeed);
        expect(speed).toBeGreaterThanOrEqual(0);
        expect(speed).toBeLessThanOrEqual(50); // Reasonable upper limit
      });
    });
  });

  describe('generateWeakMorningData', () => {
    it('should generate 24 hours of wind data', () => {
      const data = generateWeakMorningData();
      
      expect(data).toHaveLength(24);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have proper WindDataPoint structure', () => {
      const data = generateWeakMorningData();
      
      data.forEach(point => {
        expect(point).toHaveProperty('time');
        expect(point).toHaveProperty('windSpeed');
        expect(point).toHaveProperty('windDirection');
      });
    });

    it('should generate weak morning conditions', () => {
      const data = generateWeakMorningData();
      
      // Find morning data points
      const morningPoints = data.filter(point => {
        const hour = new Date(point.time).getHours();
        return hour >= 3 && hour < 8;
      });

      expect(morningPoints.length).toBeGreaterThan(0);
      
      // Weak conditions should have lower wind speeds (comparing in kph)
      const avgMorningSpeed = morningPoints.reduce((sum, point) => sum + toNumber(point.windSpeed), 0) / morningPoints.length;
      expect(avgMorningSpeed).toBeLessThan(19); // Should be weaker than good morning data (~12 mph = 19 kph)
    });
  });

  describe('generateInconsistentDirectionData', () => {
    it('should generate wind data with varying directions', () => {
      const data = generateInconsistentDirectionData();
      
      expect(data).toHaveLength(24);
      
      // Calculate direction variance
      const directions = data.map(point => toNumber(point.windDirection));
      const maxDir = Math.max(...directions);
      const minDir = Math.min(...directions);
      const range = maxDir - minDir;
      
      // Should have significant direction variation
      expect(range).toBeGreaterThan(50); // More than 50 degrees of variation
    });

    it('should have inconsistent direction changes', () => {
      const data = generateInconsistentDirectionData();
      
      // Count direction changes greater than 30 degrees
      let bigChanges = 0;
      for (let i = 1; i < data.length; i++) {
        const prevDir = toNumber(data[i - 1].windDirection);
        const currDir = toNumber(data[i].windDirection);
        const change = Math.abs(currDir - prevDir);
        
        if (change > 30) {
          bigChanges++;
        }
      }
      
      // Should have multiple inconsistent direction changes
      expect(bigChanges).toBeGreaterThan(3);
    });
  });

  describe('generateWrongDirectionData', () => {
    it('should generate wind data with non-ideal directions', () => {
      const data = generateWrongDirectionData();
      
      expect(data).toHaveLength(24);
      
      // Find morning data points
      const morningPoints = data.filter(point => {
        const hour = new Date(point.time).getHours();
        return hour >= 3 && hour < 5; // Checking the specific implemented range
      });

      expect(morningPoints.length).toBeGreaterThan(0);
      
      // Wrong direction data should be around SE (135°), not in ideal NW range (270-330)
      morningPoints.forEach(point => {
        const direction = toNumber(point.windDirection);
        const isInIdealRange = direction >= 270 && direction <= 330;
        expect(isInIdealRange).toBe(false);
        
        // Should be around SE direction (135° ± 10°)
        expect(direction).toBeGreaterThanOrEqual(125);
        expect(direction).toBeLessThanOrEqual(145);
      });
    });

    it('should have consistent wrong directions', () => {
      const data = generateWrongDirectionData();
      
      const morningPoints = data.filter(point => {
        const hour = new Date(point.time).getHours();
        return hour >= 3 && hour < 5;
      });

      // Calculate direction consistency (should be consistent around SE)
      const directions = morningPoints.map(point => toNumber(point.windDirection));
      const avgDirection = directions.reduce((sum, dir) => sum + dir, 0) / directions.length;
      
      // Average should be around 135° (SE)
      expect(avgDirection).toBeGreaterThanOrEqual(125);
      expect(avgDirection).toBeLessThanOrEqual(145);
      
      // All directions should be relatively close to the average (consistent but wrong)
      directions.forEach(dir => {
        const difference = Math.abs(dir - avgDirection);
        expect(difference).toBeLessThan(15); // Allow some variation from the ±10° range
      });
    });
  });

  describe('generateFewGoodPointsData', () => {
    it('should generate data with 4 points per hour (96 total)', () => {
      const data = generateFewGoodPointsData();
      
      expect(data).toHaveLength(96); // 24 hours * 4 points per hour
      
      // Count points that might be considered "good"
      const morningPoints = data.filter(point => {
        const hour = new Date(point.time).getHours();
        return hour >= 3 && hour < 8;
      });

      const goodPoints = morningPoints.filter(point => {
        const hasGoodSpeed = toNumber(point.windSpeed) >= 19; // ~12 mph in kph
        const hasGoodDirection = toNumber(point.windDirection) >= 270 && toNumber(point.windDirection) <= 330;
        return hasGoodSpeed && hasGoodDirection;
      });

      // Should have few good points (less than half the morning period)
      expect(goodPoints.length).toBeLessThan(morningPoints.length / 2);
    });

    it('should have mixed conditions during morning hours', () => {
      const data = generateFewGoodPointsData();
      
      const morningPoints = data.filter(point => {
        const hour = new Date(point.time).getHours();
        return hour >= 3 && hour < 8;
      });

      // Should have variation in wind speeds
      const speeds = morningPoints.map(point => toNumber(point.windSpeed));
      const maxSpeed = Math.max(...speeds);
      const minSpeed = Math.min(...speeds);
      
      expect(maxSpeed - minSpeed).toBeGreaterThan(3); // Should have speed variation
    });
  });

  describe('Data Generator Consistency', () => {
    it('should generate different data sets on multiple calls', () => {
      const data1 = generateGoodMorningData();
      const data2 = generateGoodMorningData();
      
      // Should have some randomness (not identical)
      let identicalPoints = 0;
      for (let i = 0; i < data1.length; i++) {
        const speed1 = toNumber(data1[i].windSpeed);
        const speed2 = toNumber(data2[i].windSpeed);
        const dir1 = toNumber(data1[i].windDirection);
        const dir2 = toNumber(data2[i].windDirection);
        
        if (speed1 === speed2 && dir1 === dir2) {
          identicalPoints++;
        }
      }
      
      // Should not be completely identical due to randomness
      expect(identicalPoints).toBeLessThan(data1.length);
    });

    it('should have timestamps starting from midnight', () => {
      const generators = [
        generateGoodMorningData,
        generateWeakMorningData,
        generateInconsistentDirectionData,
        generateWrongDirectionData,
        generateFewGoodPointsData
      ];

      generators.forEach(generator => {
        const data = generator();
        const firstPoint = new Date(data[0].time);
        
        expect(firstPoint.getHours()).toBe(0);
        expect(firstPoint.getMinutes()).toBe(0);
        expect(firstPoint.getSeconds()).toBe(0);
      });
    });

    it('should generate hourly data points', () => {
      const data = generateGoodMorningData();
      
      for (let i = 0; i < data.length; i++) {
        const pointTime = new Date(data[i].time);
        expect(pointTime.getHours()).toBe(i);
        expect(pointTime.getMinutes()).toBe(0);
        expect(pointTime.getSeconds()).toBe(0);
      }
    });
  });
});
