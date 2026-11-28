import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const rawColorScheme = useColorScheme();
  const colorScheme = (rawColorScheme === 'light' || rawColorScheme === 'dark') ? rawColorScheme : 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
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
          tabBarButtonTestID: 'tab-soda-lake',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="standley-lake"
        options={{
          title: 'Standley Lake',
          tabBarButtonTestID: 'tab-standley-lake',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wind" color={color} />,
        }}
      />
      <Tabs.Screen
        name="boulder-res"
        options={{
          title: 'Boulder Res',
          tabBarButtonTestID: 'tab-boulder-res',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="drop.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarButtonTestID: 'tab-settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear" color={color} />,
        }}
      />
    </Tabs>
  );
}
