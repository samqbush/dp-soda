import AsyncStorage from '@react-native-async-storage/async-storage';

// Global session management for app-wide persistence across component remounts
let globalSessionId: string | null = null;
const SESSION_KEY = 'app_global_session_id';

// In-memory tracking of what has been initially loaded this session
// This survives component remounts but resets on app restart
const initialLoadStatusCache = new Map<string, boolean>();

/**
 * Get or create a global session ID that persists across component remounts
 * but resets on app restart. This is useful for tracking state that should
 * survive component remounts (like Android recovery system triggers) but
 * reset when the user actually restarts the app.
 * 
 * We store it in AsyncStorage but with a memory cache for performance.
 * The session ID is tied to the app launch, so it resets on app restart.
 * 
 * @returns A session ID string that remains consistent for the app session
 */
export async function getGlobalSessionId(): Promise<string> {
  if (globalSessionId === null) {
    try {
      // Try to get existing session from storage first
      const storedSessionId = await AsyncStorage.getItem(SESSION_KEY);
      if (storedSessionId) {
        globalSessionId = storedSessionId;
        console.log(`📱 Retrieved existing global session ID: ${globalSessionId}`);
      } else {
        // Create new session and store it
        globalSessionId = Date.now().toString();
        await AsyncStorage.setItem(SESSION_KEY, globalSessionId);
        console.log(`📱 Created new global session ID: ${globalSessionId}`);
      }
    } catch (error) {
      // Fallback to memory-only session if AsyncStorage fails
      console.warn('Failed to manage global session in AsyncStorage, using memory-only:', error);
      globalSessionId = Date.now().toString();
      console.log(`📱 Created fallback global session ID: ${globalSessionId}`);
    }
  }
  return globalSessionId;
}

/**
 * Synchronous version that returns the cached session ID or creates one if not available
 * Use this when you need immediate access and are sure the session has been initialized
 */
export function getGlobalSessionIdSync(): string {
  if (globalSessionId === null) {
    globalSessionId = Date.now().toString();
    console.log(`📱 Created sync global session ID: ${globalSessionId}`);
    // Try to store it asynchronously (fire and forget)
    AsyncStorage.setItem(SESSION_KEY, globalSessionId).catch(() => {});
  }
  return globalSessionId;
}

/**
 * Check if a tab has been initially loaded this session using dual approach:
 * 1. First check in-memory cache (fastest, survives component remounts)
 * 2. If not found, check AsyncStorage (survives some types of app resets)
 */
export async function hasBeenInitiallyLoaded(tabName: string): Promise<boolean> {
  try {
    const sessionId = await getGlobalSessionId();
    const key = `initialLoad_${tabName}_${sessionId}`;
    
    // First check in-memory cache
    if (initialLoadStatusCache.has(key)) {
      const status = initialLoadStatusCache.get(key)!;
      console.log(`🔍 Found in-memory load status for ${tabName}: ${status}`);
      return status;
    }
    
    // If not in memory, check AsyncStorage
    try {
      const storedStatus = await AsyncStorage.getItem(key);
      const hasLoaded = storedStatus === 'true';
      console.log(`🔍 Checking AsyncStorage load status for ${tabName} with key ${key}: ${hasLoaded}`);
      
      // Cache the result in memory for faster future access
      initialLoadStatusCache.set(key, hasLoaded);
      
      return hasLoaded;
    } catch (storageError) {
      console.warn('AsyncStorage check failed, falling back to in-memory only:', storageError);
      return false;
    }
  } catch (error) {
    console.error('Failed to check load status for', tabName, ':', error);
    return false;
  }
}

/**
 * Mark a tab as initially loaded using dual persistence:
 * 1. Store in in-memory cache (survives component remounts)
 * 2. Store in AsyncStorage (backup persistence)
 */
export async function markAsInitiallyLoaded(tabName: string): Promise<void> {
  try {
    const sessionId = await getGlobalSessionId();
    const key = `initialLoad_${tabName}_${sessionId}`;
    
    console.log(`💾 Marking ${tabName} as initially loaded with key: ${key}`);
    
    // Store in in-memory cache first (most reliable)
    initialLoadStatusCache.set(key, true);
    console.log(`✅ Stored in memory cache for ${tabName}`);
    
    // Also store in AsyncStorage as backup
    try {
      await AsyncStorage.setItem(key, 'true');
      
      // Verify storage
      const verification = await AsyncStorage.getItem(key);
      console.log(`🔍 AsyncStorage verification for ${key}: ${verification}`);
      
      if (verification !== 'true') {
        console.warn(`⚠️ AsyncStorage verification failed for ${key}`);
      }
    } catch (storageError) {
      console.warn('AsyncStorage persistence failed (in-memory cache still available):', storageError);
    }
  } catch (error) {
    console.error('Failed to mark as initially loaded for', tabName, ':', error);
    // Don't throw - this shouldn't prevent the app from working
  }
}

/**
 * Reset the global session ID - primarily for testing purposes
 */
export async function resetGlobalSessionId(): Promise<void> {
  globalSessionId = null;
  initialLoadStatusCache.clear();
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear global session from AsyncStorage:', error);
  }
}