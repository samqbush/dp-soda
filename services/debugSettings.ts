import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Simple custom event emitter implementation for React Native
type EventCallback = (data?: any) => void;

class SimpleEventEmitter {
  private events: {[eventName: string]: EventCallback[]} = {};
  
  on(eventName: string, callback: EventCallback): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }
  
  emit(eventName: string, data?: any): void {
    const callbacks = this.events[eventName];
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  removeListener(eventName: string, callbackToRemove: EventCallback): void {
    const callbacks = this.events[eventName];
    if (callbacks) {
      this.events[eventName] = callbacks.filter(callback => callback !== callbackToRemove);
    }
  }
}

// Debug Components Visibility Settings
export interface DebugSettings {
  developerMode: boolean;
  showAndroidDebugger: boolean;
  showAndroidCrashLogger: boolean;
  showApkDiagnostics: boolean;
  showEnhancedAndroidDebugger: boolean;
  showQuickExportButton: boolean;
  showWindAlarmTester: boolean;
  lastToggled: string; // ISO date string
}

// Default settings - everything hidden by default
const DEFAULT_SETTINGS: DebugSettings = {
  developerMode: false, // Disabled by default in all environments
  showAndroidDebugger: false,
  showAndroidCrashLogger: false,
  showApkDiagnostics: false,
  showEnhancedAndroidDebugger: false,
  showQuickExportButton: false,
  showWindAlarmTester: false,
  lastToggled: new Date().toISOString(),
};

// Storage key
const DEBUG_SETTINGS_KEY = 'debug_settings';

// Sequence to detect in tap pattern (tap counts within time windows)
const SECRET_TAP_THRESHOLD = 5; // Number of taps required
const SECRET_TAP_TIMEOUT = 3000; // Time window in milliseconds

class DebugSettingsService {
  private settings: DebugSettings = { ...DEFAULT_SETTINGS };
  private isInitialized = false;
  private tapCount = 0;
  private tapTimer: NodeJS.Timeout | null = null;
  private eventEmitter = new SimpleEventEmitter();

  // Initialize settings from AsyncStorage
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Load settings
      const storedSettings = await AsyncStorage.getItem(DEBUG_SETTINGS_KEY);
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
      
      this.isInitialized = true;
      console.log('✅ Debug settings initialized:', 
        this.settings.developerMode ? 'Developer Mode ENABLED' : 'Developer Mode DISABLED');
    } catch (error) {
      console.error('❌ Error initializing debug settings:', error);
      // Fall back to defaults
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  // Getter for all settings
  async getSettings(): Promise<DebugSettings> {
    await this.initialize();
    return { ...this.settings };
  }

  // Check if developer mode is enabled
  async isDeveloperModeEnabled(): Promise<boolean> {
    await this.initialize();
    return this.settings.developerMode;
  }

  // Toggle developer mode
  async toggleDeveloperMode(value: boolean): Promise<void> {
    await this.initialize();
    
    this.settings.developerMode = value;
    this.settings.lastToggled = new Date().toISOString();
    
    // If developer mode is disabled, hide all debug components
    if (!value) {
      this.settings.showAndroidDebugger = false;
      this.settings.showAndroidCrashLogger = false;
      this.settings.showApkDiagnostics = false;
      this.settings.showEnhancedAndroidDebugger = false;
      this.settings.showQuickExportButton = false;
    }
    
    // Save settings and notify components about visibility changes
    await this.saveSettings();
    
    // Force notification of all components about visibility changes
    console.log(`🔧 Developer mode ${value ? 'ENABLED' : 'DISABLED'} - notifying all components`);
    this.notifyVisibilityChanges();
  }

  // Get visibility status for a specific component
  async isComponentVisible(component: keyof Omit<DebugSettings, 'developerMode' | 'lastToggled'>): Promise<boolean> {
    await this.initialize();
    
    // If not on Android, don't show Android-specific components
    if (Platform.OS !== 'android') {
      return false;
    }
    
    // If developer mode is disabled, don't show any debug components
    if (!this.settings.developerMode) {
      return false;
    }
    
    // Return the specific component's visibility
    return this.settings[component];
  }

  // Toggle a specific component's visibility
  async toggleComponent(component: keyof Omit<DebugSettings, 'developerMode' | 'lastToggled'>, value: boolean): Promise<void> {
    await this.initialize();
    
    // Only toggle if developer mode is enabled
    if (this.settings.developerMode) {
      this.settings[component] = value;
      this.settings.lastToggled = new Date().toISOString();
      
      await this.saveSettings();
    }
  }

  // Reset to default settings
  async resetToDefaults(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.saveSettings();
  }

  // Force reset to defaults (for use when defaults change)
  async forceResetToDefaults(): Promise<void> {
    // Always set developer mode to false and all components to hidden
    this.settings = { 
      ...DEFAULT_SETTINGS,
      developerMode: false,
      showAndroidDebugger: false,
      showAndroidCrashLogger: false,
      showApkDiagnostics: false,
      showEnhancedAndroidDebugger: false,
      showQuickExportButton: false,
    };
    
    // Save settings
    await this.saveSettings();
    
    // Reinitialize
    this.isInitialized = false;
    await this.initialize();
    
    console.log('✅ Debug settings forcibly reset to defaults (developer mode disabled)');
  }

  // Handle tap for secret gesture detection
  handleSecretTap(onActivation: () => void): void {
    this.tapCount++;
    
    // Clear existing timer
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
    }
    
    // If we've reached the threshold, trigger activation
    if (this.tapCount >= SECRET_TAP_THRESHOLD) {
      this.tapCount = 0;
      onActivation();
      return;
    }
    
    // Set timer to reset tap count after timeout
    this.tapTimer = setTimeout(() => {
      this.tapCount = 0;
    }, SECRET_TAP_TIMEOUT);
  }

  // Subscribe to visibility changes
  subscribeToVisibilityChanges(componentKey: string, callback: (isVisible: boolean) => void): () => void {
    const eventName = `visibility:${componentKey}`;
    this.eventEmitter.on(eventName, callback);
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.removeListener(eventName, callback);
    };
  }
  
  // Notify all subscribers when settings change
  private notifyVisibilityChanges(): void {
    for (const key in this.settings) {
      if (key !== 'developerMode' && key !== 'lastToggled') {
        const componentKey = key as keyof Omit<DebugSettings, 'developerMode' | 'lastToggled'>;
        const isVisible = this.settings.developerMode && this.settings[componentKey];
        this.eventEmitter.emit(`visibility:${componentKey}`, isVisible);
      }
    }
  }
  
  // Save settings to AsyncStorage
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(DEBUG_SETTINGS_KEY, JSON.stringify(this.settings));
      console.log('✅ Debug settings saved');
      
      // Notify all subscribers about visibility changes
      this.notifyVisibilityChanges();
    } catch (error) {
      console.error('❌ Error saving debug settings:', error);
    }
  }
}

// Export singleton instance
export const debugSettings = new DebugSettingsService();
