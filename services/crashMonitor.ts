import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface CrashReport {
  timestamp: string;
  component: string;
  error: string;
  stack?: string;
  platform: string;
  platformVersion: string | number;
  appState: 'loading' | 'loaded' | 'crashed';
}

class CrashMonitor {
  private static instance: CrashMonitor;
  private crashes: CrashReport[] = [];
  private readonly maxCrashes = 10;

  static getInstance(): CrashMonitor {
    if (!CrashMonitor.instance) {
      CrashMonitor.instance = new CrashMonitor();
    }
    return CrashMonitor.instance;
  }

  async logCrash(component: string, error: Error, appState: 'loading' | 'loaded' | 'crashed' = 'crashed') {
    console.log(`🚨 CrashMonitor: Logging crash in ${component}:`, error.message);
    
    const crashReport: CrashReport = {
      timestamp: new Date().toISOString(),
      component,
      error: error.message,
      stack: error.stack,
      platform: Platform.OS,
      platformVersion: Platform.Version,
      appState,
    };

    // Add to in-memory list
    this.crashes.unshift(crashReport);
    if (this.crashes.length > this.maxCrashes) {
      this.crashes = this.crashes.slice(0, this.maxCrashes);
    }

    // Persist to storage
    try {
      await AsyncStorage.setItem('crashReports', JSON.stringify(this.crashes));
    } catch (storageError) {
      console.warn('Failed to save crash report:', storageError);
    }
  }

  async getCrashHistory(): Promise<CrashReport[]> {
    try {
      const stored = await AsyncStorage.getItem('crashReports');
      if (stored) {
        this.crashes = JSON.parse(stored);
        return this.crashes;
      }
    } catch (error) {
      console.warn('Failed to load crash history:', error);
    }
    return this.crashes;
  }

  async clearCrashHistory(): Promise<void> {
    this.crashes = [];
    try {
      await AsyncStorage.removeItem('crashReports');
    } catch (error) {
      console.warn('Failed to clear crash history:', error);
    }
  }

  getRecentCrashes(minutes: number = 5): CrashReport[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.crashes.filter(crash => new Date(crash.timestamp) > cutoff);
  }

  getCrashSummary(): { total: number; recent: number; mostCommon: string | null } {
    const recent = this.getRecentCrashes();
    const componentCounts: { [key: string]: number } = {};
    
    this.crashes.forEach(crash => {
      componentCounts[crash.component] = (componentCounts[crash.component] || 0) + 1;
    });

    const mostCommon = Object.keys(componentCounts).length > 0
      ? Object.keys(componentCounts).reduce((a, b) => componentCounts[a] > componentCounts[b] ? a : b)
      : null;

    return {
      total: this.crashes.length,
      recent: recent.length,
      mostCommon,
    };
  }

  // Method to check if we should show crash recovery UI
  shouldShowRecoveryUI(): boolean {
    const recentCrashes = this.getRecentCrashes(2); // Last 2 minutes
    return recentCrashes.length >= 2;
  }

  // Get diagnostic info for debugging
  getDiagnosticInfo(): string {
    const summary = this.getCrashSummary();
    const recent = this.getRecentCrashes();
    
    let info = `📊 Crash Summary:\n`;
    info += `• Total crashes: ${summary.total}\n`;
    info += `• Recent crashes (5min): ${summary.recent}\n`;
    info += `• Most problematic: ${summary.mostCommon || 'None'}\n\n`;
    
    if (recent.length > 0) {
      info += `🕒 Recent Crashes:\n`;
      recent.forEach((crash, index) => {
        const time = new Date(crash.timestamp).toLocaleTimeString();
        info += `${index + 1}. ${crash.component} at ${time}: ${crash.error}\n`;
      });
    }
    
    return info;
  }
}

export const crashMonitor = CrashMonitor.getInstance();
