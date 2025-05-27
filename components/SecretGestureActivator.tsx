import { DebugSettingsUI } from '@/components/DebugSettingsUI';
import { getBuildConfig } from '@/config/buildConfig';
import { debugSettings } from '@/services/debugSettings';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from 'react-native';

interface SecretGestureActivatorProps {
  children: React.ReactNode;
  text?: string;
}

/**
 * Component that wraps a piece of text or content and detects
 * secret gesture (multiple taps) to enable developer mode
 */
export function SecretGestureActivator({ children, text }: SecretGestureActivatorProps) {
  const [debugModalVisible, setDebugModalVisible] = useState(false);

  // Handler for secret tap gesture
  const handleSecretTap = () => {
    // Use the debug settings service to handle the tap
    debugSettings.handleSecretTap(async () => {
      // When secret pattern is detected, check if developer mode is already enabled
      const isDeveloperMode = await debugSettings.isDeveloperModeEnabled();
      
      if (isDeveloperMode) {
        // If already enabled, just show the debug settings UI
        setDebugModalVisible(true);
      } else {
        // If not enabled, ask for confirmation first
        Alert.alert(
          'Developer Mode',
          'Do you want to enable Developer Mode? This will give you access to debugging tools.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enable', 
              onPress: async () => {
                await debugSettings.toggleDeveloperMode(true);
                setDebugModalVisible(true);
              }
            }
          ]
        );
      }
    });
  };

  return (
    <>
      <TouchableWithoutFeedback onPress={handleSecretTap}>
        <View>
          {children}
        </View>
      </TouchableWithoutFeedback>

      {/* Debug Settings Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={debugModalVisible}
        onRequestClose={() => setDebugModalVisible(false)}
      >
        <DebugSettingsUI onClose={() => setDebugModalVisible(false)} />
      </Modal>
    </>
  );
}

/**
 * Component that shows version info and acts as a secret gesture activator
 */
export function VersionDisplay() {
  const buildConfig = getBuildConfig();
  const versionText = `Version ${buildConfig.version} (${buildConfig.environment})`;

  return (
    <SecretGestureActivator>
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>{versionText}</Text>
        {/* Secret gesture hint is not shown to users */}
      </View>
    </SecretGestureActivator>
  );
}

const styles = StyleSheet.create({
  versionContainer: {
    alignItems: 'center',
    padding: 15,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  hintText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
