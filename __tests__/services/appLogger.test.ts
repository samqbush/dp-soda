import { AppLogger } from '@/services/appLogger';

describe('AppLogger Service', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let originalDev: any;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Store original __DEV__ value
    originalDev = (global as any).__DEV__;
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Restore original __DEV__ value
    (global as any).__DEV__ = originalDev;
  });

  describe('info', () => {
    it('should log info messages with correct prefix and emoji', () => {
      AppLogger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] ℹ️  Test info message');
    });

    it('should log info messages with additional arguments', () => {
      const testData = { key: 'value' };
      AppLogger.info('Test info with data', testData, 123);

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] ℹ️  Test info with data', testData, 123);
    });
  });

  describe('success', () => {
    it('should log success messages with correct prefix and emoji', () => {
      AppLogger.success('Test success message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] ✅ Test success message');
    });

    it('should log success messages with additional arguments', () => {
      const testResult = { status: 'completed' };
      AppLogger.success('Operation successful', testResult);

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] ✅ Operation successful', testResult);
    });
  });

  describe('warning', () => {
    it('should log warning messages with correct prefix and emoji', () => {
      AppLogger.warning('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[DP] ⚠️  Test warning message');
    });

    it('should log warning messages with additional arguments', () => {
      const warningData = { code: 'WARN_001' };
      AppLogger.warning('Warning occurred', warningData);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[DP] ⚠️  Warning occurred', warningData);
    });
  });

  describe('error', () => {
    it('should log error messages with correct prefix and emoji', () => {
      AppLogger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DP] ❌ Test error message');
    });

    it('should log error messages with additional arguments', () => {
      const errorData = new Error('Test error');
      AppLogger.error('Error occurred', errorData);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[DP] ❌ Error occurred', errorData);
    });
  });

  describe('debug', () => {
    it('should log debug messages when __DEV__ is true', () => {
      (global as any).__DEV__ = true;

      AppLogger.debug('Test debug message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] 🐛 Test debug message');
    });

    it('should log debug messages with additional arguments when __DEV__ is true', () => {
      (global as any).__DEV__ = true;
      const debugData = { debug: true };

      AppLogger.debug('Debug info', debugData);

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] 🐛 Debug info', debugData);
    });

    it('should not log debug messages when __DEV__ is false', () => {
      (global as any).__DEV__ = false;

      AppLogger.debug('Test debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log debug messages when __DEV__ is undefined', () => {
      (global as any).__DEV__ = undefined;

      AppLogger.debug('Test debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    it('should handle multiple log levels in sequence', () => {
      (global as any).__DEV__ = true;

      AppLogger.info('Starting operation');
      AppLogger.warning('Minor issue detected');
      AppLogger.error('Operation failed');
      AppLogger.debug('Debug information');
      AppLogger.success('Recovery successful');

      expect(consoleLogSpy).toHaveBeenCalledTimes(3); // info, debug, success
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1); // warning
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // error
    });

    it('should handle empty messages', () => {
      AppLogger.info('');
      AppLogger.warning('');
      AppLogger.error('');

      expect(consoleLogSpy).toHaveBeenCalledWith('[DP] ℹ️  ');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[DP] ⚠️  ');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[DP] ❌ ');
    });

    it('should handle special characters and unicode in messages', () => {
      const specialMessage = 'Message with 🚀 emojis and special chars: !@#$%^&*()';
      AppLogger.info(specialMessage);

      expect(consoleLogSpy).toHaveBeenCalledWith(`[DP] ℹ️  ${specialMessage}`);
    });
  });
});
