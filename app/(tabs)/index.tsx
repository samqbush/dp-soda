import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { SafeImage } from '@/components/SafeImage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindDataDisplay } from '@/components/WindDataDisplay';
import { AlarmControlPanel } from '@/components/AlarmControlPanel';
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
      
      {/* Unified Alarm Control Panel */}
      <AlarmControlPanel />
      
      {/* Wind Data Display */}
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
    width: '100%', 
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
});
