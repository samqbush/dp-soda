# Enhanced Crash Detection and Recovery Guide

## Overview

The app now includes **multi-layered crash detection** to catch crashes that occur at different levels, including those that happen before React error boundaries can be established. This comprehensive system should catch the crashes you're experiencing after data loading.

## Enhanced Crash Detection Features

### 1. Global Crash Handler (NEW)
- **Purpose**: Catches crashes at the lowest level, before React components load
- **Coverage**: App initialization, global JavaScript errors, promise rejections
- **Features**:
  - Global error monitoring from app startup
  - Emergency recovery after 3+ crashes
  - Automatic data clearing when crashes persist
  - Works even when React components haven't loaded yet

### 2. DataCrashDetector Component  
- **Purpose**: Catches crashes in data-related components
- **Features**:
  - Automatic crash logging with timestamps
  - Crash frequency monitoring
  - Component-specific crash tracking
  - Recovery UI with multiple options

### 3. CrashMonitor Service
- **Purpose**: Centralized crash tracking and analysis
- **Features**:
  - Persistent crash history storage
  - Crash pattern analysis
  - Diagnostic information generation
  - Recent crash detection (5-minute window)

## New Global Crash Recovery Screen

When crashes occur early in the app lifecycle (like after loading data), you'll now see a **Global Crash Recovery** screen that appears even when other components fail. This screen provides:

1. **Crash Information**:
   - Component that crashed (e.g., "WindDataDisplay", "global")
   - Detailed error message
   - Platform information
   - Crash count and timing

2. **Recovery Options**:
   - 🔄 **Try Again**: Attempts to restart the app flow
   - 🔍 **Show Details**: Technical crash information with stack traces
   - 📋 **Generate Report**: Creates detailed crash report for debugging
   - 🗑️ **Clear All Data**: Nuclear option that clears all stored data
   - ✕ **Dismiss**: Hide the crash screen temporarily

3. **Emergency Features**:
   - **Auto-recovery**: After 3 crashes, automatically clears critical data
   - **Data protection**: Identifies and clears problematic cached data
   - **Crash frequency detection**: Monitors crash patterns

## What You'll See When Testing

### Normal Operation
- App loads successfully past splash screen
- Global crash handler initializes (check console logs)
- Data displays without crashes
- Charts render properly
- No crash recovery screens appear

### If Early Crashes Occur (NEW)
The **Global Crash Recovery** screen will appear with:
- Large overlay with crash details
- Component identification (WindDataDisplay, global, etc.)
- Recovery options specifically for early crashes
- Emergency data clearing if crashes persist

### If Component Crashes Occur  
The **DataCrashDetector** recovery screen shows:
- Component-specific crash information
- Try Again, Show Details, Clear Data options
- Crash frequency monitoring
   - Frequent crash detection (2+ crashes in 2 minutes)
   - Auto-recovery after 3 crashes to prevent infinite loops
   - Crash history persistence across app restarts

## Testing Instructions

### 1. Normal Testing
1. Install the updated APK
2. **Watch for initialization logs**: Look for "🛡️ Global crash handler initialized" in console
3. **Verify it loads past the white screen**: App should show content, not crash immediately
4. **Check data loading**: Let the app fully load wind data
5. **Navigate between tabs**: Test app stability across different screens

### 2. If You Experience Crashes

#### **First Crash - Look for Recovery Screen:**
1. **Global Crash Recovery**: Should appear as full-screen overlay with crash details
2. **Note crash timing**: Was it during splash, data loading, or chart rendering?
3. **Try recovery options**: Use "Try Again" button first
4. **Check console logs**: Look for crash detection messages starting with 🚨

#### **If No Recovery Screen Appears:**
This means the crash is happening at an even lower level. Report:
1. **Exact timing**: When exactly does the crash occur?
2. **Console output**: Any messages before the crash?
3. **Device behavior**: Does app close completely or just freeze?

#### **Multiple Crashes:**
1. Use "Show Details" to see technical information
2. Note if crashes happen in the same component repeatedly
3. Try "Clear All Data" if crashes persist
4. **Emergency Recovery**: After 3+ crashes, should automatically clear problematic data

### 3. Debug and Testing Features

#### **Android Debug Panel (In Development Mode):**
- **Location**: Top-right corner, "🐛 Debug Info" button
- **Features**: Platform info, storage test, render count
- **Crash Test**: "🧪 Test Crash" button to verify recovery systems work
- **Usage**: Tap to expand, use test crash to validate recovery

#### **Console Logging to Monitor:**
```
🛡️ Global crash handler initialized...
🚀 App initialization starting...
💾 Storage initialization result: true
🌊 WindDataDisplay mounted
🌊 WindDataDisplayContent rendering...
```

#### **If Crashes Occur - Look For:**
```
🚨 Global crash detected: [crash details]
🚨 CrashMonitor: Logging crash in [component]
🚨 Emergency recovery completed - cleared critical storage
```

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
