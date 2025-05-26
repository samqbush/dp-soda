import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useStableState } from '@/hooks/useStableState';
import { performMemoryCleanup } from '@/services/memoryManager';

/**
 * SafeDataWrapper provides protection against state-related crashes for data-heavy components
 * Particularly useful for components that have complex state or display lots of data
 */
export function SafeDataWrapper<T>({ 
  data, 
  fallback, 
  children 
}: { 
  data: T; 
  fallback?: React.ReactNode;
  children: (safeData: T) => React.ReactNode;
}) {
  // Use stable state to prevent React rendering issues
  const [safeData, setSafeData] = useStableState<T>(data);
  const [hasError, setHasError] = useState(false);
  const mountedRef = useRef(false);
  
  // Safety check before rendering - if data is undefined/null, return fallback
  const isDataValid = data != null && !hasError;
  
  // Update safe data when input data changes
  useEffect(() => {
    try {
      if (data != null) {
        setSafeData(data);
      }
    } catch (error) {
      console.error('Error updating safe data:', error);
      setHasError(true);
    }
  }, [data, setSafeData]);
  
  // Perform memory cleanup when component mounts (on Android)
  useEffect(() => {
    if (Platform.OS === 'android' && !mountedRef.current) {
      mountedRef.current = true;
      
      // Clean up memory to prevent issues with data-heavy components
      performMemoryCleanup(false).catch(err => 
        console.error('Memory cleanup in SafeDataWrapper failed:', err)
      );
    }
  }, []);
  
  // If we have invalid data or an error, show fallback
  if (!isDataValid) {
    return fallback ? <>{fallback}</> : null;
  }
  
  // Wrap the children in error catching
  try {
    return <>{children(safeData)}</>;
  } catch (error) {
    console.error('Error rendering SafeDataWrapper children:', error);
    setHasError(true);
    return fallback ? <>{fallback}</> : null;
  }
}

/**
 * WindDataContainer provides a safe container specifically for wind data visualization
 * Handles common error cases and provides consistent styling
 */
export function WindDataContainer({ 
  children,
  isLoading = false,
  hasError = false,
  errorMessage = "Could not display data"
}: { 
  children: React.ReactNode;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}) {
  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {/* Just an empty loading container - parent component should handle loading UI */}
        </View>
      ) : hasError ? (
        <View style={styles.errorContainer}>
          {/* Simple error state - parent component should handle detailed error UI */}
          <View style={styles.errorIndicator} />
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden'
  },
  loadingContainer: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30'
  }
});
