// Simplified session management - in-memory only for better performance
// We use request deduplication at the API level instead of complex AsyncStorage logic

// Global session management for app-wide state tracking
let globalSessionId: string | null = null;

// In-memory tracking of what has been initially loaded this session
// This survives component remounts but resets on app restart
const initialLoadStatusCache = new Map<string, boolean>();

/**
 * Get or create a global session ID (in-memory only)
 * This provides a consistent session identifier without AsyncStorage complexity
 */
export function getGlobalSessionId(): string {
  if (globalSessionId === null) {
    globalSessionId = Date.now().toString();
    if (__DEV__) console.log(`📱 Created new global session ID: ${globalSessionId}`);
  }
  return globalSessionId;
}

/**
 * Synchronous version that returns the cached session ID or creates one
 */
export function getGlobalSessionIdSync(): string {
  return getGlobalSessionId();
}

/**
 * Check if a tab has been initially loaded this session (in-memory only)
 */
export function hasBeenInitiallyLoaded(tabName: string): boolean {
  const sessionId = getGlobalSessionId();
  const key = `initialLoad_${tabName}_${sessionId}`;
  
  const hasLoaded = initialLoadStatusCache.get(key) || false;
  if (__DEV__) console.log(`🔍 In-memory load status for ${tabName}: ${hasLoaded}`);
  return hasLoaded;
}

/**
 * Mark a tab as initially loaded (in-memory only)
 */
export function markAsInitiallyLoaded(tabName: string): void {
  const sessionId = getGlobalSessionId();
  const key = `initialLoad_${tabName}_${sessionId}`;
  
  if (__DEV__) console.log(`💾 Marking ${tabName} as initially loaded in memory`);
  initialLoadStatusCache.set(key, true);
  if (__DEV__) console.log(`✅ Stored in memory cache for ${tabName}`);
}

/**
 * Reset the global session ID - primarily for testing purposes
 */
export function resetGlobalSessionId(): void {
  globalSessionId = null;
  initialLoadStatusCache.clear();
}