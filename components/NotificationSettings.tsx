import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
    DEFAULT_NOTIFICATION_SETTINGS,
    NotificationSettings,
    getNotificationSettings,
    saveNotificationSettings
} from '@/services/notificationService';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

interface NotificationSettingsProps {
  onSave?: (settings: NotificationSettings) => void;
}

export function NotificationSettingsComponent({ onSave }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  
  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getNotificationSettings();
        setSettings(savedSettings);
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Handle toggle changes
  const handleToggle = (key: keyof NotificationSettings) => (value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // Save settings
  const handleSave = async () => {
    try {
      await saveNotificationSettings(settings);
      Alert.alert('Success', 'Notification settings saved successfully!');
      if (onSave) {
        onSave(settings);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings.');
    }
  };
  
  // Reset to defaults
  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset notification settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => setSettings(DEFAULT_NOTIFICATION_SETTINGS)
        }
      ]
    );
  };
  
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading notification settings...</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>Notification Settings</ThemedText>
      
      {/* Master toggle */}
      <View style={[styles.settingRow, { borderColor }]}>
        <ThemedText style={styles.settingLabel}>Enable Notifications</ThemedText>
        <Switch
          trackColor={{ false: '#767577', true: tintColor }}
          thumbColor="#f4f3f4"
          ios_backgroundColor="#3e3e3e"
          onValueChange={handleToggle('enabled')}
          value={settings.enabled}
        />
      </View>
      
      {/* Notification types */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionHeader}>Notification Types</ThemedText>
        
        <View style={[styles.settingRow, { borderColor }]}>
          <ThemedText style={styles.settingLabel}>Wake-up Alarms</ThemedText>
          <Switch
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor="#f4f3f4"
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle('alarmNotifications')}
            value={settings.alarmNotifications && settings.enabled}
            disabled={!settings.enabled}
          />
        </View>
        
        <View style={[styles.settingRow, { borderColor }]}>
          <ThemedText style={styles.settingLabel}>Verification Results</ThemedText>
          <Switch
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor="#f4f3f4"
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle('verificationNotifications')}
            value={settings.verificationNotifications && settings.enabled}
            disabled={!settings.enabled}
          />
        </View>
        
        <View style={[styles.settingRow, { borderColor }]}>
          <ThemedText style={styles.settingLabel}>Data Updates</ThemedText>
          <Switch
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor="#f4f3f4"
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle('dataUpdateNotifications')}
            value={settings.dataUpdateNotifications && settings.enabled}
            disabled={!settings.enabled}
          />
        </View>
        
        <View style={[styles.settingRow, { borderColor }]}>
          <ThemedText style={styles.settingLabel}>Error Alerts</ThemedText>
          <Switch
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor="#f4f3f4"
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle('errorNotifications')}
            value={settings.errorNotifications && settings.enabled}
            disabled={!settings.enabled}
          />
        </View>
      </View>
      
      {/* Quiet hours */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionHeader}>Quiet Hours</ThemedText>
        
        <View style={[styles.settingRow, { borderColor }]}>
          <ThemedText style={styles.settingLabel}>Enable Quiet Hours</ThemedText>
          <Switch
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor="#f4f3f4"
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle('quietHoursEnabled')}
            value={settings.quietHoursEnabled && settings.enabled}
            disabled={!settings.enabled}
          />
        </View>
        
        <ThemedText style={styles.description}>
          During quiet hours, notifications will not be shown or sent.
        </ThemedText>

        {/* TODO: Add time picker for quiet hours start/end */}
      </View>
      
      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleSave}
        >
          <ThemedText style={styles.buttonText}>Save Settings</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: tintColor }]}
          onPress={handleReset}
        >
          <ThemedText style={[styles.buttonText, { color: tintColor }]}>Reset to Defaults</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  settingLabel: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'column',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
