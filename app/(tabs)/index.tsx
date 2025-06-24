import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SimpleAlarmControls } from '@/components/SimpleAlarmControls';
import { AlarmStatusCard } from '@/components/AlarmStatusCard';
import { SafeImage } from '@/components/SafeImage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { productionCrashDetector } from '@/services/productionCrashDetector';
import { useSimpleAlarm } from '@/hooks/useSimpleAlarm';

export default function DPAlarmScreen() {
  useEffect(() => {
    console.log('⏰ DP Alarm screen mounted');
    productionCrashDetector.logUserAction('dp_alarm_screen_loaded');
  }, []);

  // Get alarm state from new simple service
  const { windThreshold } = useSimpleAlarm();

  // Debug logging for threshold changes
  useEffect(() => {
    console.log('🎯 DP Alarm threshold updated:', windThreshold);
  }, [windThreshold]);

  const cardColor = useThemeColor({}, 'card');

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior="automatic"
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
          <ThemedText style={styles.headerSubtitle}>Smart Wind Alert System</ThemedText>
        </View>
      </View>

      <ThemedView style={styles.contentContainer}>
        {/* Simplified Alarm Status Display */}
        <AlarmStatusCard />

        {/* Alarm Control Panel */}
        <SimpleAlarmControls />

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>How It Works</ThemedText>
          <ThemedText style={styles.infoText}>
            This alarm works in the background! It will check wind conditions at your scheduled time even when the app is closed.
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Alarm Status:</ThemedText> Shows whether your alarm is enabled and armed
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Last Check:</ThemedText> When background alarm last checked conditions (shown below alarm controls)
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Your threshold:</ThemedText> Set in Settings tab (currently {windThreshold} mph)
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Background alerts:</ThemedText> You&apos;ll get notifications even when app is closed!
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • <ThemedText style={{ fontWeight: '600' }}>Current conditions:</ThemedText> Check the Soda Lake tab for real-time wind data
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
  cardTitle: {
    marginBottom: 12,
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
