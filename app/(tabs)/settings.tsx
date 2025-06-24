import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThresholdSlider } from '@/components/ThresholdSlider';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSimpleAlarm } from '@/hooks/useSimpleAlarm';
import { useAppSettings } from '@/contexts/SettingsContext';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Platform, Switch, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { settings, updateSetting } = useAppSettings();
  const { testAlarm, testNotifications, checkWindConditions, isLoading } = useSimpleAlarm();
  const [testResults, setTestResults] = useState<string>('');
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');

  const handleTestAlarm = async () => {
    try {
      setTestResults('Testing alarm...');
      const result = await testAlarm();
      setTestResults(`✅ Alarm Test Complete:\n• Wind Speed: ${result.windSpeed} mph\n• Triggered: ${result.shouldTrigger ? 'Yes' : 'No'}\n• Reason: ${result.reason}`);
    } catch (error) {
      setTestResults(`❌ Test failed: ${error}`);
    }
  };

  const handleTestNotifications = async () => {
    try {
      setTestResults('Testing notifications...');
      const result = await testNotifications();
      setTestResults(`📱 Notification Test:\n• Has Permission: ${result.hasPermission ? 'Yes' : 'No'}\n• Can Schedule: ${result.canSchedule ? 'Yes' : 'No'}${result.error ? `\n• Error: ${result.error}` : ''}`);
    } catch (error) {
      setTestResults(`❌ Notification test failed: ${error}`);
    }
  };

  const handleTestWindCheck = async () => {
    try {
      setTestResults('Checking wind conditions...');
      const result = await checkWindConditions();
      setTestResults(`🌬️ Wind Check Complete:\n• Current Speed: ${result.windSpeed} mph\n• Would Trigger: ${result.shouldTrigger ? 'Yes' : 'No'}\n• Status: ${result.reason}`);
    } catch (error) {
      setTestResults(`❌ Wind check failed: ${error}`);
    }
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
        <ThemedText type="title" style={styles.title}>Dawn Patrol Settings</ThemedText>
        <ThemedText style={styles.subtitle}>
          Configure your alarm and app preferences
        </ThemedText>

        {/* Alarm Configuration Section */}
        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Alarm Configuration</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.cardTitle}>Wind Speed Threshold</ThemedText>
            <ThemedText style={styles.cardDescription}>
              Set the minimum wind speed required to trigger your dawn patrol alarm. Use the main Dawn Patrol tab to enable/disable the alarm and set the time.
            </ThemedText>
            <ThresholdSlider />
          </View>
        </View>

        {/* Testing Section */}
        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Testing & Diagnostics</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.cardTitle}>Test Alarm System</ThemedText>
            <ThemedText style={styles.cardDescription}>
              Test different parts of the alarm system to make sure everything is working properly
            </ThemedText>
            
            <View style={styles.testButtons}>
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: tintColor }]}
                onPress={handleTestAlarm}
                disabled={isLoading}
              >
                <ThemedText style={styles.testButtonText}>
                  {isLoading ? 'Testing...' : '🚨 Test Full Alarm'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: '#FF9500' }]}
                onPress={handleTestNotifications}
                disabled={isLoading}
              >
                <ThemedText style={styles.testButtonText}>
                  {isLoading ? 'Testing...' : '📱 Test Notifications'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: '#34C759' }]}
                onPress={handleTestWindCheck}
                disabled={isLoading}
              >
                <ThemedText style={styles.testButtonText}>
                  {isLoading ? 'Testing...' : '🌬️ Check Wind Now'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {testResults && (
              <View style={styles.testResultContainer}>
                <ThemedText style={styles.testResultText}>{testResults}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* App Features Section */}
        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>App Features</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: cardColor }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Wind Guru Tab</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Enable experimental wind forecasting features
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
              <View style={styles.warningBox}>
                <ThemedText style={[styles.warningText, { color: '#FF9500' }]}>
                  ⚠️ <ThemedText style={{ fontWeight: 'bold' }}>Experimental Feature</ThemedText>
                </ThemedText>
                <ThemedText style={[styles.warningText, { color: textColor, opacity: 0.8 }]}>
                  Wind Guru features are under development and may not be reliable for critical decisions.
                </ThemedText>
              </View>
            )}
          </View>
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
  settingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  testButtons: {
    gap: 12,
    marginBottom: 16,
  },
  testButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  testResultContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  testResultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
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
