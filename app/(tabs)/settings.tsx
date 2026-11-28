import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThresholdSlider } from '@/components/ThresholdSlider';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={[
        styles.scrollContentContainer,
        { 
          // No header image here, so keep the title clear of the status bar
          paddingTop: insets.top,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 80 : 20 // Extra padding for iOS tab bar
        }
      ]}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>Settings</ThemedText>
        <ThemedText style={styles.subtitle}>
          Configure your app preferences
        </ThemedText>

        {/* Wind Threshold Section */}
        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Wind Display</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.cardTitle}>Wind Speed Threshold</ThemedText>
            <ThemedText style={styles.cardDescription}>
              Set the wind speed threshold for the yellow reference line displayed on the wind charts. This helps you quickly identify when conditions meet your preferred wind speed.
            </ThemedText>
            <ThresholdSlider />
          </View>
        </View>

        {/* App Information Section */}
        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>App Information</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: cardColor }]}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Version</ThemedText>
              <ThemedText style={styles.infoValue}>
                {Constants.expoConfig?.version || 'Unknown'}
              </ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Platform</ThemedText>
              <ThemedText style={styles.infoValue}>
                {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'web' ? 'Web' : 'Android'} {Platform.Version}
              </ThemedText>
            </View>
            
            {Constants.expoConfig?.ios?.buildNumber && Platform.OS === 'ios' && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Build</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {Constants.expoConfig.ios.buildNumber}
                </ThemedText>
              </View>
            )}
            
            {Constants.expoConfig?.android?.versionCode && Platform.OS === 'android' && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Build</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {Constants.expoConfig.android.versionCode}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.8,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  settingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    opacity: 0.7,
  },
});
