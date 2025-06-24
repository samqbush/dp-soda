import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAppSettings } from '@/contexts/SettingsContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { settings } = useAppSettings();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Soda Lake',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="standley-lake"
        options={{
          title: 'Standley Lake',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wind" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wind-guru"
        options={{
          title: 'Wind Guru',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cloud.sun.fill" color={color} />,
          href: settings.windGuruEnabled ? '/wind-guru' : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear" color={color} />,
        }}
      />
    </Tabs>
  );
}
