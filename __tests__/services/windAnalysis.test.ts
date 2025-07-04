import {
  analyzeWindData,
  analyzeRecentWindData,
  type WindDataPoint,
  type AlarmCriteria,
  type WindAnalysis
} from '@/services/windService';

describe('Wind Analysis Accuracy Tests', () => {
  // Sample wind data that matches the format from your real API
  const createWindDataPoint = (
    time: Date,
    windSpeed: number,
    windDirection: number,
    windGust?: number
  ): WindDataPoint => ({
    time: time.toISOString(),
    timestamp: time.getTime(),
    windSpeed: windSpeed.toString(),
    windSpeedMph: windSpeed,
    windGust: (windGust || windSpeed).toString(),
    windDirection: windDirection.toString()
  });

  const defaultCriteria: AlarmCriteria = {
    minimumAverageSpeed: 15,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    directionDeviationThreshold: 45,
    preferredDirection: 315, // Northwest (like Soda Lake)
    preferredDirectionRange: 45,
    useWindDirection: true,
    alarmEnabled: false,
    alarmTime: "05:00"
  };

  describe('analyzeRecentWindData', () => {
    it('should correctly identify good wind conditions', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 18, 315), // 50 min ago
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 20, 320), // 40 min ago
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 22, 310), // 30 min ago
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 19, 325), // 20 min ago
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 21, 315), // 10 min ago
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      expect(result.isAlarmWorthy).toBe(true);
      expect(result.averageSpeed).toBeCloseTo(20, 1);
      expect(result.directionConsistency).toBeGreaterThan(70);
      expect(result.consecutiveGoodPoints).toBeGreaterThanOrEqual(4);
    });

    it('should correctly identify weak wind conditions', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 8, 315),  // Too weak
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 10, 320), // Too weak
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 12, 310), // Too weak
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 9, 325),  // Too weak
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 11, 315), // Too weak
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      expect(result.isAlarmWorthy).toBe(false);
      expect(result.averageSpeed).toBeCloseTo(10, 1);
      expect(result.consecutiveGoodPoints).toBe(0);
    });

    it('should correctly identify inconsistent wind direction', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 20, 90),  // East - wrong direction
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 22, 180), // South - wrong direction
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 18, 270), // West - wrong direction
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 21, 45),  // Northeast - wrong direction
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 19, 135), // Southeast - wrong direction
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      expect(result.isAlarmWorthy).toBe(false);
      expect(result.averageSpeed).toBeCloseTo(20, 1); // Good speed
      expect(result.directionConsistency).toBeLessThan(70); // Poor direction consistency
    });

    it('should handle empty wind data gracefully', () => {
      const result = analyzeRecentWindData([], defaultCriteria);

      expect(result.isAlarmWorthy).toBe(false);
      expect(result.averageSpeed).toBe(0);
      expect(result.directionConsistency).toBe(0);
      expect(result.consecutiveGoodPoints).toBe(0);
      expect(result.analysis).toContain('No wind data available');
    });

    it('should correctly filter data to last hour only', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        // Old data (should be ignored)
        createWindDataPoint(new Date(now.getTime() - 2 * 60 * 60 * 1000), 25, 315), // 2 hours ago
        createWindDataPoint(new Date(now.getTime() - 90 * 60 * 1000), 24, 320),     // 1.5 hours ago
        
        // Recent data (should be included)
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 18, 315), // 50 min ago
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 20, 320), // 30 min ago
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 19, 315), // 10 min ago
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      // Should only consider the last 3 data points (within 1 hour)
      expect(result.averageSpeed).toBeCloseTo(19, 1); // (18+20+19)/3 = 19
    });
  });

  describe('Speed calculation accuracy', () => {
    it('should correctly convert string speeds to numbers', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        {
          time: now.toISOString(),
          timestamp: now.getTime(),
          windSpeed: "18.5", // String format
          windGust: "22.3",
          windDirection: "315"
        },
        {
          time: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          timestamp: now.getTime() - 10 * 60 * 1000,
          windSpeed: "20.7", // String format
          windGust: "25.1",
          windDirection: "320"
        }
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      expect(result.averageSpeed).toBeCloseTo(19.6, 1); // (18.5 + 20.7) / 2
    });

    it('should handle mixed string and number speeds', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(now, 18.5, 315),
        {
          time: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          windSpeed: "20.7", // String
          windGust: "25.1",
          windDirection: "320"
        }
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);
      
      expect(result.averageSpeed).toBeCloseTo(19.6, 1);
    });
  });

  describe('Direction consistency calculation', () => {
    it('should correctly calculate consistency for similar directions', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 20, 315),
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 22, 320),
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 18, 310),
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 21, 325),
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      // Directions are 315, 320, 310, 325 - very consistent around 320
      expect(result.directionConsistency).toBeGreaterThan(85);
    });

    it('should correctly calculate low consistency for scattered directions', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 20, 0),   // North
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 22, 90),  // East
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 18, 180), // South
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 21, 270), // West
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      expect(result.directionConsistency).toBeLessThan(50);
    });

    it('should handle 360/0 degree boundary correctly', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 20, 350), // Close to north
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 22, 10),  // Close to north
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 18, 5),   // Close to north
      ];

      const result = analyzeRecentWindData(windData, defaultCriteria);

      // These should be considered consistent despite crossing 0/360 boundary
      expect(result.directionConsistency).toBeGreaterThan(75);
    });
  });

  describe('Soda Lake specific criteria tests', () => {
    const sodaLakeCriteria: AlarmCriteria = {
      ...defaultCriteria,
      preferredDirection: 315, // Northwest
      preferredDirectionRange: 45,
    };

    it('should accept ideal Soda Lake wind direction (315°)', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 20, 315),
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 22, 315),
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 18, 315),
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 21, 315),
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 19, 315),
      ];

      const result = analyzeRecentWindData(windData, sodaLakeCriteria);
      expect(result.isAlarmWorthy).toBe(true);
      expect(result.averageSpeed).toBeCloseTo(20, 1);
      expect(result.consecutiveGoodPoints).toBeGreaterThanOrEqual(4);
    });

    it('should accept wind within Soda Lake direction range (270-360°)', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 20, 290), // Within range
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 22, 340), // Within range  
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 18, 300), // Within range
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 21, 330), // Within range
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 19, 310), // Within range
      ];

      const result = analyzeRecentWindData(windData, sodaLakeCriteria);
      expect(result.isAlarmWorthy).toBe(true);
      expect(result.averageSpeed).toBeCloseTo(20, 1);
      expect(result.consecutiveGoodPoints).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Standley Lake specific criteria tests', () => {
    const standleyLakeCriteria: AlarmCriteria = {
      ...defaultCriteria,
      preferredDirection: 270, // West
      preferredDirectionRange: 45,
    };

    it('should accept ideal Standley Lake wind direction (270°)', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 20, 270),
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 22, 270),
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 18, 270),
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 21, 270),
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 19, 270),
      ];

      const result = analyzeRecentWindData(windData, standleyLakeCriteria);
      expect(result.isAlarmWorthy).toBe(true);
      expect(result.averageSpeed).toBeCloseTo(20, 1);
      expect(result.consecutiveGoodPoints).toBeGreaterThanOrEqual(4);
    });

    it('should accept wind within Standley Lake direction range (225-315°)', () => {
      const now = new Date();
      const windData: WindDataPoint[] = [
        createWindDataPoint(new Date(now.getTime() - 50 * 60 * 1000), 20, 250), // Within range
        createWindDataPoint(new Date(now.getTime() - 40 * 60 * 1000), 22, 290), // Within range
        createWindDataPoint(new Date(now.getTime() - 30 * 60 * 1000), 18, 300), // Within range
        createWindDataPoint(new Date(now.getTime() - 20 * 60 * 1000), 21, 280), // Within range
        createWindDataPoint(new Date(now.getTime() - 10 * 60 * 1000), 19, 270), // Within range
      ];

      const result = analyzeRecentWindData(windData, standleyLakeCriteria);
      expect(result.isAlarmWorthy).toBe(true);
      expect(result.averageSpeed).toBeCloseTo(20, 1);
      expect(result.consecutiveGoodPoints).toBeGreaterThanOrEqual(4);
    });
  });
});
