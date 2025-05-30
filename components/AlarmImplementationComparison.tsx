import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { WindAlarmTesterRefactored } from './WindAlarmTesterRefactored';

/**
 * Wind Alarm implementation using the refactored component.
 * The original implementation has been removed and replaced with this cleaner version.
 */
export function AlarmImplementationComparison() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Wind Alarm Tester</ThemedText>
      
      <ThemedText style={styles.description}>
        This implementation uses custom hooks and services for better separation of concerns,
        improving maintainability and testing.
      </ThemedText>
      
      <View style={styles.divider} />
      
      <WindAlarmTesterRefactored />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginVertical: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 10,
  }
});
