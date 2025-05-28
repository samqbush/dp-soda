import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindAlarmTesterFixed } from '@/components/WindAlarmTesterFixed';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function TestAlarmScreen() {
  return (
    <ThemedView style={styles.container}>
      <ErrorBoundary>
        <ThemedText style={styles.title}>Wind Alarm Testing</ThemedText>
        <ScrollView style={styles.scrollView}>
          <WindAlarmTesterFixed />
        </ScrollView>
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
