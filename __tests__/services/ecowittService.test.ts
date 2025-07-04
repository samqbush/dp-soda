import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Mock the config first to prevent environment variable requirement
jest.mock('@/config/ecowittConfig', () => ({
  ECOWITT_CONFIG: {
    APPLICATION_KEY: 'test-app-key',
    API_KEY: 'test-api-key',
    DEVICE_NAME: 'test-device',
  },
  DEVICE_MAC_STORAGE_KEY: 'device_mac_address',
  MAC_ADDRESS_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
}));

import {
  getEcowittConfig,
  setEcowittConfig,
  selectDeviceByName,
  convertToWindDataPoint,
  analyzeOverallTransmissionQuality,
  type EcowittApiConfig,
  type EcowittDevice,
  type EcowittWindDataPoint,
} from '@/services/ecowittService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('axios');

describe('EcowittService Tests', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Management', () => {
    const mockConfig: EcowittApiConfig = {
      applicationKey: 'test-app-key',
      apiKey: 'test-api-key',
      macAddress: '00:11:22:33:44:55',
    };

    describe('getEcowittConfig', () => {
      it('should return config when stored as JSON', async () => {
        const configJson = JSON.stringify(mockConfig);
        mockAsyncStorage.getItem.mockResolvedValue(configJson);

        const result = await getEcowittConfig();

        expect(result).toEqual(mockConfig);
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('ecowitt_config');
      });

      it('should return null when no config is stored', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const result = await getEcowittConfig();

        expect(result).toBe(null);
      });

      it('should return null when config JSON is invalid', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await getEcowittConfig();

        expect(result).toBe(null);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading Ecowitt config:', expect.any(Error));
        
        consoleErrorSpy.mockRestore();
      });
    });

    describe('setEcowittConfig', () => {
      it('should save config as JSON to storage', async () => {
        mockAsyncStorage.setItem.mockResolvedValue();

        await setEcowittConfig(mockConfig);

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('ecowitt_config', JSON.stringify(mockConfig));
      });

      it('should handle storage errors', async () => {
        const storageError = new Error('Storage failed');
        mockAsyncStorage.setItem.mockRejectedValue(storageError);
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(setEcowittConfig(mockConfig)).rejects.toThrow('Storage failed');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving Ecowitt config:', storageError);
        
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('Device Management', () => {
    const mockDevices: EcowittDevice[] = [
      {
        id: 1,
        name: 'Soda Lake Weather Station',
        mac: '00:11:22:33:44:55',
        type: 1,
        date_zone_id: 'America/Denver',
        createtime: 1640995200,
        longitude: -105.1234,
        latitude: 39.5678,
        stationtype: 'GW1000',
        iotdevice_list: [],
      },
      {
        id: 2,
        name: 'Standley Lake Station',
        mac: '00:11:22:33:44:66',
        type: 1,
        date_zone_id: 'America/Denver',
        createtime: 1640995200,
        longitude: -105.2345,
        latitude: 39.6789,
        stationtype: 'GW1000',
        iotdevice_list: [],
      },
    ];

    describe('selectDeviceByName', () => {
      it('should return device when found by exact name match', () => {
        const result = selectDeviceByName(mockDevices, 'Soda Lake Weather Station');
        expect(result).toBe(mockDevices[0]);
      });

      it('should return device when found by partial name match', () => {
        const result = selectDeviceByName(mockDevices, 'Soda Lake');
        expect(result).toBe(mockDevices[0]);
      });

      it('should return device when found by case-insensitive match', () => {
        const result = selectDeviceByName(mockDevices, 'soda lake');
        expect(result).toBe(mockDevices[0]);
      });

      it('should return null when device not found', () => {
        const result = selectDeviceByName(mockDevices, 'Non-existent Station');
        expect(result).toBe(null);
      });

      it('should return null when devices array is empty', () => {
        const result = selectDeviceByName([], 'Any Station');
        expect(result).toBe(null);
      });
    });
  });

  describe('Data Conversion', () => {
    describe('convertToWindDataPoint', () => {
      const mockEcowittDataArray: EcowittWindDataPoint[] = [
        {
          time: '2024-01-01T12:00:00Z',
          timestamp: 1704110400,
          windSpeed: 5.5, // m/s
          windSpeedMph: 12.3,
          windGust: 7.2, // m/s  
          windGustMph: 16.1,
          windDirection: 315,
          temperature: 20.5,
          humidity: 65,
        },
        {
          time: '2024-01-01T12:15:00Z',
          timestamp: 1704111300,
          windSpeed: 6.0,
          windSpeedMph: 13.4,
          windGust: 8.0,
          windGustMph: 17.9,
          windDirection: 320,
        },
      ];

      it('should convert array of Ecowitt data to WindDataPoint format', () => {
        const result = convertToWindDataPoint(mockEcowittDataArray);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          time: '2024-01-01T12:00:00Z',
          timestamp: 1704110400,
          windSpeed: 12.3, // Uses mph value
          windSpeedMph: 12.3,
          windGust: 16.1, // Uses mph value
          windDirection: 315,
        });
      });

      it('should handle empty array', () => {
        const result = convertToWindDataPoint([]);
        expect(result).toEqual([]);
      });

      it('should handle data with zero wind values', () => {
        const dataWithZeros: EcowittWindDataPoint[] = [{
          time: '2024-01-01T12:00:00Z',
          timestamp: 1704110400,
          windSpeed: 0,
          windSpeedMph: 0,
          windGust: 0,
          windGustMph: 0,
          windDirection: 0,
        }];

        const result = convertToWindDataPoint(dataWithZeros);
        expect(result[0].windSpeed).toBe(0);
        expect(result[0].windGust).toBe(0);
      });
    });
  });

  describe('Transmission Quality Analysis', () => {
    describe('analyzeOverallTransmissionQuality', () => {
      it('should identify good transmission with complete data', () => {
        const goodData: EcowittWindDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
          time: new Date(Date.now() - i * 15 * 60 * 1000).toISOString(),
          timestamp: Math.floor(Date.now() / 1000) - i * 15 * 60,
          windSpeed: 5 + Math.random() * 10,
          windSpeedMph: 11 + Math.random() * 22,
          windGust: 7 + Math.random() * 15,
          windGustMph: 15 + Math.random() * 33,
          windDirection: Math.floor(Math.random() * 360),
          temperature: 20 + Math.random() * 10,
          humidity: 50 + Math.random() * 30,
          transmissionQuality: {
            isFullTransmission: true,
            hasOutdoorSensors: true,
            missingDataFields: [],
          },
        }));

        const result = analyzeOverallTransmissionQuality(goodData);

        expect(result.hasWindData).toBe(true);
        expect(result.hasOutdoorSensors).toBe(true);
        expect(result.currentTransmissionStatus).toBe('good');
      });

      it('should detect poor transmission quality with gaps', () => {
        // Create data where not all points have full transmission
        const now = Date.now();
        const poorData: EcowittWindDataPoint[] = [
          // Poor data point - missing outdoor sensors
          {
            time: new Date(now - 60 * 60 * 1000).toISOString(),
            timestamp: Math.floor((now - 60 * 60 * 1000) / 1000),
            windSpeed: 5,
            windSpeedMph: 11,
            windGust: 7,
            windGustMph: 15,
            windDirection: 315,
            transmissionQuality: {
              isFullTransmission: false,
              hasOutdoorSensors: false,
              missingDataFields: ['outdoor_temperature', 'outdoor_humidity'],
            },
          },
          // Another poor data point
          {
            time: new Date(now - 30 * 60 * 1000).toISOString(),
            timestamp: Math.floor((now - 30 * 60 * 1000) / 1000),
            windSpeed: 5,
            windSpeedMph: 11,
            windGust: 7,
            windGustMph: 15,
            windDirection: 315,
            transmissionQuality: {
              isFullTransmission: false,
              hasOutdoorSensors: false,
              missingDataFields: ['outdoor_temperature', 'outdoor_humidity'],
            },
          },
        ];

        const result = analyzeOverallTransmissionQuality(poorData);

        expect(result.hasWindData).toBe(true);
        // Since no points have full transmission, this should be false
        expect(result.isFullTransmission).toBe(false);
        expect(result.hasOutdoorSensors).toBe(false);
        expect(result.currentTransmissionStatus).not.toBe('good');
      });

      it('should handle empty data array', () => {
        const result = analyzeOverallTransmissionQuality([]);

        expect(result.isFullTransmission).toBe(false);
        expect(result.hasOutdoorSensors).toBe(false);
        expect(result.hasWindData).toBe(false);
        expect(result.hasCompleteSensorData).toBe(false);
        expect(result.transmissionGaps).toEqual([]);
        expect(result.lastGoodTransmissionTime).toBe(null);
        expect(result.currentTransmissionStatus).toBe('offline');
      });
    });
  });
});
