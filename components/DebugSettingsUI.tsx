import { debugSettings } from '@/services/debugSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Interface for the component's props
interface DebugSettingsUIProps {
  onClose?: () => void;
}

// Component for managing debug settings
export function DebugSettingsUI({ onClose }: DebugSettingsUIProps) {
  // State for settings
  const [developerMode, setDeveloperMode] = useState(false);
  const [showAndroidDebugger, setShowAndroidDebugger] = useState(false);
  const [showAndroidCrashLogger, setShowAndroidCrashLogger] = useState(false);
  const [showApkDiagnostics, setShowApkDiagnostics] = useState(false);
  const [showEnhancedAndroidDebugger, setShowEnhancedAndroidDebugger] = useState(false);
  const [showQuickExportButton, setShowQuickExportButton] = useState(false);
  const [lastToggled, setLastToggled] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await debugSettings.getSettings();
        
        setDeveloperMode(settings.developerMode);
        setShowAndroidDebugger(settings.showAndroidDebugger);
        setShowAndroidCrashLogger(settings.showAndroidCrashLogger);
        setShowApkDiagnostics(settings.showApkDiagnostics);
        setShowEnhancedAndroidDebugger(settings.showEnhancedAndroidDebugger);
        setShowQuickExportButton(settings.showQuickExportButton);
        setLastToggled(settings.lastToggled);
        
      } catch (error) {
        console.error('Error loading debug settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Handle developer mode toggle
  const handleDeveloperModeToggle = async (value: boolean) => {
    try {
      setDeveloperMode(value);
      await debugSettings.toggleDeveloperMode(value);
      
      // If turning off developer mode, update all other switches
      if (!value) {
        setShowAndroidDebugger(false);
        setShowAndroidCrashLogger(false);
        setShowApkDiagnostics(false);
        setShowEnhancedAndroidDebugger(false);
        setShowQuickExportButton(false);
      }
      
      // Show confirmation
      if (value) {
        Alert.alert('Developer Mode Enabled', 'Debug components are now available.');
      } else {
        Alert.alert('Developer Mode Disabled', 'Debug components are now hidden.');
      }
    } catch (error) {
      console.error('Error toggling developer mode:', error);
      // Revert UI state on error
      setDeveloperMode(!value);
    }
  };
  
  // Handle component visibility toggle
  const handleComponentToggle = async (component: string, value: boolean) => {
    try {
      switch (component) {
        case 'showAndroidDebugger':
          setShowAndroidDebugger(value);
          await debugSettings.toggleComponent('showAndroidDebugger', value);
          break;
        case 'showAndroidCrashLogger':
          setShowAndroidCrashLogger(value);
          await debugSettings.toggleComponent('showAndroidCrashLogger', value);
          break;
        case 'showApkDiagnostics':
          setShowApkDiagnostics(value);
          await debugSettings.toggleComponent('showApkDiagnostics', value);
          break;
        case 'showEnhancedAndroidDebugger':
          setShowEnhancedAndroidDebugger(value);
          await debugSettings.toggleComponent('showEnhancedAndroidDebugger', value);
          break;
        case 'showQuickExportButton':
          setShowQuickExportButton(value);
          await debugSettings.toggleComponent('showQuickExportButton', value);
          break;
      }
    } catch (error) {
      console.error(`Error toggling ${component}:`, error);
    }
  };
  
  // Reset all settings to defaults
  const handleReset = async () => {
    Alert.alert(
      'Reset Debug Settings',
      'Are you sure you want to reset all debug settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await debugSettings.resetToDefaults();
              
              // Reload settings
              const settings = await debugSettings.getSettings();
              setDeveloperMode(settings.developerMode);
              setShowAndroidDebugger(settings.showAndroidDebugger);
              setShowAndroidCrashLogger(settings.showAndroidCrashLogger);
              setShowApkDiagnostics(settings.showApkDiagnostics);
              setShowEnhancedAndroidDebugger(settings.showEnhancedAndroidDebugger);
              setShowQuickExportButton(settings.showQuickExportButton);
              setLastToggled(settings.lastToggled);
              
              Alert.alert('Success', 'Debug settings have been reset to defaults.');
            } catch (error) {
              console.error('Error resetting debug settings:', error);
              Alert.alert('Error', 'Failed to reset debug settings.');
            }
          }
        }
      ]
    );
  };
  
  // Handle clearing all app data
  const handleClearData = async () => {
    Alert.alert(
      'Clear All App Data',
      'WARNING: This will clear ALL app data, including settings, cache, and stored wind data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              
              Alert.alert(
                'Data Cleared',
                'All app data has been cleared. The app will now restart.',
                [{ text: 'OK', onPress: () => onClose && onClose() }]
              );
            } catch (error) {
              console.error('Error clearing app data:', error);
              Alert.alert('Error', 'Failed to clear app data.');
            }
          }
        }
      ]
    );
  };
  
  // Only available on Android
  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Debug Settings</Text>
        <Text style={styles.subtitle}>
          Debug components are only available on Android devices.
        </Text>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Show loading indicator
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Debug Settings</Text>
        <Text style={styles.subtitle}>Loading settings...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Settings</Text>
      <Text style={styles.subtitle}>
        Enable or disable debugging components
      </Text>
      
      <ScrollView style={styles.settingsContainer}>
        {/* Developer Mode Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingName}>Developer Mode</Text>
            <Text style={styles.settingDescription}>
              Master switch for all debug components
            </Text>
          </View>
          <Switch
            value={developerMode}
            onValueChange={handleDeveloperModeToggle}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={developerMode ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {/* Only show component toggles if developer mode is enabled */}
        {developerMode && (
          <>
            {/* Android Crash Logger Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Android Crash Logger</Text>
                <Text style={styles.settingDescription}>
                  Logs and displays Android-specific crashes
                </Text>
              </View>
              <Switch
                value={showAndroidCrashLogger}
                onValueChange={(value) => handleComponentToggle('showAndroidCrashLogger', value)}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={showAndroidCrashLogger ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            {/* Android Debugger Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Android Debugger</Text>
                <Text style={styles.settingDescription}>
                  Basic debug information and white screen diagnostics
                </Text>
              </View>
              <Switch
                value={showAndroidDebugger}
                onValueChange={(value) => handleComponentToggle('showAndroidDebugger', value)}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={showAndroidDebugger ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            {/* APK Diagnostics Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>APK Diagnostics</Text>
                <Text style={styles.settingDescription}>
                  APK-specific crash diagnostics and testing
                </Text>
              </View>
              <Switch
                value={showApkDiagnostics}
                onValueChange={(value) => handleComponentToggle('showApkDiagnostics', value)}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={showApkDiagnostics ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            {/* Enhanced Android Debugger Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Enhanced Android Debugger</Text>
                <Text style={styles.settingDescription}>
                  Advanced debugging tools for Android
                </Text>
              </View>
              <Switch
                value={showEnhancedAndroidDebugger}
                onValueChange={(value) => handleComponentToggle('showEnhancedAndroidDebugger', value)}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={showEnhancedAndroidDebugger ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            {/* Quick Export Button Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingName}>Quick Export Button</Text>
                <Text style={styles.settingDescription}>
                  Floating button for exporting crash data
                </Text>
              </View>
              <Switch
                value={showQuickExportButton}
                onValueChange={(value) => handleComponentToggle('showQuickExportButton', value)}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={showQuickExportButton ? '#fff' : '#f4f3f4'}
              />
            </View>
          </>
        )}
        
        {/* Last toggled timestamp */}
        {lastToggled && (
          <Text style={styles.lastToggled}>
            Last modified: {new Date(lastToggled).toLocaleString()}
          </Text>
        )}
        
        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.resetButton]} 
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>Reset to Defaults</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.dangerButton]} 
            onPress={handleClearData}
          >
            <Text style={styles.buttonText}>Clear All App Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  settingsContainer: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastToggled: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  buttonsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
