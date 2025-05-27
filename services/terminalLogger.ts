/**
 * Terminal Logger Service
 * 
 * This service provides enhanced terminal logging capabilities
 * specifically for debugging Android crash issues.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { crashMonitor } from './crashMonitor';
import { productionCrashDetector } from './productionCrashDetector';

/**
 * Format a crash log for terminal display
 */
export const formatCrashLogForTerminal = (log: any): string => {
  // Create a divider to make logs stand out in terminal
  const divider = '\n' + '='.repeat(80) + '\n';
  
  // Format the crash information in a readable way
  const formattedLog = [
    `${divider}`,
    `📱 ANDROID CRASH LOG - ${new Date(log.timestamp).toLocaleString()}`,
    `${divider}`,
    `🔍 CONTEXT: ${log.context || log.component || 'Unknown'}`,
    `❌ ERROR: ${log.error || log.message || 'Unknown error'}`,
    log.stack ? `📚 STACK TRACE:\n${log.stack}` : '📚 STACK TRACE: None',
    log.buildType ? `🛠️ BUILD: ${log.buildType}` : '',
    `📱 DEVICE: ${Platform.OS} ${Platform.Version}`,
    `${divider}`
  ].join('\n');
  
  return formattedLog;
};

/**
 * Terminal Logger Class
 * Provides methods for printing crash logs to terminal
 */
class TerminalLogger {
  /**
   * Print all crash logs to terminal
   */
  async printAllCrashLogs(): Promise<void> {
    console.log('\n📊 TERMINAL LOGGER: Fetching all crash logs...');
    
    try {
      // Get logs from multiple sources
      const [androidCrashLogs, crashMonitorLogs, productionCrashData] = await Promise.all([
        this.getAndroidCrashLogs(),
        crashMonitor.getCrashHistory(),
        productionCrashDetector.getCrashData()
      ]);
      
      console.log('\n📱 ANDROID CRASH LOGS:');
      if (androidCrashLogs.length > 0) {
        androidCrashLogs.forEach((log, index) => {
          console.log(`\nLOG #${index + 1} of ${androidCrashLogs.length}:`);
          console.log(formatCrashLogForTerminal(log));
        });
      } else {
        console.log('No Android crash logs found');
      }
      
      console.log('\n📊 CRASH MONITOR LOGS:');
      if (crashMonitorLogs.length > 0) {
        crashMonitorLogs.forEach((log, index) => {
          console.log(`\nLOG #${index + 1} of ${crashMonitorLogs.length}:`);
          console.log(formatCrashLogForTerminal(log));
        });
      } else {
        console.log('No crash monitor logs found');
      }
      
      console.log('\n🔍 PRODUCTION CRASH DETECTOR LOGS:');
      if (productionCrashData.crashes.length > 0) {
        productionCrashData.crashes.forEach((log, index) => {
          console.log(`\nLOG #${index + 1} of ${productionCrashData.crashes.length}:`);
          console.log(formatCrashLogForTerminal(log));
        });
      } else {
        console.log('No production crash logs found');
      }
      
      console.log('\n📊 CRASH SUMMARY:');
      console.log(`- Android Crash Logger: ${androidCrashLogs.length} logs`);
      console.log(`- Crash Monitor: ${crashMonitorLogs.length} logs`);
      console.log(`- Production Crash Detector: ${productionCrashData.crashes.length} logs`);
      
    } catch (error) {
      console.error('Failed to print all crash logs:', error);
    }
  }
  
  /**
   * Get Android crash logs from AsyncStorage
   */
  private async getAndroidCrashLogs(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('android_crash_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get Android crash logs:', error);
      return [];
    }
  }
  
  /**
   * Print crash summary info to terminal
   */
  async printCrashSummary(): Promise<void> {
    console.log('\n📊 TERMINAL LOGGER: Fetching crash summary...');
    
    try {
      const crashSummary = crashMonitor.getCrashSummary();
      const productionCrashData = await productionCrashDetector.getCrashData();
      const stats = productionCrashDetector.getCrashStats?.() || { total: 0, recent: 0 };
      
      console.log('\n📊 CRASH SUMMARY:');
      console.log(`🔹 Total crashes: ${crashSummary.total}`);
      console.log(`🔹 Recent crashes (5min): ${crashSummary.recent}`);
      console.log(`🔹 Most problematic component: ${crashSummary.mostCommon || 'None'}`);
      console.log(`🔹 Production total crashes: ${stats.total}`);
      console.log(`🔹 Production recent crashes: ${stats.recent}`);
      console.log(`🔹 Last crash time: ${productionCrashData.summary?.lastCrash || 'None'}`);
    } catch (error) {
      console.error('Failed to print crash summary:', error);
    }
  }
  
  /**
   * Print the most recent crash
   */
  async printLatestCrash(): Promise<void> {
    console.log('\n📱 TERMINAL LOGGER: Fetching latest crash...');
    
    try {
      // Get logs from multiple sources
      const [androidCrashLogs, crashMonitorLogs, productionCrashData] = await Promise.all([
        this.getAndroidCrashLogs(),
        crashMonitor.getCrashHistory(),
        productionCrashDetector.getCrashData()
      ]);
      
      // Get the most recent log by timestamp across all sources
      const allLogs = [
        ...(androidCrashLogs || []),
        ...(crashMonitorLogs || []),
        ...(productionCrashData.crashes || [])
      ];
      
      if (allLogs.length === 0) {
        console.log('No crash logs found');
        return;
      }
      
      // Sort by timestamp (newest first)
      allLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Print the most recent log
      console.log('\n📱 MOST RECENT CRASH:');
      console.log(formatCrashLogForTerminal(allLogs[0]));
      
    } catch (error) {
      console.error('Failed to print latest crash:', error);
    }
  }
}

// Create instance
export const terminalLogger = new TerminalLogger();

// In development, expose terminal logger to global scope for easier debugging
if (__DEV__) {
  (global as any).terminalLogger = terminalLogger;
  
  (global as any).printCrashLogs = async () => {
    await terminalLogger.printAllCrashLogs();
  };
  
  (global as any).printCrashSummary = async () => {
    await terminalLogger.printCrashSummary();
  };
  
  (global as any).printLatestCrash = async () => {
    await terminalLogger.printLatestCrash();
  };
  
  console.log('📋 Terminal Logger initialized. Available commands in dev console:');
  console.log('- terminalLogger.printAllCrashLogs()');
  console.log('- terminalLogger.printCrashSummary()');
  console.log('- terminalLogger.printLatestCrash()');
  console.log('- printCrashLogs()');
  console.log('- printCrashSummary()');
  console.log('- printLatestCrash()');
}

export default terminalLogger;
