import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindData } from '@/hooks/useWindData';
import type { AlarmCriteria } from '@/services/windService';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { criteria, setCriteria, refreshData } = useWindData();
  const [localCriteria, setLocalCriteria] = useState<AlarmCriteria>(criteria);
  const [hasChanges, setHasChanges] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

  useEffect(() => {
    const hasChanges = JSON.stringify(localCriteria) !== JSON.stringify(criteria);
    setHasChanges(hasChanges);
  }, [localCriteria, criteria]);

  const handleSave = async () => {
    try {
      await setCriteria(localCriteria);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultCriteria: AlarmCriteria = {
              minimumAverageSpeed: 10,
              directionConsistencyThreshold: 70,
              minimumConsecutivePoints: 4,
              speedDeviationThreshold: 3,
              directionDeviationThreshold: 45
            };
            setLocalCriteria(defaultCriteria);
          }
        }
      ]
    );
  };

  const updateCriteria = (key: keyof AlarmCriteria, value: number) => {
    setLocalCriteria(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>Alarm Settings</ThemedText>
        <ThemedText style={styles.subtitle}>
          Configure the criteria used to determine if wind conditions are worth waking up for.
        </ThemedText>

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Wind Speed</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Minimum Average Speed (mph)
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Minimum wind speed required during the 3am-5am window
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.minimumAverageSpeed.toString()}
              onChangeText={(text) => updateCriteria('minimumAverageSpeed', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={textColor + '80'}
            />
          </View>

          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Speed Deviation Threshold (mph)
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Maximum allowed variation in wind speed
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.speedDeviationThreshold.toString()}
              onChangeText={(text) => updateCriteria('speedDeviationThreshold', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={textColor + '80'}
            />
          </View>
        </View>

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Wind Direction</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Direction Consistency (%)
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Minimum percentage of consistent wind direction
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.directionConsistencyThreshold.toString()}
              onChangeText={(text) => updateCriteria('directionConsistencyThreshold', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="70"
              placeholderTextColor={textColor + '80'}
            />
          </View>

          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Direction Deviation Threshold (degrees)
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Maximum allowed variation in wind direction
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.directionDeviationThreshold.toString()}
              onChangeText={(text) => updateCriteria('directionDeviationThreshold', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="45"
              placeholderTextColor={textColor + '80'}
            />
          </View>
        </View>

        <View style={styles.settingSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Data Quality</ThemedText>
          
          <View style={styles.settingItem}>
            <ThemedText style={styles.settingLabel}>
              Minimum Consecutive Good Points
            </ThemedText>
            <ThemedText style={styles.settingDescription}>
              Number of consecutive data points that must meet criteria
            </ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              value={localCriteria.minimumConsecutivePoints.toString()}
              onChangeText={(text) => updateCriteria('minimumConsecutivePoints', parseInt(text) || 0)}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor={textColor + '80'}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleReset}
          >
            <ThemedText style={styles.resetButtonText}>Reset to Defaults</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              { backgroundColor: hasChanges ? tintColor : tintColor + '50' }
            ]}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <ThemedText style={styles.saveButtonText}>
              {hasChanges ? 'Save Changes' : 'No Changes'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>About</ThemedText>
          <ThemedText style={styles.infoText}>
            This app monitors wind conditions at Bear Creek Lake (Soda Lake Dam 1) in Colorado.
            It analyzes wind data in the 3am-5am window to determine if conditions are favorable
            for beach activities. The verification window (6am-8am) checks if the predicted
            conditions actually occurred.
          </ThemedText>
          
          <ThemedText style={styles.infoText}>
            Data is fetched from WindAlert and cached locally for offline access.
            Wind speeds are displayed in mph and directions in degrees.
          </ThemedText>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={refreshData}
          >
            <ThemedText style={styles.saveButtonText}>Refresh Wind Data</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.8,
  },
  settingSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 16,
  },
  infoText: {
    marginBottom: 16,
    lineHeight: 20,
    opacity: 0.8,
  },
});
