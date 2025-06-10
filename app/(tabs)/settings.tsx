import { VersionDisplay } from '@/components/SecretGestureActivator';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUnifiedAlarm } from '@/hooks/useUnifiedAlarm';
import { useWindData } from '@/hooks/useWindData';
import type { AlarmCriteria } from '@/services/windService';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple inline alarm testing component
function SimpleAlarmTester() {
  const { testWithCurrentConditions, testWithDelayedIdealConditions, isInitialized } = useUnifiedAlarm();
  const [testing, setTesting] = React.useState(false);
  const tintColor = useThemeColor({}, 'tint');

  const handleTestCurrent = async () => {
    setTesting(true);
    try {
      const result = await testWithCurrentConditions();
      Alert.alert(
        result.triggered ? '🚨 Test Alarm Triggered!' : '❌ No Alarm',
        result.triggered ? 'Current conditions are favorable!' : 'Current conditions don\'t meet criteria',
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Test Failed', 'Unable to test current conditions');
    } finally {
      setTesting(false);
    }
  };

  const handleTestIdeal = async () => {
    setTesting(true);
    try {
      const result = await testWithDelayedIdealConditions(15); // 15 second delay
      Alert.alert(
        '⏰ Delayed Ideal Test Scheduled!',
        `A test alarm with ideal conditions has been scheduled for 15 seconds from now (${result.triggerTime.toLocaleTimeString()}).\n\n🔔 This will test:\n• Background notifications\n• Alarm audio playback\n• App state handling\n\nPut the app in the background to test notifications!`,
        [{ text: 'Got it!' }]
      );
    } catch {
      Alert.alert('Test Failed', 'Unable to schedule delayed ideal test');
    } finally {
      setTesting(false);
    }
  };

  if (!isInitialized) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ThemedText>Initializing alarm system...</ThemedText>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <ThemedText type="subtitle">🧪 Alarm Testing</ThemedText>
      <TouchableOpacity
        style={{ padding: 12, borderWidth: 1, borderColor: tintColor, borderRadius: 8 }}
        onPress={handleTestCurrent}
        disabled={testing}
      >
        <ThemedText style={{ textAlign: 'center', color: tintColor }}>
          {testing ? 'Testing...' : '🌊 Test Current Conditions'}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ padding: 12, borderWidth: 1, borderColor: '#28a745', borderRadius: 8 }}
        onPress={handleTestIdeal}
        disabled={testing}
      >
        <ThemedText style={{ textAlign: 'center', color: '#28a745' }}>
          {testing ? 'Scheduling...' : '⭐ Schedule Ideal Test (15s)'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const { criteria, setCriteria } = useWindData();
  const [localCriteria, setLocalCriteria] = useState<AlarmCriteria>(criteria);
  const [hasChanges, setHasChanges] = useState(false);
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

  useEffect(() => {
    const hasChanges = JSON.stringify(localCriteria) !== JSON.stringify(criteria);
    setHasChanges(hasChanges);
  }, [localCriteria, criteria]);

  const handleSave = async () => {
    try {
      await setCriteria(localCriteria);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultCriteria: AlarmCriteria = {
              minimumAverageSpeed: 10,
              directionConsistencyThreshold: 70,
              minimumConsecutivePoints: 4,
              directionDeviationThreshold: 45,
              preferredDirection: 315,
              preferredDirectionRange: 45,
              useWindDirection: true,
              alarmEnabled: localCriteria.alarmEnabled, // Keep current alarm state
              alarmTime: localCriteria.alarmTime // Keep current alarm time
            };
            setLocalCriteria(defaultCriteria);
          }
        }
      ]
    );
  };

  const updateCriteria = (key: keyof AlarmCriteria, value: any) => {
    setLocalCriteria(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={[
        styles.scrollContentContainer,
        { 
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 80 : 20 // Extra padding for iOS tab bar
        }
      ]}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>Alarm Settings</ThemedText>
        <ThemedText style={styles.subtitle}>
          Configure the criteria used to determine if wind conditions are worth waking up for.
        </ThemedText>

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Wind Speed</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Minimum Average Speed (mph)
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Minimum wind speed required during the 3am-5am window
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.minimumAverageSpeed.toString()}
              onChangeText={(text) => updateCriteria('minimumAverageSpeed', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={textColor + '80'}
            />
          </View>


        </View>

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Wind Direction</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <ThemedText style={styles.settingLabel}>
                  Use Wind Direction in Alarm
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  When disabled, the alarm will only consider wind speed and consistency, ignoring direction. 
                  Use this if the wind direction data is unreliable.
                </ThemedText>
              </View>
              <Switch
                value={localCriteria.useWindDirection}
                onValueChange={(value) => updateCriteria('useWindDirection', value)}
                trackColor={{ false: '#767577', true: tintColor }}
                thumbColor={localCriteria.useWindDirection ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
          
          {localCriteria.useWindDirection && (
            <>
              <View style={styles.directionInfoBox}>
                <ThemedText style={styles.infoBoxTitle}>Wind Direction Guide</ThemedText>
                <ThemedText style={styles.infoBoxText}>
                  Wind directions are measured in degrees (0-359°) where:{'\n'}
                  • 0° or 360° = wind from North{'\n'}
                  • 90° = wind from East{'\n'}
                  • 180° = wind from South{'\n'}
                  • 270° = wind from West
                </ThemedText>
                <ThemedText style={styles.infoBoxText}>
                  For optimal conditions at Soda Lake, winds coming from the northwest (around 315°) 
                  are typically best. This direction creates the cleanest wind across the water
                  with minimal obstruction and provides the most consistent conditions.
                </ThemedText>
              </View>
              
              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel}>
                  Direction Consistency (%)
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Minimum percentage of consistent wind direction
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={localCriteria.directionConsistencyThreshold.toString()}
                  onChangeText={(text) => updateCriteria('directionConsistencyThreshold', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor={textColor + '80'}
                />
              </View>

              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel}>
                  Direction Deviation Threshold (degrees)
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Maximum allowed variation in wind direction
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={localCriteria.directionDeviationThreshold.toString()}
                  onChangeText={(text) => updateCriteria('directionDeviationThreshold', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="45"
                  placeholderTextColor={textColor + '80'}
                />
              </View>
              
              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel}>
                  Preferred Wind Direction (degrees)
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  The optimal wind direction for Soda Lake (315° for Northwest)
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={localCriteria.preferredDirection.toString()}
                  onChangeText={(text) => updateCriteria('preferredDirection', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="315"
                  placeholderTextColor={textColor + '80'}
                />
              </View>
              
              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel}>
                  Preferred Direction Range (degrees)
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  The acceptable range around preferred direction (±degrees)
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={localCriteria.preferredDirectionRange.toString()}
                  onChangeText={(text) => updateCriteria('preferredDirectionRange', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="45"
                  placeholderTextColor={textColor + '80'}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Data Quality</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Minimum Consecutive Good Points
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Number of consecutive data points that must meet criteria
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.minimumConsecutivePoints.toString()}
              onChangeText={(text) => updateCriteria('minimumConsecutivePoints', parseInt(text) || 0)}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor={textColor + '80'}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleReset}
          >
            <ThemedText style={styles.resetButtonText}>Reset to Defaults</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              { backgroundColor: hasChanges ? tintColor : tintColor + '50' }
            ]}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <ThemedText style={styles.saveButtonText}>
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>About Soda Lake Wind Monitoring</ThemedText>
          <ThemedText style={styles.infoText}>
            This app monitors wind conditions at Soda Lake (Soda Lake Dam 1) in Colorado.
            It analyzes early morning wind trends (3am-5am) to determine if conditions are favorable
            for beach activities. The alarm logic considers wind speed, direction consistency, and
            data quality to make wake-up decisions.
          </ThemedText>
          
          <ThemedText type="subtitle" style={styles.subsectionTitle}>How It Works</ThemedText>
          <ThemedText style={styles.infoText}>
            • Fetches real-time wind data from WindAlert API{'\n'}
            • Analyzes 3am-5am window for alarm decisions{'\n'}
            • Verifies conditions in 6am-8am window{'\n'}
            • Caches data for offline access{'\n'}
            • Configurable thresholds and criteria
          </ThemedText>
          
          <ThemedText style={styles.infoText}>
            The verification window (6am-8am) checks if the predicted conditions actually occurred.
            Wind speeds are displayed in mph and directions in degrees. To refresh wind data, use the refresh button on the home screen.
          </ThemedText>

          {/* Unified Alarm Testing Panel */}
          <SimpleAlarmTester />
        </View>
          
        {/* Version display with secret gesture detection */}
        <View style={styles.versionContainer}>
          <VersionDisplay />
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.8,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  subsectionTitle: {
    marginTop: 16,
    fontSize: 16,
  },
  directionInfoBox: {
    backgroundColor: 'rgba(0, 120, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#0078FF',
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0078FF',
  },
  infoBoxText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  settingItem: {
    marginBottom: 16,
  },
  disabledSetting: {
    opacity: 0.5,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    // backgroundColor handled dynamically
  },
  resetButton: {
    backgroundColor: '#FF5252',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  toggleContainer: {
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  versionContainer: {
    marginTop: 32,
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Subtle background to make it more visible
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)', // Light border for definition
    minHeight: 60, // Ensure minimum tappable area
  },
  backgroundAlarmTester: {
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  testerTitle: {
    marginBottom: 16,
    color: '#4CAF50',
  },
  testerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  testerButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testerButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  testResult: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  testResultText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  testerInfo: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

// Testing components removed - replaced with unified AlarmTestingPanel