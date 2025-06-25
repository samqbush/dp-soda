import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThresholdSlider } from '@/components/ThresholdSlider';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAppSettings } from '@/contexts/SettingsContext';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { settings, updateSetting } = useAppSettings();
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={[
        styles.scrollContentContainer,
        { 
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

        {/* App Features Section */}
        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>App Features</ThemedText>
          
          <View style={[styles.settingCard, { backgroundColor: cardColor }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Wind Guru Tab</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Enable experimental wind forecasting features
                </ThemedText>
              </View>
              <Switch
                trackColor={{ false: '#767577', true: tintColor }}
                thumbColor={settings.windGuruEnabled ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={async (value) => {
                  try {
                    await updateSetting('windGuruEnabled', value);
                  } catch (err) {
                    console.error('Failed to update Wind Guru setting:', err);
                    Alert.alert('Error', 'Failed to update Wind Guru setting');
                  }
                }}
                value={settings.windGuruEnabled}
              />
            </View>
            
            {settings.windGuruEnabled && (
              <View style={styles.warningBox}>
                <ThemedText style={[styles.warningText, { color: '#FF9500' }]}>
                  ⚠️ <ThemedText style={{ fontWeight: 'bold' }}>Experimental Feature</ThemedText>
                </ThemedText>
                <ThemedText style={[styles.warningText, { color: textColor, opacity: 0.8 }]}>
                  Wind Guru features are under development and may not be reliable for critical decisions.
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
});
