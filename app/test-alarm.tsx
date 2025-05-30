import { AlarmImplementationComparison } from '@/components/AlarmImplementationComparison';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { debugSettings } from '@/services/debugSettings';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function TestAlarmScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check if developer mode is enabled and Wind Alarm Tester is enabled
        const isDeveloperMode = await debugSettings.isDeveloperModeEnabled();
        const isComponentVisible = await debugSettings.isComponentVisible('showWindAlarmTester');
        
        setHasAccess(isDeveloperMode && isComponentVisible);
      } catch (error) {
        console.error('Error checking developer access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, []);

  useEffect(() => {
    // Redirect to home if access is denied
    if (!isLoading && !hasAccess) {
      router.replace('/');
    }
  }, [isLoading, hasAccess]);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Checking access...</ThemedText>
      </ThemedView>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect via useEffect
  }

  return (
    <ThemedView style={styles.container}>
      <ErrorBoundary>
        <ThemedText style={styles.title}>Wind Alarm Tester</ThemedText>
        <ThemedText style={styles.developerNote}>Developer Mode Feature</ThemedText>
        <View style={styles.warningBox}>
          <ThemedText style={styles.warningText}>
            This is a developer tool for testing the wind alarm functionality.
            Changes here will not affect the actual wind alarm settings.
          </ThemedText>
        </View>
        <AlarmImplementationComparison />
      </ErrorBoundary>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  developerNote: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 170, 90, 0.2)', // Light orange
    borderWidth: 1,
    borderColor: '#FFAA5A', // Medium orange
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
});
