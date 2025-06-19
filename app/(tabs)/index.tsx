import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AlarmControlPanel } from '@/components/AlarmControlPanel';
import { SafeImage } from '@/components/SafeImage';
import { useSodaLakeWind } from '@/hooks/useSodaLakeWind';
import { useUnifiedAlarm } from '@/hooks/useUnifiedAlarm';
import { useDPAlarm } from '@/hooks/useDPAlarm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { productionCrashDetector } from '@/services/productionCrashDetector';

export default function DPAlarmScreen() {
  useEffect(() => {
    console.log('⏰ DP Alarm screen mounted');
    productionCrashDetector.logUserAction('dp_alarm_screen_loaded');
  }, []);

  // Get current wind conditions from Soda Lake
  const {
    currentConditions,
    isLoadingCurrent,
    error: windError,
    currentConditionsUpdated,
    refreshCurrentConditions
  } = useSodaLakeWind();

  // Get alarm settings
  const { criteria } = useDPAlarm();
  const { alarmState } = useUnifiedAlarm();

  // Debug logging for threshold changes
  useEffect(() => {
    console.log('🎯 DP Alarm threshold updated:', criteria.minimumAverageSpeed);
  }, [criteria.minimumAverageSpeed]);

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
      await refreshCurrentConditions();
    } catch {
      Alert.alert('Error', 'Failed to refresh wind data. Please try again.');
    }
  };

  const formatLastUpdated = () => {
    if (!currentConditionsUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - currentConditionsUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCurrentWindSpeed = () => {
    return currentConditions?.windSpeedMph || null;
  };

  const getCurrentWindDirection = () => {
    return currentConditions?.windDirection || null;
  };

  const getWindDirectionText = (degrees: number | null) => {
    if (degrees === null) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  // Determine current alarm status based on current conditions
  const shouldWakeUp = () => {
    const currentSpeed = getCurrentWindSpeed();
    if (currentSpeed === null) return false;
    return currentSpeed >= criteria.minimumAverageSpeed;
  };

  const getAlarmStatusReason = () => {
    const currentSpeed = getCurrentWindSpeed();
    
    if (!currentConditions) {
      return 'No current wind data available';
    }
    
    if (currentSpeed === null) {
      return 'Wind speed data not available';
    }
    
    if (shouldWakeUp()) {
      return `Current wind speed (${currentSpeed.toFixed(1)} mph) meets your threshold (${criteria.minimumAverageSpeed} mph) - Time to go!`;
    } else {
      return `Current wind speed (${currentSpeed.toFixed(1)} mph) below your threshold (${criteria.minimumAverageSpeed} mph) - Maybe next time`;
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
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isLoadingCurrent}
          onRefresh={handleRefresh}
          tintColor={tintColor}
        />
      }
    >
      {/* Header Image */}
      <View style={styles.headerImageContainer}>
        {Platform.OS === 'android' ? (
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
        )}
        <View style={styles.headerOverlay}>
          <ThemedText type="title" style={styles.headerTitle}>Dawn Patrol Alarm</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Current Soda Lake Conditions</ThemedText>
        </View>
      </View>

      <ThemedView style={styles.contentContainer}>
        {windError && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>⚠️ {windError}</ThemedText>
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
              { color: shouldWakeUp() ? '#34C759' : '#FF3B30' }
            ]}>
              {shouldWakeUp() ? 'Go For It! 🌊' : 'Sleep In 😴'}
            </ThemedText>
            
            <ThemedText style={styles.reasonText}>
              {getAlarmStatusReason()}
            </ThemedText>
          </View>
        </View>

        {/* Current Wind Conditions */}
        <View style={[styles.conditionsCard, { backgroundColor: cardColor }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Current Wind Conditions</ThemedText>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: tintColor }]}
              onPress={handleRefresh}
              disabled={isLoadingCurrent}
            >
              <ThemedText style={[styles.refreshButtonText, { color: tintColor }]}>
                {isLoadingCurrent ? '⏳' : '🔄'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.conditionsGrid}>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Wind Speed</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {getCurrentWindSpeed()?.toFixed(1) || '--'} mph
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Direction</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {getWindDirectionText(getCurrentWindDirection())} ({getCurrentWindDirection()?.toFixed(0) || '--'}°)
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Your Threshold</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {criteria.minimumAverageSpeed} mph
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Last Updated</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {formatLastUpdated()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Alarm Control Panel */}
        <AlarmControlPanel />

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>How It Works</ThemedText>
          <ThemedText style={styles.infoText}>
            This alarm checks current wind conditions at Soda Lake and compares them to your threshold. 
            When the alarm is enabled and scheduled, it will wake you up if current wind speed meets your criteria.
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Current conditions:</ThemedText> Live data from Ecowitt weather station
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Your threshold:</ThemedText> Set in Settings tab (currently {criteria.minimumAverageSpeed} mph)
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Simple logic:</ThemedText> Current speed ≥ threshold = wake up!
          </ThemedText>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerImageContainer: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%', 
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  contentContainer: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 20,
    lineHeight: 40,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
});
