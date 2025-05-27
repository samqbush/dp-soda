import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface ProductionCrashInfo {
  timestamp: string;
  error: string;
  stack?: string;
  context: string;
  appVersion: string;
  buildType: string;
  deviceInfo: {
    platform: string;
    version: string;
    isEmulator?: boolean;
  };
  userActions: string[];
  memoryInfo?: any;
}

class ProductionCrashDetector {
  private crashLogs: ProductionCrashInfo[] = [];
  private userActions: string[] = [];
  private isInitialized = false;
  private readonly MAX_LOGS = 50;
  private readonly MAX_ACTIONS = 100;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load existing crash data
      const stored = await AsyncStorage.getItem('production_crash_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.crashLogs = data.crashLogs || [];
        this.userActions = data.userActions || [];
      }

      // Set up global error handlers for production
      this.setupProductionErrorHandlers();
      
      this.isInitialized = true;
      console.log('🔍 Production crash detector initialized');
      
      // Log app start
      this.logUserAction('app_started');
      
    } catch (error) {
      console.error('Failed to initialize production crash detector:', error);
    }
  }

  private setupProductionErrorHandlers() {
    // Global error handler
    const originalErrorHandler = (global as any).ErrorUtils?.getGlobalHandler();
    (global as any).ErrorUtils?.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.logCrash('global_error', error, { isFatal });
      
      // Call original handler
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    // Console error monitoring (for production builds)
    if (!__DEV__) {
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        // Still log to original console
        originalConsoleError.apply(console, args);
        
        // Capture and store the error
        const errorMessage = args.join(' ');
        this.logCrash('console_error', new Error(errorMessage));
      };
    }

    // Promise rejection handler
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', (event) => {
        this.logCrash('promise_rejection', new Error(`Unhandled Promise: ${event.reason}`));
      });
    }
  }

  logUserAction(action: string, details?: any) {
    const actionLog = `${new Date().toISOString()}: ${action}${details ? ` - ${JSON.stringify(details)}` : ''}`;
    this.userActions.unshift(actionLog);
    
    // Keep only recent actions
    if (this.userActions.length > this.MAX_ACTIONS) {
      this.userActions = this.userActions.slice(0, this.MAX_ACTIONS);
    }

    // Don't await this to avoid blocking UI
    this.saveData().catch(error => console.warn('Failed to save user action:', error));
  }

  logCrash(context: string, error: Error, extraInfo?: any) {
    const crashInfo: ProductionCrashInfo = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context,
      appVersion: '1.0.0', // You can get this from your app config
      buildType: __DEV__ ? 'development' : 'production',
      deviceInfo: {
        platform: Platform.OS,
        version: String(Platform.Version),
      },
      userActions: [...this.userActions.slice(0, 10)], // Last 10 actions
      ...extraInfo
    };

    this.crashLogs.unshift(crashInfo);
    
    // Keep only recent crashes
    if (this.crashLogs.length > this.MAX_LOGS) {
      this.crashLogs = this.crashLogs.slice(0, this.MAX_LOGS);
    }

    console.error(`🚨 Production crash logged [${context}]:`, error.message);
    
    // Save immediately for crashes
    this.saveData().catch(saveError => 
      console.error('Failed to save crash data:', saveError)
    );
  }

  private async saveData() {
    try {
      const data = {
        crashLogs: this.crashLogs,
        userActions: this.userActions,
        lastSaved: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('production_crash_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save crash detector data:', error);
    }
  }

  async getCrashData() {
    return {
      crashes: this.crashLogs,
      actions: this.userActions,
      summary: {
        totalCrashes: this.crashLogs.length,
        recentCrashes: this.crashLogs.filter(crash => 
          Date.now() - new Date(crash.timestamp).getTime() < 24 * 60 * 60 * 1000
        ).length,
        mostCommonError: this.getMostCommonError(),
        lastCrash: this.crashLogs[0]?.timestamp
      }
    };
  }

  private getMostCommonError(): string | null {
    if (this.crashLogs.length === 0) return null;
    
    const errorCounts: { [key: string]: number } = {};
    this.crashLogs.forEach(crash => {
      const key = crash.error.split('\n')[0]; // First line of error
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    return Object.keys(errorCounts).reduce((a, b) => 
      errorCounts[a] > errorCounts[b] ? a : b
    );
  }

  async clearData() {
    this.crashLogs = [];
    this.userActions = [];
    await AsyncStorage.removeItem('production_crash_data');
  }

  async exportCrashData(): Promise<string> {
    const data = await this.getCrashData();
    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      buildType: __DEV__ ? 'development' : 'production',
      ...data
    }, null, 2);
  }

  // Method to check if app crashed recently and should show recovery UI
  shouldShowRecoveryUI(): boolean {
    const recentCrashes = this.crashLogs.filter(crash => 
      Date.now() - new Date(crash.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
    );
    
    return recentCrashes.length >= 2;
  }

  // Get crash statistics for debugging
  getCrashStats() {
    const contexts: { [key: string]: number } = {};
    const errors: { [key: string]: number } = {};
    
    this.crashLogs.forEach(crash => {
      contexts[crash.context] = (contexts[crash.context] || 0) + 1;
      const errorType = crash.error.split(':')[0];
      errors[errorType] = (errors[errorType] || 0) + 1;
    });

    return {
      byContext: contexts,
      byErrorType: errors,
      total: this.crashLogs.length,
      recent: this.crashLogs.filter(crash => 
        Date.now() - new Date(crash.timestamp).getTime() < 60 * 60 * 1000
      ).length
    };
  }
}

export const productionCrashDetector = new ProductionCrashDetector();
