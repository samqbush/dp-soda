# Wind Guru Prediction Workflow

## Overview

The Wind Guru tab implements a sophisticated time-based prediction lifecycle that ensures consistent, reliable forecasting for katabatic wind conditions. This document outlines the exact workflow, timing, and state transitions.

## Prediction Lifecycle States

The system uses five distinct prediction states managed by the `PredictionStateManager`:

1. **Preview** - Initial forecast calculation and updates
2. **Locked** - Prediction locked and no longer changes
3. **Active** - Prediction is live during dawn patrol window
4. **Verified** - Post-event verification against actual conditions

## Complete Daily Workflow

### Phase 1: Morning Preview (Before 6 PM)
**Time**: Any time until 6:00 PM
**State**: `preview`
**User Experience**:
- Tomorrow's prediction shows preliminary forecast
- Prediction can be refreshed manually
- Weather data updates normally
- Message: "Preview mode - prediction will lock at 6 PM"

**Technical Details**:
- Fresh prediction calculation on each refresh
- Uses current weather models
- No locking mechanisms active
- Data quality marked as "preliminary"

### Phase 2: Evening Lock Window (6:00 PM - 11:59 PM)
**Time**: 6:00 PM - 11:59 PM
**State**: `preview` → `locked` (with intermediate updates allowed)
**User Experience**:
- **User can refresh anytime between 6 PM - 11:59 PM to lock in the prediction**
- First refresh after 6 PM creates "evening lock"
- Subsequent refreshes update the locked prediction until 11 PM
- Final lock occurs automatically at 11 PM
- Enhanced accuracy using complete thermal cycle data

**Technical Details**:
- **6:00 PM**: Evening lock becomes available
  - `shouldLock: true, lockType: 'evening'`
  - Prediction automatically locked on next analysis
- **6:00 PM - 10:59 PM**: Refreshable lock period
  - User can manually refresh to update locked prediction
  - Each refresh updates the evening lock with latest data
  - Weather models include complete thermal cycle information
- **11:00 PM**: Final lock automatically applied
  - `shouldLock: true, lockType: 'final'`
  - No further changes allowed until after dawn patrol

**Key Features**:
- **User Control**: Users can refresh during 6 PM - 11:59 PM window to optimize their prediction
- **Progressive Enhancement**: Later refreshes use more complete weather data
- **Automatic Failsafe**: If user doesn't refresh, system auto-locks at 11 PM

### Phase 3: Prediction Locked (Midnight - 6:00 AM)
**Time**: 12:00 AM - 5:59 AM
**State**: `locked`
**User Experience**:
- Today's prediction shows locked forecast from previous evening
- No refresh capability - prediction is frozen
- Message: "Prediction locked for today - awaiting dawn patrol"

**Technical Details**:
- System uses locked prediction from `PredictionStateManager`
- No new calculation performed regardless of weather updates
- Prediction consistency maintained from evening through dawn execution

### Phase 4: Validation Mode (6:00 AM - 8:00 AM)
**Time**: 6:00 AM - 7:59 AM
**State**: `active`
**User Experience**:
- Today's prediction remains the locked version
- Real-time verification begins if wind data available
- Live monitoring during actual dawn patrol window
- Message: "Active dawn patrol window - prediction is live"

**Technical Details**:
- Locked prediction displayed (no recalculation)
- Wind data validation runs in background
- Accuracy tracking begins if Soda Lake data available

### Phase 5: Post-Dawn Verification (After 8:00 AM)
**Time**: 8:00 AM onwards
**State**: `verified`
**User Experience**:
- Today's prediction frozen for historical accuracy
- Verification results shown if available
- Tomorrow's prediction hidden until 6 PM
- Message: "Dawn patrol complete - prediction can be verified"

**Technical Details**:
- Prediction validation completed
- Results stored for historical tracking
- Tomorrow's forecast not available until evening cycle begins

## Critical Lock Points

