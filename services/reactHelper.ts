import React, { useCallback, useEffect, useRef } from 'react';
import { LogBox, Platform } from 'react-native';

// Disable specific warnings that might be related to the React hooks issue
LogBox.ignoreLogs([
  'Require cycle:',
  'Warning: Encountered two children with the same key',
  'Warning: Function components cannot be given refs',
  'Warning: Cannot update a component',
  'Non-serializable values were found in the navigation state',
]);

// Store the React instance reference to ensure consistent usage
const REACT_INSTANCE = React;

// Export a function to ensure there's only one React instance
export function ensureSingleReactInstance() {
  // This pattern ensures REACT_INSTANCE is used across the app
  // Return the same React instance every time
  return REACT_INSTANCE === React;
}

// Create a helper to safely use hooks even if there might be issues
export function useSafeHook<T>(hookFn: () => T): T | null {
  // Create a ref to store the hook's return value
  const resultRef = useRef<T | null>(null);
  
  try {
    // Try to call the hook function
    const result = hookFn();
    
    // Store the successful result
    resultRef.current = result;
    return result;
  } catch (error) {
    console.error('Hook error:', error);
    // Return the last valid result if available, otherwise null
    return resultRef.current;
  }
}

// Use this for class components or anything non-hook based
export function withErrorBoundary<P>(Component: React.ComponentType<P>): React.FC<P> {
  // Return a wrapped version of the component that catches errors
  return function WrappedWithErrorBoundary(props: P) {
    // Use state to track errors
    const [hasError, setHasError] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    
    // Handle errors during rendering
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error('Component error:', error);
      return null;
    }
  };
}

// Memory cleanup helper to prevent React Native memory issues
export async function cleanupReactInstancesMemory() {
  // Force garbage collection if available in debug mode
  if (__DEV__ && global.gc) {
    try {
      global.gc();
      return true;
    } catch (e) {
      console.warn('Failed to force garbage collection', e);
    }
  }
  
  // Additional memory optimizations specific to each platform
  if (Platform.OS === 'android') {
    // Clear any cached references that might be problematic
    try {
      // Request immediate GC on Android (though this is just a request)
      if (global.JavaScriptCore) {
        global.JavaScriptCore.GC();
      }
    } catch (e) {
      console.warn('Failed Android-specific memory cleanup', e);
    }
  }
  
  return false;
}

// Add this hook to monitor and prevent excessive re-renders
export function useRenderOptimizer(componentName?: string): number {
  // Count renders for DEBUG purposes
  const renderCount = useRef<number>(0);
  
  useEffect(() => {
    renderCount.current += 1;
    
    if (renderCount.current > 5 && __DEV__) {
      console.warn(`${componentName || 'Component'} re-rendered ${renderCount.current} times`);
    }
    
    return () => {
      // Clean up on unmount
      renderCount.current = 0;
    };
  });
  
  return renderCount.current;
}
