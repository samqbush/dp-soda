import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSimpleAlarm } from '@/hooks/useSimpleAlarm';
import { Ionicons } from '@expo/vector-icons';

interface SimpleAlarmControlsProps {
  style?: any;
}

/**
 * Simple Alarm Controls
 * 
 * Clean, simple interface for controlling the new alarm system.
 * Replaces the complex AlarmControlPanel with basic functionality.
 */
export function SimpleAlarmControls({ style }: SimpleAlarmControlsProps) {
  const {
    enabled,
    alarmTime,
    isLoading,
    setAlarm,
    disable,
    testAlarm,
    testNotifications,
  } = useSimpleAlarm();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const [hours, minutes] = alarmTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  });

  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const cardBackgroundColor = useThemeColor({ light: '#f8f9fa', dark: '#2c2c2e' }, 'background');

  const handleToggleAlarm = async () => {
    try {
      if (enabled) {
        await disable();
      } else {
        await setAlarm(alarmTime);
      }
    } catch (error) {
      console.error('Failed to toggle alarm:', error);
      Alert.alert('Error', 'Failed to update alarm settings. Please try again.');
    }
  };

  const handleTimeChange = async (timeString: string) => {
    try {
      await setAlarm(timeString);
      Alert.alert('Alarm Updated', `Alarm set for ${timeString}`);
    } catch (error) {
      console.error('Failed to update alarm time:', error);
      Alert.alert('Error', 'Failed to update alarm time. Please try again.');
    }
  };

  const onTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      setPickerDate(selectedDate);
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      // On Android, immediately apply the change
      if (Platform.OS === 'android') {
        handleTimeChange(timeString);
      }
    } else if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
  };

  const handleTestNotifications = async () => {
    try {
      const result = await testNotifications();
      
      if (result.hasPermission && result.canSchedule) {
        Alert.alert(
          '✅ Notifications Working!',
          'You should see a test notification in 2 seconds.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          '⚠️ Notification Issue',
          result.error || 'Notifications not working properly',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Failed to test notifications:', error);
      Alert.alert('Error', 'Failed to test notifications. Please try again.');
    }
  };

  const handleTestAlarm = async () => {
    try {
      Alert.alert(
        'Test Alarm',
        'This will test the alarm system. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Test',
            style: 'default',
            onPress: async () => {
              const result = await testAlarm();
              Alert.alert(
                'Test Result',
                result.reason,
                [{ text: 'OK', style: 'default' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to test alarm:', error);
      Alert.alert('Error', 'Failed to test alarm. Please try again.');
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackgroundColor }, style]}>
      {/* Main Toggle */}
      <View style={styles.mainControl}>
        <View style={styles.controlRow}>
          <View style={styles.controlInfo}>
            <ThemedText style={styles.controlTitle}>
              {enabled ? 'Alarm Enabled' : 'Alarm Disabled'}
            </ThemedText>
            <ThemedText style={styles.controlSubtitle}>
              {enabled ? `Set for ${alarmTime}` : 'Tap to enable alarm'}
            </ThemedText>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggleAlarm}
            disabled={isLoading}
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor={enabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Time Setting */}
      {enabled && (
        <View style={styles.timeControl}>
          <TouchableOpacity
            style={[styles.timeButton, { borderColor: tintColor }]}
            onPress={() => setShowTimePicker(true)}
            disabled={isLoading}
          >
            <Ionicons name="time-outline" size={20} color={tintColor} />
            <ThemedText style={[styles.timeText, { color: tintColor }]}>
              Change Time: {alarmTime}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Test Buttons */}
      <View style={styles.testControl}>
        <View style={styles.testButtons}>
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: tintColor }]}
            onPress={handleTestAlarm}
            disabled={isLoading}
          >
            <Ionicons name="flash-outline" size={16} color="white" />
            <ThemedText style={styles.testButtonText}>Test Wind Check</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#34C759', marginLeft: 8 }]}
            onPress={handleTestNotifications}
            disabled={isLoading}
          >
            <Ionicons name="notifications-outline" size={16} color="white" />
            <ThemedText style={styles.testButtonText}>Test Notifications</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Picker */}
      {showTimePicker && (
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimePickerChange}
            textColor={textColor}
          />
          
          {Platform.OS === 'ios' && (
            <View style={styles.timePickerButtons}>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(false)}
              >
                <ThemedText style={styles.timePickerButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerButton, { backgroundColor: tintColor }]}
                onPress={() => {
                  const hours = pickerDate.getHours().toString().padStart(2, '0');
                  const minutes = pickerDate.getMinutes().toString().padStart(2, '0');
                  const timeString = `${hours}:${minutes}`;
                  handleTimeChange(timeString);
                  setShowTimePicker(false);
                }}
              >
                <ThemedText style={[styles.timePickerButtonText, { color: 'white' }]}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ThemedText style={styles.loadingText}>Updating...</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  mainControl: {
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlInfo: {
    flex: 1,
    marginRight: 16,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  controlSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  timeControl: {
    marginBottom: 16,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  testControl: {
    alignItems: 'center',
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  timePickerContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  timePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
});
