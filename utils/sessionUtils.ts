// Global session management for app-wide persistence across component remounts
let globalSessionId: string | null = null;

/**
 * Get or create a global session ID that persists across component remounts
 * but resets on app restart. This is useful for tracking state that should
 * survive component remounts (like Android recovery system triggers) but
 * reset when the user actually restarts the app.
 * 
 * @returns A session ID string that remains consistent for the app session
 */
export function getGlobalSessionId(): string {
  if (globalSessionId === null) {
    globalSessionId = Date.now().toString();
    console.log(`📱 Created new global session ID: ${globalSessionId}`);
  }
  return globalSessionId;
}

/**
 * Reset the global session ID - primarily for testing purposes
 */
export function resetGlobalSessionId(): void {
  globalSessionId = null;
}