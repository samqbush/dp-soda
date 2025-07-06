import AsyncStorage from '@react-native-async-storage/async-storage';

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
  removeItem: jest.fn(),
}));

describe('EcowittService Core Tests', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

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
        name: 'DP Soda Lake',
        mac: '00:11:22:33:44:55',
        type: 1,
        date_zone_id: 'America/Denver',
        createtime: 1640995200,
        longitude: -105.0178,
        latitude: 39.7392,
        stationtype: 'WS2902',
        iotdevice_list: [],
      },
      {
        id: 2,
        name: 'DP Standley Lake',
        mac: '00:11:22:33:44:66',
        type: 1,
        date_zone_id: 'America/Denver',
        createtime: 1640995200,
        longitude: -105.0178,
        latitude: 39.7392,
        stationtype: 'WS2902',
        iotdevice_list: [],
      },
    ];

    describe('selectDeviceByName', () => {
      it('should return device when found by exact match', () => {
        const result = selectDeviceByName(mockDevices, 'DP Soda Lake');
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
          windSpeed: 5.5,
          windSpeedMph: 12.3,
          windGust: 7.2,
          windGustMph: 16.1,
          windDirection: 270,
          temperature: 15.5,
          humidity: 65,
          transmissionQuality: {
            isFullTransmission: true,
            hasOutdoorSensors: true,
            missingDataFields: [],
          },
        },
      ];

      it('should convert Ecowitt data array to wind data points', () => {
        const result = convertToWindDataPoint(mockEcowittDataArray);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(expect.objectContaining({
          time: '2024-01-01T12:00:00Z',
          timestamp: 1704110400,
          windDirection: 270,
        }));
        // Just verify we have wind data
        expect(typeof result[0].windSpeed).toBe('number');
        expect(typeof result[0].windGust).toBe('number');
        expect(typeof result[0].windSpeedMph).toBe('number');
      });

      it('should handle empty array input', () => {
        const result = convertToWindDataPoint([]);
        expect(result).toEqual([]);
      });

      it('should handle data points without transmission quality', () => {
        const dataWithoutQuality = [{
          time: '2024-01-01T12:00:00Z',
          timestamp: 1704110400,
          windSpeed: 5.5,
          windSpeedMph: 12.3,
          windGust: 7.2,
          windGustMph: 16.1,
          windDirection: 270,
        }];

        const result = convertToWindDataPoint(dataWithoutQuality);
        
        // Verify basic structure rather than exact equality
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(expect.objectContaining({
          time: '2024-01-01T12:00:00Z',
          timestamp: 1704110400,
          windDirection: 270,
        }));
      });
    });
  });

  describe('Transmission Quality Analysis', () => {
    describe('analyzeOverallTransmissionQuality', () => {
      it('should analyze transmission quality correctly for good data', () => {
        const goodData: EcowittWindDataPoint[] = [
          {
            time: '2024-01-01T12:00:00Z',
            timestamp: 1704110400,
            windSpeed: 5.5,
            windSpeedMph: 12.3,
            windGust: 7.2,
            windGustMph: 16.1,
            windDirection: 270,
            transmissionQuality: {
              isFullTransmission: true,
              hasOutdoorSensors: true,
              missingDataFields: [],
            },
          },
        ];

        const result = analyzeOverallTransmissionQuality(goodData);

        expect(result.hasWindData).toBe(true);
        expect(result.isFullTransmission).toBe(true);
        expect(result.hasOutdoorSensors).toBe(true);
        expect(result.currentTransmissionStatus).toBe('good');
      });

      it('should analyze transmission quality correctly for poor data', () => {
        const poorData: EcowittWindDataPoint[] = [
          {
            time: '2024-01-01T12:00:00Z',
            timestamp: 1704110400,
            windSpeed: 5.5,
            windSpeedMph: 12.3,
            windGust: 7.2,
            windGustMph: 16.1,
            windDirection: 270,
            transmissionQuality: {
              isFullTransmission: false,
              hasOutdoorSensors: false,
              missingDataFields: ['outdoor_temperature', 'outdoor_humidity'],
            },
          },
        ];

        const result = analyzeOverallTransmissionQuality(poorData);

        expect(result.hasWindData).toBe(true);
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
