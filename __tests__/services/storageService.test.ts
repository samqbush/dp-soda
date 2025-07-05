import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { clearAppStorage, clearWindDataCache, initializeStorage } from '@/services/storageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  clear: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios', // Default to iOS
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockPlatform = Platform as jest.Mocked<typeof Platform>;

describe('StorageService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset Platform.OS to iOS by default
    mockPlatform.OS = 'ios';
    
    // Set up default mock implementations
    mockAsyncStorage.clear.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('clearAppStorage', () => {
    it('should clear all storage successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await clearAppStorage();

      expect(mockAsyncStorage.clear).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('🗑️ Clearing all app storage...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Storage cleared successfully');
      
      consoleSpy.mockRestore();
    });

    it('should handle AsyncStorage.clear error', async () => {
      const mockError = new Error('Clear failed');
      mockAsyncStorage.clear.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(clearAppStorage()).rejects.toThrow('Clear failed');

      expect(mockAsyncStorage.clear).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error clearing app storage:', mockError);
      
      consoleSpy.mockRestore();
    });

    it('should return resolved promise on success', async () => {
      const result = await clearAppStorage();
      expect(result).toBeUndefined();
    });
  });

  describe('clearWindDataCache', () => {
    it('should clear wind data cache successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await clearWindDataCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('windData');
      expect(consoleSpy).toHaveBeenCalledWith('🗑️ Clearing wind data cache...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Wind data cache cleared successfully');
      
      consoleSpy.mockRestore();
    });

    it('should handle AsyncStorage.removeItem error', async () => {
      const mockError = new Error('Remove failed');
      mockAsyncStorage.removeItem.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(clearWindDataCache()).rejects.toThrow('Remove failed');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('windData');
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error clearing wind data cache:', mockError);
      
      consoleSpy.mockRestore();
    });

    it('should return resolved promise on success', async () => {
      const result = await clearWindDataCache();
      expect(result).toBeUndefined();
    });
  });

  describe('initializeStorage', () => {
    describe('Storage Test Phase', () => {
      it('should successfully test storage on iOS', async () => {
        mockPlatform.OS = 'ios';
        mockAsyncStorage.getItem.mockResolvedValue('testValue');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await initializeStorage();

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('storageTest', 'testValue');
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('storageTest');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('storageTest');
        expect(result).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith('🔄 Initializing app storage...');
        
        consoleSpy.mockRestore();
      });

      it('should handle storage test failure', async () => {
        mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage test failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await initializeStorage();

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('AsyncStorage test failed with error:', expect.any(Error));
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ AsyncStorage test failed - value mismatch or timeout');
        
        consoleSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      });

      it('should handle incorrect test value return', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('wrongValue');
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await initializeStorage();

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ AsyncStorage test failed - value mismatch or timeout');
        
        consoleWarnSpy.mockRestore();
      });

      it('should handle fatal initialization errors', async () => {
        // Mock setItem to throw an error at the very beginning
        mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage unavailable'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await initializeStorage();

        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith('AsyncStorage test failed with error:', expect.any(Error));
        
        consoleErrorSpy.mockRestore();
      });

      it('should handle Android timeout', async () => {
        mockPlatform.OS = 'android';
        mockAsyncStorage.getItem.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve('testValue'), 6000))
        );
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const initPromise = initializeStorage();
        
        // Fast forward the timeout
        jest.advanceTimersByTime(5000);
        
        const result = await initPromise;

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ AsyncStorage test timed out - assuming failure');
        
        consoleWarnSpy.mockRestore();
      });

      it('should succeed on Android within timeout', async () => {
        mockPlatform.OS = 'android';
        mockAsyncStorage.getItem.mockResolvedValue('testValue');

        const result = await initializeStorage();

        expect(result).toBe(true);
      });
    });

    describe('Initialization Phase', () => {
      beforeEach(() => {
        // Mock successful storage test
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.resolve(null);
          return Promise.resolve(null);
        });
      });

      it('should initialize with default preferences on first run', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await initializeStorage();

        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('hasInitialized');
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'hasInitialized',
          expect.stringContaining('"initialized":true')
        );
        
        // Verify the default preferences structure
        const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
          call => call[0] === 'hasInitialized'
        );
        const defaultPrefs = JSON.parse(setItemCall![1]);
        
        expect(defaultPrefs.initialized).toBe(true);
        expect(defaultPrefs.version).toBe('1.0.0');
        expect(defaultPrefs.platform).toBe('ios');
        expect(typeof defaultPrefs.firstRun).toBe('string');
        
        expect(result).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith('✅ Storage initialized with defaults');
        
        consoleSpy.mockRestore();
      });

      it('should skip initialization if already initialized', async () => {
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.resolve('{"initialized":true}');
          return Promise.resolve(null);
        });

        const result = await initializeStorage();

        // Should not call setItem for hasInitialized since it already exists
        const hasInitializedSetCalls = mockAsyncStorage.setItem.mock.calls.filter(
          call => call[0] === 'hasInitialized'
        );
        expect(hasInitializedSetCalls).toHaveLength(0);
        
        expect(result).toBe(true);
      });

      it('should continue if initialization preference setting fails', async () => {
        mockAsyncStorage.setItem.mockImplementation((key) => {
          if (key === 'hasInitialized') {
            return Promise.reject(new Error('Initialization save failed'));
          }
          return Promise.resolve(undefined);
        });
        
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await initializeStorage();

        expect(result).toBe(true); // Should still return true since basic storage works
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ Failed to set initialization value, but continuing:',
          expect.any(Error)
        );
        expect(consoleSpy).toHaveBeenCalledWith('✅ Storage initialization successful');
        
        consoleWarnSpy.mockRestore();
        consoleSpy.mockRestore();
      });

      it('should handle JSON parsing error in hasInitialized check', async () => {
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.reject(new Error('Get item failed'));
          return Promise.resolve(null);
        });
        
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await initializeStorage();

        expect(result).toBe(true); // Should still succeed
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ Failed to set initialization value, but continuing:',
          expect.any(Error)
        );
        
        consoleWarnSpy.mockRestore();
      });
    });

    describe('Platform-specific behavior', () => {
      it('should include platform in default preferences for iOS', async () => {
        mockPlatform.OS = 'ios';
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.resolve(null);
          return Promise.resolve(null);
        });

        await initializeStorage();

        const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
          call => call[0] === 'hasInitialized'
        );
        const defaultPrefs = JSON.parse(setItemCall![1]);
        expect(defaultPrefs.platform).toBe('ios');
      });

      it('should include platform in default preferences for Android', async () => {
        mockPlatform.OS = 'android';
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.resolve(null);
          return Promise.resolve(null);
        });

        await initializeStorage();

        const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
          call => call[0] === 'hasInitialized'
        );
        const defaultPrefs = JSON.parse(setItemCall![1]);
        expect(defaultPrefs.platform).toBe('android');
      });
    });

    describe('Error Handling', () => {
      it('should handle complete storage failure', async () => {
        const mockError = new Error('Complete storage failure');
        mockAsyncStorage.setItem.mockRejectedValue(mockError);
        mockAsyncStorage.getItem.mockRejectedValue(mockError);
        mockAsyncStorage.removeItem.mockRejectedValue(mockError);
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await initializeStorage();

        expect(result).toBe(false);
        // The error will be logged from the inner testAsyncStorage function
        expect(consoleSpy).toHaveBeenCalledWith('AsyncStorage test failed with error:', mockError);
        
        consoleSpy.mockRestore();
      });
    });

    describe('Integration Scenarios', () => {
      it('should work correctly in complete initialization flow', async () => {
        mockPlatform.OS = 'android';
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.resolve(null);
          return Promise.resolve(null);
        });
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await initializeStorage();

        // Verify complete flow
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('storageTest', 'testValue');
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('storageTest');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('storageTest');
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('hasInitialized');
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'hasInitialized',
          expect.stringContaining('"platform":"android"')
        );
        
        expect(result).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith('🔄 Initializing app storage...');
        expect(consoleSpy).toHaveBeenCalledWith('✅ Storage initialized with defaults');
        expect(consoleSpy).toHaveBeenCalledWith('✅ Storage initialization successful');
        
        consoleSpy.mockRestore();
      });

      it('should handle rapid initialization calls', async () => {
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === 'storageTest') return Promise.resolve('testValue');
          if (key === 'hasInitialized') return Promise.resolve(null);
          return Promise.resolve(null);
        });

        // Call initialization multiple times rapidly
        const promises = [
          initializeStorage(),
          initializeStorage(),
          initializeStorage()
        ];

        const results = await Promise.all(promises);

        // All should succeed
        results.forEach(result => expect(result).toBe(true));
      });
    });
  });

  describe('Service Integration', () => {
    it('should handle mixed service operations', async () => {
      // Test using multiple functions together
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Initialize storage
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'storageTest') return Promise.resolve('testValue');
        if (key === 'hasInitialized') return Promise.resolve(null);
        return Promise.resolve(null);
      });
      
      await initializeStorage();
      
      // Clear wind data cache
      await clearWindDataCache();
      
      // Clear all storage
      await clearAppStorage();

      expect(mockAsyncStorage.setItem).toHaveBeenCalled(); // From initialization
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('windData'); // From cache clear
      expect(mockAsyncStorage.clear).toHaveBeenCalled(); // From full clear
      
      consoleSpy.mockRestore();
    });
  });
});
