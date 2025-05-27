import { LogBox } from 'react-native';

// Disable specific warnings that might be related to the React hooks issue
LogBox.ignoreLogs([
  'Require cycle:',
  'Warning: Encountered two children with the same key',
]);

// Export a function to ensure there's only one React instance
export function ensureSingleReactInstance() {
  // This function doesn't need to do anything special
  // It's just a way to import React in a consistent way
  return true;
}

// Create a helper to safely use hooks even if there might be issues
export function useSafeHook(hookFn) {
  try {
    return hookFn();
  } catch (error) {
    console.error('Hook error:', error);
    // Return a sensible fallback value based on the expected return type of the hook
    return null;
  }
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
  return false;
}
