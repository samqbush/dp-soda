import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Emergency recovery component for when the app is completely stuck
 * Provides nuclear options to try to get the app working again
 */
export function EmergencyRecovery() {
  const handleClearStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert(
        'Storage Cleared', 
        'All app data has been cleared. The app should restart now.',
        [{ text: 'OK', onPress: () => handleRestart() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to clear storage: ' + e);
    }
  };

  const handleRestart = async () => {
    try {
      if (!__DEV__ && Updates.isEnabled) {
        await Updates.reloadAsync();
      } else {
        // In development, we can't force a reload, so just alert the user
        Alert.alert(
          'Restart Required', 
          'Please manually restart the app or reload the development server.'
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to restart: ' + e);
    }
  };

  const showRecoveryOptions = () => {
    Alert.alert(
      'Emergency Recovery',
      'The app appears to be stuck. What would you like to try?',
      [
        { text: 'Clear App Data', onPress: handleClearStorage, style: 'destructive' },
        { text: 'Restart App', onPress: handleRestart },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Only show on Android where white screen issues are most common
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.emergencyButton} onPress={showRecoveryOptions}>
        <Text style={styles.emergencyText}>🆘 Emergency Recovery</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  emergencyButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  emergencyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmergencyRecovery;
