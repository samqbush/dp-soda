import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SodaLakeScreen() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <ThemedView style={[styles.headerCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.locationTitle}>Soda Lake Wind Monitor</ThemedText>
          <ThemedText style={styles.subtitle}>Real-time wind conditions at Soda Lake Dam 1</ThemedText>
        </ThemedView>

        {/* Coming Soon Section */}
        <ThemedView style={[styles.comingSoonCard, { backgroundColor: cardColor }]}>
          <View style={styles.iconContainer}>
            <ThemedText style={styles.comingSoonIcon}>🚧</ThemedText>
          </View>
          
          <ThemedText style={[styles.comingSoonTitle, { color: tintColor }]}>
            Coming Soon!
          </ThemedText>
          
          <ThemedText style={[styles.comingSoonDescription, { color: textColor }]}>
            We&apos;re working hard to bring you real-time wind monitoring for Soda Lake Dam 1.
          </ThemedText>
          
          <ThemedView style={styles.featuresList}>
            <ThemedText style={[styles.featureTitle, { color: textColor }]}>
              Planned Features:
            </ThemedText>
            
            <View style={styles.featureItem}>
              <ThemedText style={styles.bulletPoint}>🌊</ThemedText>
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                Real-time wind speed and direction
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <ThemedText style={styles.bulletPoint}>📊</ThemedText>
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                Historical wind data and trends
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <ThemedText style={styles.bulletPoint}>⚡</ThemedText>
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                Instant wind quality alerts
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <ThemedText style={styles.bulletPoint}>🎯</ThemedText>
              <ThemedText style={[styles.featureText, { color: textColor }]}>
                Smart dawn patrol recommendations
              </ThemedText>
            </View>
          </ThemedView>
          
          <ThemedText style={[styles.comingSoonFooter, { color: textColor }]}>
            Stay tuned for updates! 🚀
          </ThemedText>
        </ThemedView>

        {/* Info Card */}
        <ThemedView style={[styles.infoCard, { backgroundColor: cardColor }]}>
          <ThemedText style={[styles.infoTitle, { color: tintColor }]}>
            📍 About Soda Lake
          </ThemedText>
          <ThemedText style={[styles.infoText, { color: textColor }]}>
            Soda Lake Dam 1 in Colorado is a premier destination for wind sports enthusiasts. 
            Our monitoring system will provide you with the most accurate, real-time wind 
            conditions to help you make the best decisions for your dawn patrol sessions.
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 60, // Account for status bar
  },
  headerCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  comingSoonIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  bulletPoint: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  comingSoonFooter: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});
