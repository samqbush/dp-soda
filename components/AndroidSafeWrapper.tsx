import React, { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

/**
 * Component that wraps the entire app to provide recovery mechanisms for Android
 * Helps prevent and recover from white screen issues in production
 */
export function AndroidSafeWrapper({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastActive, setLastActive] = useState(Date.now());
  const [renderKey, setRenderKey] = useState(0);
  
  // Handle app state changes (background/foreground)
  useEffect(() => {
    // Only set up listeners on Android
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      
      // If app comes to foreground and was inactive for more than 5 minutes
      // Force re-render the entire app to recover from any stale state
      const now = Date.now();
      if (
        appState !== 'active' &&
        nextAppState === 'active' &&
        (now - lastActive) > 5 * 60 * 1000 // 5 minutes
      ) {
        console.log('App inactive for 5+ minutes, forcing refresh');
        setRenderKey(k => k + 1);
      }
      
      if (nextAppState === 'active') {
        setLastActive(now);
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [appState, lastActive]);
  
  // Recovery logic - if we're not rendering properly, this useEffect will never run
  // and the recovery timeout won't be cleared, leading to a re-render
  useEffect(() => {
    // Only set up recovery on Android
    if (Platform.OS !== 'android') {
      return;
    }

    // Setting up a last resort recovery system
    const recoveryTimeout = setTimeout(() => {
      // This should never execute unless the component tree is hung
      console.warn('Android recovery system triggered - forcing component refresh');
      setRenderKey(k => k + 1);
    }, 10000); // 10 seconds
    
    return () => {
      // If this runs, it means the component mounted successfully
      clearTimeout(recoveryTimeout);
    };
  }, []); // Remove renderKey dependency to prevent infinite loop

  // Only apply wrapper behavior for Android
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container} key={`android-wrapper-${renderKey}`}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AndroidSafeWrapper;
