/**
 * Audio Debugging Utility for Wind Alarm Tester
 * 
 * This dedicated logging utility provides enhanced visibility into the audio lifecycle
 * and debugging information for the alarm system.
 */

// Timestamp formatter for logs
const getTimestamp = (): string => {
  const now = new Date();
  return `${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

// Prefixes for different log types
const LOG_PREFIXES = {
  INFO: '📝',
  WARNING: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  AUDIO: '🔊',
  STATE: '🔄',
  LIFECYCLE: '⏱️',
};

// Keep a history of logs for troubleshooting
const logHistory: string[] = [];
const MAX_LOG_HISTORY = 100;

/**
 * Creates a log message and handles both console output and history storage
 */
const createLog = (prefix: string, message: string, data?: any): string => {
  const timestamp = getTimestamp();
  const logMessage = `[${timestamp}] ${prefix} ${message}`;
  
  // Store in history
  logHistory.push(logMessage);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift(); // Remove oldest log
  }
  
  // Add data if provided
  if (data !== undefined) {
    console.log(logMessage, data);
    return `${logMessage} ${JSON.stringify(data)}`;
  } else {
    console.log(logMessage);
    return logMessage;
  }
};

// Core logging functions
const info = (message: string, data?: any) => createLog(LOG_PREFIXES.INFO, message, data);
const warning = (message: string, data?: any) => createLog(LOG_PREFIXES.WARNING, message, data);
const error = (message: string, data?: any) => createLog(LOG_PREFIXES.ERROR, message, data);
const success = (message: string, data?: any) => createLog(LOG_PREFIXES.SUCCESS, message, data);

// Specialized audio logging
const audio = {
  play: (message: string, data?: any) => createLog(`${LOG_PREFIXES.AUDIO} PLAY`, message, data),
  stop: (message: string, data?: any) => createLog(`${LOG_PREFIXES.AUDIO} STOP`, message, data),
  unload: (message: string, data?: any) => createLog(`${LOG_PREFIXES.AUDIO} UNLOAD`, message, data),
  error: (message: string, data?: any) => createLog(`${LOG_PREFIXES.AUDIO} ERROR`, message, data),
  reset: (message: string, data?: any) => createLog(`${LOG_PREFIXES.AUDIO} RESET`, message, data),
  state: (state: any) => createLog(`${LOG_PREFIXES.AUDIO} STATE`, 'Current audio state:', state),
};

// State change logging
const state = {
  change: (stateName: string, oldValue: any, newValue: any) => {
    return createLog(
      LOG_PREFIXES.STATE, 
      `State change: ${stateName}`,
      { from: oldValue, to: newValue }
    );
  },
  set: (stateName: string, value: any) => {
    return createLog(LOG_PREFIXES.STATE, `Setting state: ${stateName}`, value);
  }
};

// Lifecycle logging
const lifecycle = {
  start: (functionName: string) => {
    return createLog(LOG_PREFIXES.LIFECYCLE, `START: ${functionName}`);
  },
  end: (functionName: string, success = true) => {
    return createLog(
      success ? LOG_PREFIXES.SUCCESS : LOG_PREFIXES.ERROR, 
      `END: ${functionName} - ${success ? 'Success' : 'Failed'}`
    );
  }
};

// Utility functions
const getLogHistory = (): string[] => [...logHistory];

const clearLogHistory = (): void => {
  logHistory.length = 0;
};

// Force logs to appear in Expo development logs
// This will be useful when log statements might be filtered out by React Native
const forceLog = (message: string, data?: any) => {
  // Using setTimeout pushes the log to a different part of the JS event loop
  // which helps ensure it appears in the Expo client logs
  setTimeout(() => {
    console.log(`FORCED_LOG: ${message}`, data);
  }, 0);
};

// Comprehensive audio state logging
const logAudioState = (soundRef: any, isPlaying: boolean, soundEnabled: boolean, snoozeEnabled: boolean): void => {
  const state = {
    isPlaying,
    soundEnabled,
    snoozeEnabled,
    soundRefExists: soundRef !== null && soundRef !== undefined,
    soundRefType: soundRef !== null && soundRef !== undefined ? typeof soundRef : 'null/undefined',
    timestamp: new Date().toISOString(),
  };
  
  audio.state(state);
  
  // Force this log to appear in Expo development logs
  forceLog('Audio State Log:', state);
};

export const AlarmLogger = {
  info,
  warning,
  error,
  success,
  audio,
  state,
  lifecycle,
  getLogHistory,
  clearLogHistory,
  forceLog,
  logAudioState,
};

// Make the logger available globally for debugging in the console
(global as any).AlarmLogger = AlarmLogger;