### Evening Lock (6:00 PM)
```typescript
{
  state: 'preview',
  shouldLock: true,
  lockType: 'evening',
  message: 'Evening preview lock (6 PM) - preliminary prediction set'
}
```

### Final Lock (11:00 PM)
```typescript
{
  state: 'locked',
  shouldLock: true,
  lockType: 'final',
  message: 'Final prediction lock (11 PM) - no more changes until dawn'
}
```

## User Refresh Behavior

### Before 6 PM
- **Effect**: Standard prediction update
- **Persistence**: Temporary (will change with weather updates)
- **Message**: Shows preliminary status

### 6 PM - 11:59 PM (KEY WINDOW)
- **Effect**: Locks prediction for next day's dawn patrol
- **User Action**: **Users should refresh during this window to set their prediction**
- **Persistence**: Locked until after dawn patrol (next day 8 AM)
- **Updates**: Can refresh multiple times to update locked prediction
- **Automatic Failsafe**: System auto-locks at 11 PM if user doesn't manually refresh

### After Midnight
- **Effect**: No changes - uses locked prediction
- **Behavior**: Refresh button disabled or shows cached data
- **Message**: Explains prediction is locked

## State Persistence

The `PredictionStateManager` ensures:
- Locked predictions survive app restarts
- State transitions occur automatically based on time
- Prediction consistency from evening through verification
- Automatic cleanup of old predictions (7+ days)

## Weather Data Integration

### Evening Refresh Service
- Automatically triggers at 6 PM daily
- Ensures fresh weather data for evening lock window
- Provides most accurate thermal cycle analysis

### Thermal Cycle Analysis
- **Before 6 PM**: Uses forecast data only
- **After 6 PM**: Enhanced with actual thermal observations
- **Historical Enhancement**: FREE Open-Meteo data when available

## Error Handling & Fallbacks

1. **Missing Lock**: If no evening lock exists, system auto-locks at 11 PM
2. **State Corruption**: Automatic state recovery on next refresh
3. **Weather Data Failure**: Uses cached data with degraded confidence
4. **Timing Issues**: Progressive state transitions handle edge cases

## UI Indicators

### Lock Status
- 🔒 **Locked**: Prediction is locked and won't change
- 🔄 **Refreshable**: User can update locked prediction (6-11 PM)
- ⏰ **Pending**: Will auto-lock at next checkpoint

### Data Quality
- ✅ **Complete Thermal Cycle**: After 6 PM with full day's data
- 📊 **Enhanced Historical**: When FREE actual observations available
- 🔮 **Preliminary**: Before 6 PM using forecast only

## Developer Implementation

### Key Files
- `services/predictionStateManager.ts` - Core lifecycle management
- `services/katabaticAnalyzer.ts` - Prediction engine with state integration
- `services/eveningWeatherRefreshService.ts` - Automatic 6 PM data refresh
- `hooks/useKatabaticAnalyzer.ts` - Time-aware analysis modes

### State Queries
```typescript
// Check current prediction state
const state = await predictionStateManager.getCurrentPredictionState(targetDate);

// Lock a prediction
await predictionStateManager.lockPrediction(date, prediction, 'evening');

// Check if should use locked prediction
const shouldUseLocked = await predictionStateManager.shouldUseLocked(targetDate);
```

## Summary: The 6 PM - 11:59 PM Window

**This is the critical window where users should refresh to lock in their prediction for the next day's dawn patrol.**

- **User action required**: Refresh the Wind Guru tab anytime between 6 PM - 11:59 PM
- **Effect**: Locks the prediction using the most current weather data
- **Flexibility**: Can refresh multiple times during this window to update the lock
- **Failsafe**: If user doesn't refresh, system auto-locks at 11 PM
- **Next change**: Locked prediction remains unchanged until after 8 AM the next day

This workflow ensures users get the most accurate prediction while maintaining consistency from evening planning through dawn execution.
