/**
 * Diagnostic tool for troubleshooting app startup issues
 * Especially useful for the white screen problem on Android
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

interface DiagnosticInfo {
  platform: string;
  platformVersion: string | number;
  appVersion: string;
  buildVersion: string;
  expoVersion: string;
  storageStatus: 'working' | 'error' | 'untested';
  fileSystemStatus: 'working' | 'error' | 'untested';
  memoryUsage: number | null;
  lastError: string | null;
  timestamp: string;
}

/**
 * Run diagnostics and return results
 */
export const runDiagnostics = async (): Promise<DiagnosticInfo> => {
  const diagnostics: DiagnosticInfo = {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    buildVersion: Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode?.toString() ?? 'unknown',
    expoVersion: Constants.expoVersion ?? 'unknown',
    storageStatus: 'untested',
    fileSystemStatus: 'untested',
    memoryUsage: null,
    lastError: null,
    timestamp: new Date().toISOString()
  };

  // Test AsyncStorage
  try {
    await AsyncStorage.setItem('diagnosticTest', 'working');
    const testResult = await AsyncStorage.getItem('diagnosticTest');
    if (testResult === 'working') {
      diagnostics.storageStatus = 'working';
      await AsyncStorage.removeItem('diagnosticTest');
    } else {
      diagnostics.storageStatus = 'error';
    }
    
    // Get last error if available
    const lastError = await AsyncStorage.getItem('lastError');
    if (lastError) {
      try {
        const errorData = JSON.parse(lastError);
        diagnostics.lastError = errorData.message || 'Unknown error';
      } catch (e) {
        diagnostics.lastError = 'Error parsing last error';
      }
    }
  } catch (e) {
    diagnostics.storageStatus = 'error';
    console.error('AsyncStorage diagnostic test failed:', e);
  }

  // Test FileSystem if available
  if (FileSystem) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      if (dirInfo.exists) {
        diagnostics.fileSystemStatus = 'working';
        diagnostics.memoryUsage = dirInfo.size || null;
      } else {
        diagnostics.fileSystemStatus = 'error';
      }
    } catch (e) {
      diagnostics.fileSystemStatus = 'error';
      console.error('FileSystem diagnostic test failed:', e);
    }
  }

  return diagnostics;
};

/**
 * Display diagnostic information in an alert
 */
export const showDiagnosticInfo = async (): Promise<void> => {
  try {
    const info = await runDiagnostics();
    
    const diagnosticText = 
      `Platform: ${info.platform} ${info.platformVersion}\n` +
      `App Version: ${info.appVersion} (${info.buildVersion})\n` +
      `Expo: ${info.expoVersion}\n` +
      `Storage: ${info.storageStatus}\n` +
      `FileSystem: ${info.fileSystemStatus}\n` +
      (info.lastError ? `Last Error: ${info.lastError}\n` : '');
    
    Alert.alert(
      'Diagnostic Information',
      diagnosticText,
      [
        { text: 'Copy to Clipboard', onPress: () => {} },
        { text: 'Clear Data', onPress: clearAllData },
        { text: 'OK', style: 'cancel' }
      ]
    );
  } catch (e) {
    console.error('Error running diagnostics:', e);
    Alert.alert('Diagnostic Error', 'Failed to run diagnostics');
  }
};

/**
 * Clear all app data
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    Alert.alert(
      'Data Cleared',
      'All app data has been cleared. Please restart the app.',
      [{ text: 'OK' }]
    );
  } catch (e) {
    console.error('Error clearing data:', e);
    Alert.alert('Error', 'Failed to clear app data');
  }
};

export default { runDiagnostics, showDiagnosticInfo, clearAllData };
