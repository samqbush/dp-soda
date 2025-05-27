# Crash Detection and Recovery Guide

## Overview

The app now includes comprehensive crash detection and recovery mechanisms to help identify and resolve issues that cause crashes after the initial white screen problem was fixed.

## New Crash Detection Features

### 1. DataCrashDetector Component
- **Purpose**: Catches crashes in data-related components
- **Features**:
  - Automatic crash logging with timestamps
  - Crash frequency monitoring
  - Component-specific crash tracking
  - Recovery UI with multiple options

### 2. CrashMonitor Service
- **Purpose**: Centralized crash tracking and analysis
- **Features**:
  - Persistent crash history storage
  - Crash pattern analysis
  - Diagnostic information generation
  - Recent crash detection (5-minute window)

### 3. Enhanced Error Boundaries
- **WindDataDisplay**: Protected with DataCrashDetector
- **WindChart**: Protected with DataCrashDetector + additional chart-specific error handling
- **LineChart**: Wrapped with try-catch for rendering errors

## What You'll See When Testing

### Normal Operation
- App loads successfully
- Data displays without crashes
- Charts render properly

### If Crashes Occur
You'll see a crash recovery screen with:

1. **Crash Information**:
   - Component name that crashed
   - Error message
   - Timestamp of crash

2. **Recovery Options**:
   - 🔄 **Try Again**: Attempts to reload the component
   - 🔍 **Show Details**: Displays technical crash information
   - 🗑️ **Clear All Data**: Nuclear option if crashes persist

3. **Automatic Features**:
   - Frequent crash detection (2+ crashes in 2 minutes)
   - Auto-recovery after 3 crashes to prevent infinite loops
   - Crash history persistence across app restarts

## Testing Instructions

### 1. Normal Testing
1. Install the updated APK
2. Open the app
3. Verify it loads past the white screen
4. Check if data displays without crashing
5. Navigate between screens to test stability

### 2. If You Experience Crashes

#### First Crash:
1. Note what you were doing when it crashed
2. Check the crash recovery screen for details
3. Try the "Try Again" button
4. Report the error message and component name

#### Multiple Crashes:
1. Use "Show Details" to see technical information
2. Note the crash pattern (same component? same action?)
3. Try "Clear All Data" if crashes persist
4. Report the diagnostic information

### 3. Gather Diagnostic Information

If crashes occur, the app will automatically collect:
- Crash timestamp and component
- Error messages and stack traces
- Platform information
- Crash frequency patterns

You can access this via the crash recovery screen or by checking the console logs.

## What to Report

When reporting crashes, please include:

1. **Basic Info**:
   - When the crash occurred (loading data, viewing chart, etc.)
   - How many times it happened
   - Whether recovery options worked

2. **Technical Details** (if visible):
   - Component name that crashed
   - Error message
   - Crash recovery screen details

3. **Pattern Information**:
   - Does it crash consistently?
   - Does it crash on specific actions?
   - Does clearing data help?

## Recovery Strategies

### For Users:
1. **Single Crash**: Use "Try Again" button
2. **Multiple Crashes**: Use "Clear All Data" option
3. **Persistent Issues**: Report with diagnostic details

### For Developers:
1. Check crash monitor logs
2. Analyze crash patterns by component
3. Review error messages for root causes
4. Implement specific fixes based on crash data

## Crash Prevention Features

The app now includes:
- ✅ Null/undefined data validation
- ✅ Chart data sanitization
- ✅ Safe color function handling
- ✅ Protected async operations
- ✅ Graceful component fallbacks
- ✅ Memory leak prevention
- ✅ Invalid date handling

## Console Commands for Debugging

If you have access to the console (via debugging), you can use:

```javascript
// Check crash history
crashMonitor.getCrashHistory()

// Get crash summary
crashMonitor.getCrashSummary()

// Get diagnostic info
crashMonitor.getDiagnosticInfo()

// Clear crash history
crashMonitor.clearCrashHistory()
```

This enhanced crash detection system should help us quickly identify and resolve any remaining stability issues!
