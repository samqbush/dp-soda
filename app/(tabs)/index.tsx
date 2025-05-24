import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindDataDisplay } from '@/components/WindDataDisplay';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Wind Trend Analyzer</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <WindDataDisplay />
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Bear Creek Lake Wind Monitoring</ThemedText>
        <ThemedText>
          This app monitors wind conditions at Bear Creek Lake (Soda Lake Dam 1) in Colorado.
          It analyzes early morning wind trends (3am-5am) to determine if conditions are favorable
          for beach activities. The alarm logic considers wind speed, direction consistency, and
          data quality to make wake-up decisions.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">How It Works</ThemedText>
        <ThemedText>
          • Fetches real-time wind data from WindAlert API{'\n'}
          • Analyzes 3am-5am window for alarm decisions{'\n'}
          • Verifies conditions in 6am-8am window{'\n'}
          • Caches data for offline access{'\n'}
          • Configurable thresholds and criteria
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Settings</ThemedText>
        <ThemedText>
          Tap the Explore tab to configure alarm criteria, wind speed thresholds,
          and direction consistency requirements. All settings are saved locally
          and will persist between app launches.
        </ThemedText>
      </ThemedView>
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
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
