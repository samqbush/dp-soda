import { AlarmImplementationComparison } from '@/components/AlarmImplementationComparison';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function TestAlarmScreen() {
  return (
    <ThemedView style={styles.container}>
      <ErrorBoundary>
        <ThemedText style={styles.title}>Wind Alarm Tester</ThemedText>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
});
