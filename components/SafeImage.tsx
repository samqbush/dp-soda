import { Image } from 'expo-image';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from './ThemedText';

interface SafeImageProps {
  source: any;
  style?: any;
  fallbackText?: string;
  backgroundColor?: string;
  contentFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * A wrapper around Image with fallback handling for Android
 * Prevents issues with image loading that can cause white screens
 */
export function SafeImage({ source, style, fallbackText, backgroundColor, contentFit = "contain" }: SafeImageProps) {
  // On Android, we add extra error handling and timeouts
  if (Platform.OS === 'android') {
    return (
      <View 
        style={[
          styles.container, 
          backgroundColor ? { backgroundColor } : null,
          style
        ]}
      >
        <Image
          source={source}
          style={styles.image}
          contentFit={contentFit}
          transition={300}
          onError={() => {
            console.warn('Image failed to load:', source);
          }}
        />
        {fallbackText && (
          <View style={styles.fallbackTextContainer}>
            <ThemedText style={styles.fallbackText}>{fallbackText}</ThemedText>
          </View>
        )}
      </View>
    );
  }
  
  // On iOS, use the standard Image component directly
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      transition={300}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackTextContainer: {
    position: 'absolute',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
  },
  fallbackText: {
    color: 'white',
    fontSize: 12,
  },
});

export default SafeImage;
