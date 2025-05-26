import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

/**
 * Component that wraps the entire app to provide recovery mechanisms for Android
 * Helps prevent and recover from white screen issues in production
 */
export function AndroidSafeWrapper({ children }: { children: React.ReactNode }) {
  // Only needed for Android
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }

  const [appState, setAppState] = useState(AppState.currentState);
  const [lastActive, setLastActive] = useState(Date.now());
  const [renderKey, setRenderKey] = useState(0);
  const renderCount = useRef(0);
  const hasTriedRecovery = useRef(false);
  
  // Track render count to detect if we're in a bad state
  renderCount.current++;
  
  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      
      // If app comes to foreground after background, try to recover
      if (
        appState.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        const now = Date.now();
        const minutesInactive = (now - lastActive) / (60 * 1000);
        
        // Reset memory after long inactive periods
        if (minutesInactive > 3) {
          console.log(`App inactive for ${minutesInactive.toFixed(1)} minutes, clearing memory`);
          
          // Import recovery service dynamically
          import('@/services/memoryManager').then(({performMemoryCleanup}) => {
            performMemoryCleanup(minutesInactive > 30);
          }).catch(err => {
            console.error('Could not clean memory after inactive period:', err);
          });
        }
        
        // Force refresh after very long inactive periods (over 30 minutes)
        // This helps recover from any stale state
        if (minutesInactive > 30) {
          console.log('Long inactivity detected, forcing component refresh');
          setRenderKey(k => k + 1);
        }
      }
      
      if (nextAppState === 'active') {
        setLastActive(Date.now());
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [appState, lastActive]);
  
  // Recovery logic for white screen issues
  useEffect(() => {
    // Setting up a last resort recovery system
    const recoveryTimeout = setTimeout(() => {
      // This should never execute unless the component tree is hung
      console.warn('Android recovery system triggered - attempting deep recovery');
      
      // Try to recover using our recovery service
      if (!hasTriedRecovery.current) {
        hasTriedRecovery.current = true;
        
        // Import recovery service dynamically
        import('@/services/recoveryService').then(async ({recoverFromWhiteScreen}) => {
          try {
            await recoverFromWhiteScreen();
            // After recovery, force refresh
            setRenderKey(k => k + 1);
          } catch (e) {
            console.error('Recovery failed, forcing refresh anyway', e);
            setRenderKey(k => k + 1);
          }
        }).catch(() => {
          // If we can't even import recovery service, just force refresh
          setRenderKey(k => k + 1);
        });
      } else {
        // If we've already tried recovery once, just force refresh
        setRenderKey(k => k + 1);
      }
    }, 8000); // 8 seconds
    
    return () => {
      // If this runs, it means the component mounted successfully
      clearTimeout(recoveryTimeout);
    };
  }, [renderKey]);

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
