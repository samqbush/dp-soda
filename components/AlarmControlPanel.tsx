import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useUnifiedAlarm } from '@/hooks/useUnifiedAlarm';
import { Ionicons } from '@expo/vector-icons';

interface AlarmControlPanelProps {
  style?: any;
}

/**
 * Unified Alarm Control Panel
 * 
 * Single interface for controlling the alarm system from the DP Wind Alert tab
 */
export function AlarmControlPanel({ style }: AlarmControlPanelProps) {
  const {
    alarmState,
    isInitialized,
    setEnabled,
    setAlarmTime,
    stopAlarm,
    emergencyStop,
    hasBackgroundSupport
  } = useUnifiedAlarm();

  const [timeInputVisible, setTimeInputVisible] = useState(false);
  const [tempTime, setTempTime] = useState(alarmState.alarmTime);

  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const cardBackgroundColor = useThemeColor({ light: '#f8f9fa', dark: '#2c2c2e' }, 'background');

  const handleToggleAlarm = async () => {
    try {
      await setEnabled(!alarmState.isEnabled);
      
      if (!alarmState.isEnabled && !hasBackgroundSupport) {
        Alert.alert(
          'Foreground Alarms Only',
          'Background notifications are not available. Keep the app open for alarms to work.',
          [{ text: 'Got it', style: 'default' }]
        );
      } else if (!alarmState.isEnabled && hasBackgroundSupport) {
        Alert.alert(
          'Background Alarms Ready!',
          'You\'ll receive notifications even when the app is closed. Perfect for dawn patrol alerts!',
          [{ text: 'Awesome!', style: 'default' }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to update alarm settings. Please try again.');
    }
  };

  const handleStopAlarm = async () => {
    try {
      await stopAlarm();
    } catch {
      Alert.alert('Error', 'Failed to stop alarm. Please try again.');
    }
  };

  const handleEmergencyStop = async () => {
    Alert.alert(
      'Emergency Stop',
      'This will stop all alarm functions immediately. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Emergency Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyStop();
              Alert.alert('Emergency Stop', 'All alarm functions have been stopped.');
            } catch {
              Alert.alert('Error', 'Failed to stop all alarms. Please restart the app.');
            }
          }
        }
      ]
    );
  };

  const handleTimeChange = async () => {
    try {
      await setAlarmTime(tempTime);
      setTimeInputVisible(false);
      
      if (alarmState.isEnabled) {
        // Parse the new time to give the user better feedback
        const [hours, minutes] = tempTime.split(':').map(Number);
        const now = new Date();
        const alarmTime = new Date();
        alarmTime.setHours(hours, minutes, 0, 0);
        
        // Check if this time will be today or tomorrow
        const isToday = alarmTime > now;
        const dayText = isToday ? 'today' : 'tomorrow';
        
        Alert.alert(
          'Alarm Time Updated',
          `Alarm set for ${tempTime} ${dayText}${isToday ? '' : ' (time has passed today)'}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to update alarm time. Please try again.');
    }
  };

  const formatNextCheckTime = () => {
    if (!alarmState.nextCheckTime) return 'Not scheduled';
    
    const now = new Date();
    const nextCheck = alarmState.nextCheckTime;
    const diffMs = nextCheck.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return 'Overdue';
    if (diffHours === 0) return `in ${diffMinutes}m`;
    if (diffHours < 24) return `in ${diffHours}h ${diffMinutes}m`;
    
    // For longer times, show if it's today or tomorrow
    const isToday = nextCheck.toDateString() === now.toDateString();
    const dayText = isToday ? 'today' : 'tomorrow';
    
    return `${dayText} at ${nextCheck.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getAlarmStatusColor = () => {
    if (!alarmState.isEnabled) return '#6c757d';
    if (alarmState.isActive) return '#dc3545';
    return '#28a745';
  };

  const getAlarmStatusText = () => {
    if (!alarmState.isEnabled) return 'Alarm Disabled';
    if (alarmState.isActive && alarmState.isPlaying) return 'ALARM RINGING! 🚨';
    if (alarmState.isActive) return 'Alarm Active';
    return 'Alarm Armed ⏰';
  };

  if (!isInitialized) {
    return (
      <ThemedView style={[styles.container, style]}>
        <ThemedText>Initializing alarm system...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style]}>
      {/* Main Alarm Status */}
      <View style={[styles.statusCard, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: getAlarmStatusColor() }]}>
            <Ionicons 
              name={alarmState.isEnabled ? (alarmState.isActive ? "alarm" : "alarm-outline") : "notifications-off-outline"} 
              size={24} 
              color="white" 
            />
          </View>
          <View style={styles.statusTextContainer}>
            <ThemedText type="subtitle" style={styles.statusText}>
              {getAlarmStatusText()}
            </ThemedText>
            {alarmState.isEnabled && !alarmState.nextCheckTime && (
              <ThemedText style={styles.statusSubtext}>
                Scheduling...
              </ThemedText>
            )}
          </View>
        </View>

        {/* Alarm Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleLabelContainer}>
            <ThemedText style={styles.toggleLabel}>Dawn Patrol Alarm</ThemedText>
            <ThemedText style={styles.toggleSubLabel}>
              {hasBackgroundSupport ? 'Works in background' : 'Foreground only'}
            </ThemedText>
          </View>
          <Switch
            value={alarmState.isEnabled}
            onValueChange={handleToggleAlarm}
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor={alarmState.isEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Alarm Time Setting */}
      {alarmState.isEnabled && (
        <View style={[styles.timeCard, { backgroundColor: cardBackgroundColor }]}>
          <TouchableOpacity 
            style={styles.timeButton} 
            onPress={() => setTimeInputVisible(!timeInputVisible)}
          >
            <Ionicons name="time-outline" size={20} color={tintColor} />
            <View style={styles.timeTextContainer}>
              <ThemedText style={styles.timeText}>
                Alarm Time: {alarmState.alarmTime}
              </ThemedText>
              <ThemedText style={styles.timeSubtext}>
                {formatNextCheckTime()}
              </ThemedText>
            </View>
            <Ionicons 
              name={timeInputVisible ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={textColor} 
            />
          </TouchableOpacity>

          {timeInputVisible && (
            <View style={styles.timeInputContainer}>
              <ThemedText style={styles.timeInputLabel}>Set alarm time:</ThemedText>
              <View style={styles.timeInputRow}>
                <TouchableOpacity
                  style={[styles.timeInput, { borderColor: tintColor }]}
                  onPress={() => {
                    // In a real implementation, you'd show a time picker
                    Alert.prompt(
                      'Set Alarm Time',
                      'Enter time in HH:MM format (24-hour)',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Set',
                          onPress: (text) => {
                            if (text && /^\d{2}:\d{2}$/.test(text)) {
                              setTempTime(text);
                              handleTimeChange();
                            } else {
                              Alert.alert('Invalid Format', 'Please use HH:MM format (e.g., 05:30)');
                            }
                          }
                        }
                      ],
                      'plain-text',
                      tempTime
                    );
                  }}
                >
                  <ThemedText style={[styles.timeInputText, { color: tintColor }]}>
                    {tempTime}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.setTimeButton, { backgroundColor: tintColor }]}
                  onPress={handleTimeChange}
                >
                  <ThemedText style={styles.setTimeButtonText}>Set</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Active Alarm Controls */}
      {alarmState.isActive && (
        <View style={[styles.activeControlsCard, { backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }]}>
          <ThemedText style={[styles.activeAlarmText, { color: '#856404' }]}>
            🚨 Alarm is active! Wake up time?
          </ThemedText>
          <View style={styles.activeControlsButtons}>
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: '#dc3545' }]}
              onPress={handleStopAlarm}
            >
              <ThemedText style={styles.stopButtonText}>Stop Alarm</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyButton, { backgroundColor: '#6c757d' }]}
              onPress={handleEmergencyStop}
            >
              <ThemedText style={styles.emergencyButtonText}>Emergency Stop</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Background Support Info */}
      {!hasBackgroundSupport && Platform.OS !== 'web' && (
        <View style={[styles.infoCard, { backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }]}>
          <Ionicons name="information-circle-outline" size={20} color="#856404" />
          <ThemedText style={[styles.infoText, { color: '#856404' }]}>
            For background alarms, enable notifications in your device settings.
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSubLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  timeCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeTextContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  timeInputContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  timeInputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  timeInputText: {
    fontSize: 16,
    fontWeight: '500',
  },
  setTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setTimeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  activeControlsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeAlarmText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  activeControlsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  stopButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emergencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
});
