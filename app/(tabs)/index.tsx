import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { SafeImage } from '@/components/SafeImage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindDataDisplay } from '@/components/WindDataDisplay';
import { productionCrashDetector } from '@/services/productionCrashDetector';

export default function HomeScreen() {
  useEffect(() => {
    console.log('🏠 HomeScreen mounted');
    productionCrashDetector.logUserAction('home_screen_loaded');
  }, []);

  // Track component loaded state for Android
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    // Mark component as fully loaded after a delay on Android
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, Platform.OS === 'android' ? 500 : 0);
    
    return () => clearTimeout(timer);
  }, []);

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
            fallbackText="Wind Analyzer"
            backgroundColor="#A1CEDC"
          />
        ) : (
          <Image
            source={require('@/assets/images/dawnpatrol.jpeg')}
            style={styles.headerImage}
          />
        )
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Wind Trend Analyzer</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <WindDataDisplay />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  headerImage: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
    resizeMode: 'cover',
  },
});
