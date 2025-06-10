import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AlarmControlPanel } from '@/components/AlarmControlPanel';
import { SafeImage } from '@/components/SafeImage';
import { useDPAlarm } from '@/hooks/useDPAlarm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { productionCrashDetector } from '@/services/productionCrashDetector';

export default function DPAlarmScreen() {
  useEffect(() => {
    console.log('⏰ DP Alarm screen mounted');
    productionCrashDetector.logUserAction('dp_alarm_screen_loaded');
  }, []);

  const {
    alarmStatus,
    isLoading,
    error,
    refreshData,
    testAlarm
  } = useDPAlarm();

  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Track component loaded state for Android
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    // Mark component as fully loaded after a delay on Android
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, Platform.OS === 'android' ? 500 : 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch {
      Alert.alert('Error', 'Failed to refresh wind data. Please try again.');
    }
  };

  const handleTestAlarm = async () => {
    try {
      const result = await testAlarm();
      Alert.alert(
        result.triggered ? '🚨 Test Alarm Would Trigger!' : '❌ No Alarm',
        result.reason,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Test Failed', 'Unable to test alarm with current conditions');
    }
  };

  const formatLastUpdated = () => {
    if (!alarmStatus.lastUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - alarmStatus.lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return '#34C759';
      case 'medium': return '#FF9500';
      case 'low': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'High Confidence';
      case 'medium': return 'Medium Confidence';
      case 'low': return 'Low Confidence';
      default: return 'Unknown';
    }
  };

  // Show loading on Android until component is ready
  if (Platform.OS === 'android' && !isLoaded) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        Platform.OS === 'android' ? (
          <SafeImage
            source={require('@/assets/images/dawnpatrol.jpeg')}
            style={styles.headerImage}
            backgroundColor="#A1CEDC"
            contentFit="cover"
          />
        ) : (
          <Image
            source={require('@/assets/images/dawnpatrol.jpeg')}
            style={styles.headerImage}
            contentFit="cover"
          />
        )
      }>
      
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Dawn Patrol Alarm</ThemedText>
      </ThemedView>

      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <ThemedText style={[styles.retryButtonText, { color: tintColor }]}>
              Retry
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Large Alarm Status Display */}
      <View style={[styles.alarmStatusCard, { backgroundColor: cardColor }]}>
        <View style={styles.alarmStatusContainer}>
          <ThemedText style={[
            styles.alarmStatusText,
            { color: alarmStatus.shouldWakeUp ? '#34C759' : '#FF3B30' }
          ]}>
            {alarmStatus.shouldWakeUp ? 'Wake Up! 🌊' : 'Sleep In 😴'}
          </ThemedText>
          
          <View style={[
            styles.confidenceBadge,
            { backgroundColor: getConfidenceColor(alarmStatus.confidence) }
          ]}>
            <ThemedText style={styles.confidenceText}>
              {getConfidenceText(alarmStatus.confidence)}
            </ThemedText>
          </View>
          
          <ThemedText style={styles.reasonText}>
            {alarmStatus.reason}
          </ThemedText>
        </View>
      </View>

      {/* Current Conditions Summary */}
      <View style={[styles.conditionsCard, { backgroundColor: cardColor }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Current Conditions</ThemedText>
        <View style={styles.conditionsGrid}>
          <View style={styles.conditionItem}>
            <ThemedText style={styles.conditionLabel}>Current Speed</ThemedText>
            <ThemedText style={styles.conditionValue}>
              {alarmStatus.currentSpeed?.toFixed(1) || '--'} mph
            </ThemedText>
          </View>
          <View style={styles.conditionItem}>
            <ThemedText style={styles.conditionLabel}>Average Speed</ThemedText>
            <ThemedText style={styles.conditionValue}>
              {alarmStatus.averageSpeed?.toFixed(1) || '--'} mph
            </ThemedText>
          </View>
          <View style={styles.conditionItem}>
            <ThemedText style={styles.conditionLabel}>Threshold</ThemedText>
            <ThemedText style={styles.conditionValue}>
              {alarmStatus.threshold} mph
            </ThemedText>
          </View>
          <View style={styles.conditionItem}>
            <ThemedText style={styles.conditionLabel}>Last Check</ThemedText>
            <ThemedText style={styles.conditionValue}>
              {formatLastUpdated()}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Alarm Control Panel */}
      <AlarmControlPanel />

      {/* Quick Actions */}
      <View style={[styles.actionsCard, { backgroundColor: cardColor }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Quick Actions</ThemedText>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: tintColor }]}
            onPress={handleTestAlarm}
          >
            <ThemedText style={[styles.actionButtonText, { color: tintColor }]}>
              🧪 Test Alarm
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: tintColor }]}
            onPress={() => {
              // TODO: Navigate to settings tab - this will be implemented when we update settings
              Alert.alert('Settings', 'Settings will open when we update the settings tab in the next phase.');
            }}
          >
            <ThemedText style={[styles.actionButtonText, { color: tintColor }]}>
              ⚙️ Settings
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerImage: {
    width: '100%', 
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
  },
  retryButtonText: {
    fontWeight: '600',
  },
  alarmStatusCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  alarmStatusContainer: {
    alignItems: 'center',
  },
  alarmStatusText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  conditionsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    marginBottom: 12,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  conditionItem: {
    width: '48%',
    marginBottom: 12,
  },
  conditionLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  conditionValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
