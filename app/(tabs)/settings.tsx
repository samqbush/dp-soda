import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUnifiedAlarm } from '@/hooks/useUnifiedAlarm';
import { useDPAlarm } from '@/hooks/useDPAlarm';
import type { SimplifiedAlarmCriteria } from '@/hooks/useDPAlarm';
import { useAppSettings } from '@/contexts/SettingsContext';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Alarm system testing component
function AlarmSystemTester() {
  const { testWithDelayedIdealConditions, isInitialized } = useUnifiedAlarm();
  const [testing, setTesting] = React.useState(false);

  const handleTestAlarmSystem = async () => {
    setTesting(true);
    try {
      const result = await testWithDelayedIdealConditions(15); // 15 second delay
      Alert.alert(
        '🔔 Alarm System Test Scheduled!',
        `The alarm system test has been scheduled for 15 seconds from now (${result.triggerTime.toLocaleTimeString()}).\n\n🧪 This will test:\n• Push notifications\n• Alarm audio playback\n• Background app handling\n• Device wake-up functionality\n\nPut the app in the background now to test notifications!`,
        [{ text: 'Got it!' }]
      );
    } catch {
      Alert.alert('Test Failed', 'Unable to schedule alarm system test');
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
      <ThemedText type="subtitle">🔧 Alarm System Testing</ThemedText>
      <ThemedText style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
        Test that notifications and audio work properly on your device. Current wind conditions are shown live on the main Dawn Patrol tab.
      </ThemedText>
      <TouchableOpacity
        style={{ padding: 12, borderWidth: 1, borderColor: '#28a745', borderRadius: 8 }}
        onPress={handleTestAlarmSystem}
        disabled={testing}
      >
        <ThemedText style={{ textAlign: 'center', color: '#28a745' }}>
          {testing ? 'Scheduling Test...' : '🔔 Test Alarm System (15s)'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const { criteria, setCriteria } = useDPAlarm();
  const { settings, updateSetting } = useAppSettings();
  const [localCriteria, setLocalCriteria] = useState<SimplifiedAlarmCriteria>(criteria);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

  const updateCriteria = async (key: keyof SimplifiedAlarmCriteria, value: any) => {
    // Update local state immediately for responsive UI
    setLocalCriteria((prev: SimplifiedAlarmCriteria) => ({ ...prev, [key]: value }));
    
    // Clear existing timeout to debounce saves
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Hide previous "saved" indicator
    setShowSaved(false);
    
    // Debounce the save operation (wait for user to stop typing)
    const newTimeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await setCriteria({ [key]: value });
        console.log(`✅ Auto-saved ${String(key)} = ${value}`);
        
        // Show "saved" confirmation
        setShowSaved(true);
        
        // Hide "saved" indicator after 2 seconds
        setTimeout(() => setShowSaved(false), 2000);
        
      } catch (error) {
        console.error(`❌ Failed to save ${String(key)}:`, error);
        Alert.alert('Save Failed', `Could not save ${String(key)} setting. Please try again.`);
        // Revert local state on error
        setLocalCriteria(criteria);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Wait 1 second after user stops typing
    
    setSaveTimeout(newTimeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

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
          <ThemedText type="subtitle" style={styles.sectionTitle}>App Features</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Wind Guru Tab
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Enable the experimental Wind Guru tab with katabatic wind predictions. This feature provides advanced wind forecasting but is still in development.
            </ThemedText>
            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <ThemedText style={[styles.settingLabel, { fontSize: 16 }]}>
                  {settings.windGuruEnabled ? 'Enabled' : 'Disabled'}
                </ThemedText>
                <ThemedText style={[styles.settingDescription, { fontSize: 12, marginTop: 2 }]}>
                  {settings.windGuruEnabled 
                    ? 'The Wind Guru tab is visible in the navigation' 
                    : 'The Wind Guru tab is hidden from navigation'
                  }
                </ThemedText>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: tintColor }}
                thumbColor={settings.windGuruEnabled ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={async (value) => {
                  try {
                    await updateSetting('windGuruEnabled', value);
                  } catch (err) {
                    console.error('Failed to update Wind Guru setting:', err);
                    Alert.alert('Error', 'Failed to update Wind Guru setting');
                  }
                }}
                value={settings.windGuruEnabled}
              />
            </View>
            {settings.windGuruEnabled && (
              <ThemedView style={styles.warningBox}>
                <ThemedText style={[styles.warningText, { color: '#FF9500' }]}>
                  ⚠️ <ThemedText style={{ fontWeight: 'bold' }}>Experimental Feature</ThemedText>
                </ThemedText>
                <ThemedText style={[styles.warningText, { color: textColor, opacity: 0.8 }]}>
                  The Wind Guru tab is under active development. Weather predictions may not be reliable for critical decisions. Use at your own discretion.
                </ThemedText>
              </ThemedView>
            )}
          </View>
        </View>

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
              placeholder="15"
              placeholderTextColor={textColor + '80'}
            />
            {/* Save status indicators */}
            {isSaving && (
              <ThemedText style={[styles.savingIndicator, { color: '#FF9500' }]}>
                💾 Saving...
              </ThemedText>
            )}
            {showSaved && !isSaving && (
              <ThemedText style={[styles.savingIndicator, { color: '#34C759' }]}>
                ✅ Saved!
              </ThemedText>
            )}
            {/* Help text for auto-save */}
            <ThemedText style={styles.autoSaveHint}>
              Changes are automatically saved
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>About Dawn Patrol Alarm</ThemedText>
          <ThemedText style={styles.infoText}>
            The Dawn Patrol Alarm now uses a simple, reliable approach for wake-up decisions.
            It monitors current wind conditions using high-quality Ecowitt weather station data and 
            triggers alarms based on simple wind speed thresholds.
          </ThemedText>
          
          <ThemedText type="subtitle" style={styles.subsectionTitle}>How It Works</ThemedText>
          <ThemedText style={styles.infoText}>
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Current Conditions Logic:{'\n'}</ThemedText>
            
            1. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Set Your Alarm Time</ThemedText> - Choose when you want to be checked (e.g., 5:00 AM){'\n'}
            
            2. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Live Data Check</ThemedText> - At your alarm time, we check the current wind conditions at Soda Lake{'\n'}
            
            3. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Real-Time Analysis</ThemedText> - We get the live wind speed from the Ecowitt weather station{'\n'}
            
            4. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Instant Decision</ThemedText> - If the current wind speed equals or exceeds your minimum threshold, the alarm rings{'\n'}
            
            5. <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Wake Up or Sleep In</ThemedText> - Simple decision based on current conditions right now
          </ThemedText>
          
          <ThemedText style={styles.infoText}>
            <ThemedText style={[styles.infoText, { fontWeight: '600' }]}>Example:</ThemedText> If your alarm is set for 5:00 AM with a 15 mph threshold, 
            at exactly 5:00 AM we&apos;ll check the current wind speed at Soda Lake. If it&apos;s 17 mph right now, you get woken up for great conditions!
          </ThemedText>

          {/* Alarm System Testing Panel */}
          <AlarmSystemTester />
        </View>

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
  savingIndicator: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    fontStyle: 'italic',
  },
  autoSaveHint: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
    fontStyle: 'italic',
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
  warningBox: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
});

// Alarm system testing functionality is now handled by AlarmSystemTester component above