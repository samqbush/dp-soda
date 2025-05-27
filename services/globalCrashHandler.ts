import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { crashMonitor } from './crashMonitor';
import { formatCrashLogForTerminal } from './terminalLogger';

interface GlobalCrashInfo {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: string;
  platform: string;
  component?: string;
}

class GlobalCrashHandler {
  private isInitialized = false;
  private crashCount = 0;
  private lastCrashTime: Date | null = null;

  /**
   * Initialize global crash detection
   * Should be called as early as possible in app lifecycle
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🛡️ Initializing global crash handler...');

    try {
      // Load previous crash count
      const savedCrashData = await AsyncStorage.getItem('global_crash_count');
      if (savedCrashData) {
        const { count, lastTime } = JSON.parse(savedCrashData);
        this.crashCount = count || 0;
        this.lastCrashTime = lastTime ? new Date(lastTime) : null;
        
        // Reset count if last crash was more than 1 hour ago
        if (this.lastCrashTime && Date.now() - this.lastCrashTime.getTime() > 60 * 60 * 1000) {
          this.crashCount = 0;
        }
      }

      // Set up global error handlers
      this.setupErrorHandlers();
      this.isInitialized = true;
      
      console.log(`🛡️ Global crash handler initialized. Previous crashes: ${this.crashCount}`);
    } catch (error) {
      console.error('Failed to initialize global crash handler:', error);
    }
  }

  private setupErrorHandlers() {
    // Global JavaScript error handler
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Call original console.error
      originalConsoleError.apply(console, args);
      
      // Check if this looks like a crash
      const errorMessage = args.join(' ');
      if (this.looksLikeCrash(errorMessage)) {
        this.handleGlobalCrash({
          message: errorMessage,
          timestamp: new Date().toISOString(),
          platform: `${Platform.OS} ${Platform.Version}`,
          component: 'global_console_error'
        });
      }
    };

    // React Native specific error handler
    const originalErrorHandler = (global as any).ErrorUtils?.getGlobalHandler();
    (global as any).ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.log('🚨 Global error handler triggered:', error.message, 'Fatal:', isFatal);
      
      this.handleGlobalCrash({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        platform: `${Platform.OS} ${Platform.Version}`,
        component: 'global_error_utils'
      });

      // Call original handler if it exists
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    // Promise rejection handler
    global.addEventListener?.('unhandledrejection', (event) => {
      console.log('🚨 Unhandled promise rejection:', event.reason);
      
      this.handleGlobalCrash({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: new Date().toISOString(),
        platform: `${Platform.OS} ${Platform.Version}`,
        component: 'promise_rejection'
      });
    });
  }

  private looksLikeCrash(message: string): boolean {
    const crashKeywords = [
      'fatal',
      'crash',
      'segmentation fault',
      'null pointer',
      'cannot read property',
      'undefined is not an object',
      'rendering error',
      'component error',
      'failed to render'
    ];
    
    const lowerMessage = message.toLowerCase();
    return crashKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handleGlobalCrash(crashInfo: GlobalCrashInfo) {
    try {
      // Format and log to terminal in a more visible way
      const formattedCrash = formatCrashLogForTerminal({
        ...crashInfo,
        context: crashInfo.component || 'global',
        error: crashInfo.message,
        buildType: __DEV__ ? 'development' : 'production'
      });
      
      console.log('🚨 Global crash detected:');
      console.log(formattedCrash);
      
      // Increment crash count
      this.crashCount++;
      this.lastCrashTime = new Date();

      // Save crash data
      await AsyncStorage.setItem('global_crash_count', JSON.stringify({
        count: this.crashCount,
        lastTime: this.lastCrashTime.toISOString()
      }));

      // Log to crash monitor
      await crashMonitor.logCrash(
        crashInfo.component || 'global',
        new Error(crashInfo.message),
        'crashed'
      );

      // Store crash info for recovery screen
      await AsyncStorage.setItem('last_global_crash', JSON.stringify(crashInfo));

      // If too many crashes, trigger emergency recovery
      if (this.crashCount >= 3) {
        console.log('🚨 Too many global crashes, triggering emergency recovery');
        await this.triggerEmergencyRecovery();
      }

    } catch (error) {
      console.error('Failed to handle global crash:', error);
    }
  }

  private async triggerEmergencyRecovery() {
    try {
      // Clear critical storage that might be causing crashes
      const criticalKeys = [
        'windData',
        'lastDataUpdate',
        'chartData',
        'userPreferences'
      ];

      for (const key of criticalKeys) {
        await AsyncStorage.removeItem(key);
      }

      // Set emergency recovery flag
      await AsyncStorage.setItem('emergency_recovery_triggered', JSON.stringify({
        timestamp: new Date().toISOString(),
        crashCount: this.crashCount
      }));

      console.log('🚨 Emergency recovery completed - cleared critical storage');
    } catch (error) {
      console.error('Emergency recovery failed:', error);
    }
  }

  /**
   * Get current crash status
   */
  async getCrashStatus() {
    try {
      const [crashData, lastCrash, emergencyRecovery] = await Promise.all([
        AsyncStorage.getItem('global_crash_count'),
        AsyncStorage.getItem('last_global_crash'),
        AsyncStorage.getItem('emergency_recovery_triggered')
      ]);

      return {
        crashCount: crashData ? JSON.parse(crashData).count : 0,
        lastCrash: lastCrash ? JSON.parse(lastCrash) : null,
        emergencyRecoveryTriggered: emergencyRecovery ? JSON.parse(emergencyRecovery) : null
      };
    } catch (error) {
      console.error('Failed to get crash status:', error);
      return { crashCount: 0, lastCrash: null, emergencyRecoveryTriggered: null };
    }
  }

  /**
   * Clear crash history
   */
  async clearCrashHistory() {
    try {
      await AsyncStorage.multiRemove([
        'global_crash_count',
        'last_global_crash',
        'emergency_recovery_triggered'
      ]);
      this.crashCount = 0;
      this.lastCrashTime = null;
      console.log('🧹 Global crash history cleared');
    } catch (error) {
      console.error('Failed to clear crash history:', error);
    }
  }

  /**
   * Manual crash reporting for testing
   */
  async reportTestCrash(component: string, message: string) {
    await this.handleGlobalCrash({
      message: `Test crash: ${message}`,
      timestamp: new Date().toISOString(),
      platform: `${Platform.OS} ${Platform.Version}`,
      component: `test_${component}`
    });
  }
}

export const globalCrashHandler = new GlobalCrashHandler();
