import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSimpleAlarm } from '@/hooks/useSimpleAlarm';

export function AlarmStatusCard() {
  const { enabled, windThreshold, alarmTime } = useSimpleAlarm();
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  
  const formatTime = (timeString: string) => {
    // Convert time string (HH:MM) to a proper display format
    const [hours, minutes] = timeString.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusColor = () => {
    if (!enabled) return '#666666';
    return tintColor;
  };

  const getStatusText = () => {
    if (!enabled) return 'Disabled';
    return `Enabled for ${formatTime(alarmTime)}`;
  };

  const getStatusIcon = () => {
    if (!enabled) return '⏰';
    return '🔔';
  };

  return (
    <ThemedView style={[styles.card, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          <ThemedText style={[styles.statusIcon, { color: getStatusColor() }]}>
            {getStatusIcon()}
          </ThemedText>
          <View style={styles.statusTextContainer}>
            <ThemedText style={[styles.statusTitle, { color: getStatusColor() }]}>
              Dawn Patrol Alarm
            </ThemedText>
            <ThemedText style={[styles.statusSubtitle, { color: getStatusColor() }]}>
              {getStatusText()}
            </ThemedText>
          </View>
        </View>
      </View>

      {enabled && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Wind Threshold:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {windThreshold} mph
            </ThemedText>
          </View>
          
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Next Check:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatTime(alarmTime)}
            </ThemedText>
          </View>
          
          <ThemedText style={styles.helpText}>
            Alarm will check current wind conditions and wake you if wind speed ≥ {windThreshold} mph
          </ThemedText>
        </View>
      )}

      {!enabled && (
        <View style={styles.details}>
          <ThemedText style={styles.helpText}>
            Enable the alarm to get woken up when wind conditions are favorable for dawn patrol
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  details: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 8,
  },
});
