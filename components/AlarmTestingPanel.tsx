import React, { useState } from 'react';
import { View, Alert, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUnifiedAlarm } from '@/hooks/useUnifiedAlarm';

export function AlarmTestingPanel({ style }: { style?: any }) {
  const {
    testWithCurrentConditions,
    testWithIdealConditions,
    stopAlarm,
    isInitialized,
    hasBackgroundSupport
  } = useUnifiedAlarm();

  const [testingCurrent, setTestingCurrent] = useState(false);
  const [testingIdeal, setTestingIdeal] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const cardBackgroundColor = useThemeColor({ light: '#f8f9fa', dark: '#2c2c2e' }, 'background');

  const handleTestCurrentConditions = async () => {
    setTestingCurrent(true);
    
    try {
      const result = await testWithCurrentConditions();
      const message = result.triggered
        ? `🌊 Alarm triggered! Current conditions are favorable!`
        : `😴 No alarm - Current conditions don't meet criteria`;

      Alert.alert(
        result.triggered ? '🚨 Test Alarm Triggered!' : '❌ Test - No Alarm',
        message,
        [{ text: 'OK', style: 'default' }]
      );
    } catch {
      Alert.alert(
        'Test Failed',
        'Failed to test with current conditions. Please check your internet connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setTestingCurrent(false);
    }
  };

  const handleTestIdealConditions = async () => {
    setTestingIdeal(true);
    
    try {
      await testWithIdealConditions();
      Alert.alert(
        '🚨 Test Alarm Triggered!',
        `🌊 Ideal conditions simulated! This is how the alarm sounds when conditions are perfect for dawn patrol!`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch {
      Alert.alert(
        'Test Failed',
        'Failed to test with ideal conditions. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setTestingIdeal(false);
    }
  };

  const handleStopTestAlarm = async () => {
    try {
      await stopAlarm();
      Alert.alert('Test Stopped', 'Test alarm has been stopped.', [{ text: 'OK', style: 'default' }]);
    } catch {
      Alert.alert('Stop Failed', 'Failed to stop test alarm.', [{ text: 'OK', style: 'default' }]);
    }
  };

  if (!isInitialized) {
    return (
      <ThemedView style={[styles.container, style]}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Initializing alarm system...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText style={styles.title}>🧪 Alarm Testing</ThemedText>
        <ThemedText style={styles.subtitle}>
          Test the alarm system to verify it works correctly with different wind conditions.
        </ThemedText>
      </View>

      {/* Test Buttons */}
      <View style={styles.buttonContainer}>
        {/* Current Conditions Test */}
        <TouchableOpacity
          style={[styles.testButton, { borderColor: tintColor }]}
          onPress={handleTestCurrentConditions}
          disabled={testingCurrent || testingIdeal}
        >
          {testingCurrent ? (
            <ActivityIndicator size="small" color={tintColor} />
          ) : (
            <View style={styles.testButtonContent}>
              <ThemedText style={[styles.testButtonTitle, { color: tintColor }]}>
                🌊 Test Current Conditions
              </ThemedText>
              <ThemedText style={styles.testButtonSubtitle}>
                Check if current wind conditions would trigger alarm
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* Ideal Conditions Test */}
        <TouchableOpacity
          style={[styles.testButton, { borderColor: '#28a745' }]}
          onPress={handleTestIdealConditions}
          disabled={testingCurrent || testingIdeal}
        >
          {testingIdeal ? (
            <ActivityIndicator size="small" color="#28a745" />
          ) : (
            <View style={styles.testButtonContent}>
              <ThemedText style={[styles.testButtonTitle, { color: '#28a745' }]}>
                ⭐ Test Ideal Conditions
              </ThemedText>
              <ThemedText style={styles.testButtonSubtitle}>
                Simulate perfect wind conditions to test alarm
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stop Button */}
      <TouchableOpacity style={styles.stopButton} onPress={handleStopTestAlarm}>
        <Ionicons name="stop-circle-outline" size={24} color="white" />
        <ThemedText style={styles.stopButtonText}>Stop Test Alarm</ThemedText>
      </TouchableOpacity>

      {/* Information */}
      <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText style={styles.infoTitle}>How Testing Works</ThemedText>
        <ThemedText style={styles.infoText}>
          • <ThemedText style={styles.infoBold}>Current Conditions:</ThemedText> Tests with real wind data from Soda Lake
        </ThemedText>
        <ThemedText style={styles.infoText}>
          • <ThemedText style={styles.infoBold}>Ideal Conditions:</ThemedText> Tests with simulated perfect wind conditions
        </ThemedText>
        <ThemedText style={styles.infoText}>
          • Alarm will play {hasBackgroundSupport ? 'audio and show notification' : 'audio (foreground only)'}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  testButtonContent: {
    alignItems: 'center',
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testButtonSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 16,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '600',
  },
});

export default AlarmTestingPanel;
