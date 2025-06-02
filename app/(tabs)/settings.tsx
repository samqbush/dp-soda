import { VersionDisplay } from '@/components/SecretGestureActivator';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindData } from '@/hooks/useWindData';
import { debugSettings } from '@/services/debugSettings';
import type { AlarmCriteria } from '@/services/windService';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { criteria, setCriteria } = useWindData();
  const [localCriteria, setLocalCriteria] = useState<AlarmCriteria>(criteria);
  const [hasChanges, setHasChanges] = useState(false);

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
              alarmEnabled: false,
              alarmTime: "05:00"
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
    <ScrollView style={[styles.container, { backgroundColor }]}>
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

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Alarm Configuration</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Enable Alarm
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Turn on/off the automatic morning alarm based on wind conditions
            </ThemedText>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: localCriteria.alarmEnabled ? tintColor : '#ccc' }
                ]}
                onPress={() => updateCriteria('alarmEnabled', !localCriteria.alarmEnabled)}
              >
                <ThemedText style={styles.toggleText}>
                  {localCriteria.alarmEnabled ? 'ON' : 'OFF'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Alarm Time
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Set the time when alarm will trigger if conditions are favorable (wind data is checked 5 minutes prior)
            </ThemedText>
            <View style={styles.timePickerContainer}>
              <TextInput
                style={[styles.timePicker, { color: textColor, borderColor: tintColor, textAlign: 'center' }]}
                value={localCriteria.alarmTime}
                onChangeText={(time) => {
                  // Allow any input during typing, validate only on completion
                  updateCriteria('alarmTime', time);
                }}
                onBlur={() => {
                  // Only validate and auto-correct if the field is not empty
                  if (localCriteria.alarmTime.trim() === '') {
                    updateCriteria('alarmTime', '05:00');
                    return;
                  }
                  
                  // More flexible validation - handle various input formats
                  const input = localCriteria.alarmTime.trim();
                  let formattedTime = '';
                  
                  // Try to parse various time formats
                  if (/^\d{1,2}:\d{2}$/.test(input)) {
                    // Already in HH:MM format, validate ranges
                    const [hours, minutes] = input.split(':').map(Number);
                    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                      formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }
                  } else if (/^\d{3,4}$/.test(input)) {
                    // Format like "500" or "0500" -> "05:00"
                    const padded = input.padStart(4, '0');
                    const hours = parseInt(padded.substring(0, 2));
                    const minutes = parseInt(padded.substring(2, 4));
                    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                      formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }
                  } else if (/^\d{1,2}$/.test(input)) {
                    // Just hours like "5" -> "05:00"
                    const hours = parseInt(input);
                    if (hours >= 0 && hours <= 23) {
                      formattedTime = `${hours.toString().padStart(2, '0')}:00`;
                    }
                  }
                  
                  // If we couldn't parse it, show an alert but don't auto-reset
                  if (!formattedTime) {
                    Alert.alert(
                      'Invalid Time Format', 
                      'Please enter time in 24-hour format (e.g., 05:00, 1730, or 5). Current value has been kept.',
                      [{ text: 'OK' }]
                    );
                  } else {
                    updateCriteria('alarmTime', formattedTime);
                  }
                }}
                placeholder="05:00"
                placeholderTextColor={textColor + '80'}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <ThemedText style={styles.timePickerHint}>
                Format: 24-hour (e.g., 05:00, 1730, or just 5 for 5:00)
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.alarmInfoContainer}>
            <ThemedText style={styles.alarmInfo}>
              When enabled, the alarm will check wind conditions at {localCriteria.alarmTime} if the 3am-5am window analysis indicates favorable conditions.
            </ThemedText>
            <ThemedText style={[styles.alarmInfo, { marginTop: 8, fontStyle: 'italic' }]}>
              Note: The app must remain open for the alarm to function. Future updates will add background alarm support.
            </ThemedText>
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

          {/* Developer Settings - Only shown when in developer mode */}
          <DevModeTestLink />
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: 'white',
    fontWeight: 'bold',
  },
  timePickerContainer: {
    marginTop: 8,
  },
  timePicker: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignSelf: 'flex-start',
    minWidth: 100,
    alignItems: 'center',
  },
  timePickerHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  alarmInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  alarmInfo: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  versionContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  testLinkContainer: {
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)', // Slightly darker border for better visibility
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // Slightly darker background
  },
  testLinkHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  testButton: {
    padding: 14, // Increased padding for a larger touch target
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000', // Add shadow for better visibility
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4, // Android shadow
  },
  testButtonText: {
    color: '#000000', // Black text
    fontWeight: '700', 
    fontSize: 15,
    letterSpacing: 0.5, // Slightly increase letter spacing
  },
  buttonIconContainer: {
    marginRight: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearIcon: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  gearCenter: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    top: 5,
    left: 5,
  },
  gearTooth: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: 'white',
    top: -2,
    left: 6,
  },
  testLinkDescription: {
    fontSize: 13,
    opacity: 0.7,
    fontStyle: 'italic',
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
});

// Component for Wind Alarm Test link that's only visible in developer mode
function DevModeTestLink() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Check if developer mode is enabled and Wind Alarm Tester is visible
    const checkVisibility = async () => {
      try {
        const isDeveloperMode = await debugSettings.isDeveloperModeEnabled();
        const isComponentVisible = await debugSettings.isComponentVisible('showWindAlarmTester');
        setIsVisible(isDeveloperMode && isComponentVisible);
      } catch (error) {
        console.error('Error checking Wind Alarm Tester visibility:', error);
        setIsVisible(false);
      }
    };
    
    checkVisibility();
    
    // Set up a subscription to visibility changes
    const unsubscribe = debugSettings.subscribeToVisibilityChanges(
      'showWindAlarmTester',
      async () => {
        await checkVisibility();
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <View style={styles.testLinkContainer}>
      <ThemedText style={styles.testLinkHeader}>Developer Options</ThemedText>
      <Link href="/test-alarm" asChild>
        <TouchableOpacity 
          style={[
            styles.testButton, 
            { 
              backgroundColor: '#FFF0E0', // Light orange background to indicate dev feature
              borderWidth: 1,
              borderColor: '#FFAA5A', // Medium orange border
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }
          ]}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.testButtonText}>🔧 Wind Alarm Tester (Developer)</ThemedText>
        </TouchableOpacity>
      </Link>
      <ThemedText style={styles.testLinkDescription}>
        Developer tool: Test different wind scenarios to verify alarm trigger behavior
      </ThemedText>
    </View>
  );
}