import { VersionDisplay } from '@/components/SecretGestureActivator';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUnifiedAlarm } from '@/hooks/useUnifiedAlarm';
import { useDPAlarm } from '@/hooks/useDPAlarm';
import { useWindData } from '@/hooks/useWindData';
import type { AlarmCriteria } from '@/services/windService';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simple inline alarm testing component
function SimpleAlarmTester() {
  const { testWithDelayedIdealConditions, isInitialized } = useUnifiedAlarm();
  const { testAlarm } = useDPAlarm();
  const [testing, setTesting] = React.useState(false);
  const tintColor = useThemeColor({}, 'tint');

  const handleTestCurrent = async () => {
    setTesting(true);
    try {
      const result = await testAlarm();
      Alert.alert(
        result.triggered ? '🚨 Test Alarm Would Trigger!' : '❌ No Alarm',
        result.reason,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Test Failed', 'Unable to test alarm with current conditions');
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
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

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
          <ThemedText type="subtitle" style={styles.sectionTitle}>Alarm Criteria</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Minimum Average Speed (mph)
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Minimum wind speed required to trigger the dawn patrol alarm. Uses reliable Ecowitt weather data.
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

        <View style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>About Dawn Patrol Alarm</ThemedText>
          <ThemedText style={styles.infoText}>
            The Dawn Patrol Alarm now uses a simplified, reliable approach for wake-up decisions.
            It monitors wind conditions using high-quality Ecowitt weather station data and 
            triggers alarms based on simple wind speed thresholds.
          </ThemedText>
          
          <ThemedText type="subtitle" style={styles.subsectionTitle}>How It Works</ThemedText>
          <ThemedText style={styles.infoText}>
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Alarm Logic Explained:{'\n'}</ThemedText>
            
            1. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Set Your Alarm Time</ThemedText> - Choose when you want to be woken up (e.g., 5:00 AM){'\n'}
            
            2. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Historical Data Check</ThemedText> - At your alarm time, we pull historical Ecowitt weather data from the last 5 minutes around that time{'\n'}
            
            3. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Wind Speed Analysis</ThemedText> - We calculate the average wind speed from those data points{'\n'}
            
            4. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Threshold Comparison</ThemedText> - If the average wind speed equals or exceeds your minimum threshold (set above), the alarm rings{'\n'}
            
            5. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Simple Decision</ThemedText> - No complex analysis needed - just reliable Ecowitt data and your speed preference
          </ThemedText>
          
          <ThemedText style={styles.infoText}>
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Example:</ThemedText> If your alarm is set for 5:00 AM with a 10 mph threshold, 
            we&apos;ll check the wind data from 4:57-5:02 AM. If the average speed was 12 mph, you get woken up for great conditions!
          </ThemedText>

          <ThemedText type="subtitle" style={styles.subsectionTitle}>Wind Analysis on Lake Tabs</ThemedText>
          <ThemedText style={styles.infoText}>
            The Soda Lake and Standley Lake tabs show detailed wind analysis for monitoring current conditions (separate from the alarm system).
          </ThemedText>
          
          <ThemedText style={styles.infoText}>
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Analysis Calculations Explained:{'\n'}</ThemedText>
            
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>1. Average Speed</ThemedText> - Simple arithmetic mean of wind speeds from the last hour. This is the most important metric for wind sports.{'\n'}
            
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>2. Direction Consistency (0-100%)</ThemedText> - Uses circular statistics to measure how consistent wind directions are. 100% means perfectly steady direction, 0% means completely random. Calculated using vector mathematics on wind direction data.{'\n'}
            
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>3. Consecutive Good Points</ThemedText> - Counts the maximum number of consecutive data points that meet speed criteria. Ensures sustained favorable conditions rather than brief gusts.{'\n'}
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
  infoBox: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
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