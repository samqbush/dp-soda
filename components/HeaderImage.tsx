import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { SafeImage } from '@/components/SafeImage';

interface HeaderImageProps {
  title: string;
  subtitle: string;
}

export function HeaderImage({ title, subtitle }: HeaderImageProps) {
  return (
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
        <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
        <ThemedText style={styles.headerSubtitle}>{subtitle}</ThemedText>
      </View>
    </View>
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
});
