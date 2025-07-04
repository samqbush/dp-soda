// Mock the config before importing services
jest.mock('@/config/ecowittConfig', () => ({
  getRequiredEnvVar: jest.fn((name: string) => {
    const mockValues: Record<string, string> = {
      'ECOWITT_APPLICATION_KEY': 'test-app-key',
      'ECOWITT_API_KEY': 'test-api-key',
      'ECOWITT_MAC_ADDRESS': 'test-mac-address',
    };
    return mockValues[name] || 'test-value';
  }),
}));

import {
  convertToWindDataPoint,
  analyzeOverallTransmissionQuality,
  type EcowittWindDataPoint,
  type TransmissionQualityInfo
} from '@/services/ecowittService';
import { type WindDataPoint } from '@/services/windService';

describe('Data Transformation Accuracy Tests', () => {
  describe('convertToWindDataPoint', () => {
    it('should correctly convert Ecowitt data to WindDataPoint format', () => {
      const ecowittData: EcowittWindDataPoint[] = [
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 5.2, // m/s
          windSpeedMph: 11.6, // mph
          windGust: 6.8, // m/s
          windGustMph: 15.2, // mph
          windDirection: 315,
          temperature: 22.5,
          humidity: 65
        },
        {
          time: '2025-07-04T10:05:00.000Z',
          timestamp: 1720091100000,
          windSpeed: 7.1, // m/s
          windSpeedMph: 15.9, // mph
          windGust: 9.2, // m/s
          windGustMph: 20.6, // mph
          windDirection: 320,
          temperature: 23.1,
          humidity: 62
        }
      ];

      const result = convertToWindDataPoint(ecowittData);

      expect(result).toHaveLength(2);
      
      // First data point
      expect(result[0].time).toBe('2025-07-04T10:00:00.000Z');
      expect(result[0].timestamp).toBe(1720090800000);
      expect(result[0].windSpeed).toBe(11.6); // Should use MPH value
      expect(result[0].windSpeedMph).toBe(11.6);
      expect(result[0].windGust).toBe(15.2); // Should use MPH value
      expect(result[0].windDirection).toBe(315);

      // Second data point
      expect(result[1].windSpeed).toBe(15.9);
      expect(result[1].windDirection).toBe(320);
    });

    it('should handle empty array', () => {
      const result = convertToWindDataPoint([]);
      expect(result).toEqual([]);
    });

    it('should handle missing optional fields', () => {
      const ecowittData: EcowittWindDataPoint[] = [
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 5.2,
          windSpeedMph: 11.6,
          windGust: 6.8,
          windGustMph: 15.2,
          windDirection: 315
          // Missing temperature, humidity, transmissionQuality
        }
      ];

      const result = convertToWindDataPoint(ecowittData);

      expect(result).toHaveLength(1);
      expect(result[0].windSpeed).toBe(11.6);
      expect(result[0].windDirection).toBe(315);
    });
  });

  describe('Unit conversion accuracy', () => {
    it('should maintain precision in mph values', () => {
      const ecowittData: EcowittWindDataPoint[] = [
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 8.94, // m/s
          windSpeedMph: 20.0, // mph (exact conversion)
          windGust: 11.18, // m/s
          windGustMph: 25.0, // mph (exact conversion)
          windDirection: 315
        }
      ];

      const result = convertToWindDataPoint(ecowittData);

      expect(result[0].windSpeed).toBe(20.0);
      expect(result[0].windGust).toBe(25.0);
    });

    it('should handle decimal precision correctly', () => {
      const ecowittData: EcowittWindDataPoint[] = [
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 6.7, // m/s
          windSpeedMph: 14.99, // mph (rounded)
          windGust: 8.5, // m/s
          windGustMph: 19.01, // mph (rounded)
          windDirection: 297
        }
      ];

      const result = convertToWindDataPoint(ecowittData);

      expect(result[0].windSpeed).toBe(14.99);
      expect(result[0].windGust).toBe(19.01);
    });
  });

  describe('analyzeOverallTransmissionQuality', () => {
    it('should identify full transmission with complete data', () => {
      const windData: EcowittWindDataPoint[] = [
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 5.2,
          windSpeedMph: 11.6,
          windGust: 6.8,
          windGustMph: 15.2,
          windDirection: 315,
          temperature: 22.5,
          humidity: 65,
          transmissionQuality: {
            isFullTransmission: true,
            hasOutdoorSensors: true,
            missingDataFields: []
          }
        },
        {
          time: '2025-07-04T10:05:00.000Z',
          timestamp: 1720091100000,
          windSpeed: 7.1,
          windSpeedMph: 15.9,
          windGust: 9.2,
          windGustMph: 20.6,
          windDirection: 320,
          temperature: 23.1,
          humidity: 62,
          transmissionQuality: {
            isFullTransmission: true,
            hasOutdoorSensors: true,
            missingDataFields: []
          }
        }
      ];

      const result = analyzeOverallTransmissionQuality(windData);

      expect(result.isFullTransmission).toBe(true);
      expect(result.hasOutdoorSensors).toBe(true);
      expect(result.hasWindData).toBe(true);
      expect(result.hasCompleteSensorData).toBe(true);
      expect(result.transmissionGaps).toEqual([]);
      expect(result.currentTransmissionStatus).toBe('good'); // Correct expected value
    });

    it('should identify transmission gaps', () => {
      const windData: EcowittWindDataPoint[] = [
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 5.2,
          windSpeedMph: 11.6,
          windGust: 6.8,
          windGustMph: 15.2,
          windDirection: 315,
          transmissionQuality: {
            isFullTransmission: true,
            hasOutdoorSensors: true,
            missingDataFields: []
          }
        },
        {
          time: '2025-07-04T10:05:00.000Z',
          timestamp: 1720091100000,
          windSpeed: 0,
          windSpeedMph: 0,
          windGust: 0,
          windGustMph: 0,
          windDirection: 0,
          transmissionQuality: {
            isFullTransmission: false,
            hasOutdoorSensors: false,
            missingDataFields: ['wind', 'outdoor_temperature', 'outdoor_humidity']
          }
        }
      ];

      const result = analyzeOverallTransmissionQuality(windData);

      // Since we have one good transmission, isFullTransmission should still be true
      // The algorithm checks if ANY point has full transmission
      expect(result.isFullTransmission).toBe(true);
      expect(result.hasOutdoorSensors).toBe(true); // At least one point has outdoor sensors
      expect(result.currentTransmissionStatus).toBe('offline'); // Based on latest point
    });

    it('should handle empty wind data', () => {
      const result = analyzeOverallTransmissionQuality([]);

      expect(result.isFullTransmission).toBe(false);
      expect(result.hasOutdoorSensors).toBe(false);
      expect(result.hasWindData).toBe(false);
      expect(result.currentTransmissionStatus).toBe('offline');
    });

    it('should detect transmission gaps with sufficient duration', () => {
      const windData: EcowittWindDataPoint[] = [
        // Good transmission
        {
          time: '2025-07-04T10:00:00.000Z',
          timestamp: 1720090800000,
          windSpeed: 5.2, windSpeedMph: 11.6, windGust: 6.8, windGustMph: 15.2, windDirection: 315,
          transmissionQuality: { isFullTransmission: true, hasOutdoorSensors: true, missingDataFields: [] }
        },
        // Bad transmission after 20-minute gap (should trigger gap detection)
        {
          time: '2025-07-04T10:20:00.000Z', // 20 minutes later
          timestamp: 1720092000000,
          windSpeed: 0, windSpeedMph: 0, windGust: 0, windGustMph: 0, windDirection: 0,
          transmissionQuality: { isFullTransmission: false, hasOutdoorSensors: false, missingDataFields: ['wind'] }
        }
      ];

      const result = analyzeOverallTransmissionQuality(windData);

      // Should detect a temporal gap (20 minutes > 10 minute threshold and > 15 minute reporting threshold)
      expect(result.transmissionGaps.length).toBeGreaterThan(0);
      expect(result.isFullTransmission).toBe(true); // At least one point has full transmission
      expect(result.currentTransmissionStatus).toBe('offline'); // Based on latest point
    });
  });
});
