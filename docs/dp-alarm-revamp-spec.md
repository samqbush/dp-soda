# DP Alarm Tab Revamp Specification

**Document Version:** 1.0  
**Date:** June 10, 2025  
**Status:** Implementation Ready

## Overview

Transform the current "DP Wind Alert" tab from a complex wind monitoring interface into a simplified alarm-only interface that uses Ecowitt historical data for alarm decisions.

## Current State Analysis

### Existing Tab Structure
- **Landing Page**: DP Wind Alert (`app/(tabs)/index.tsx`)
- **Tab Order**: DP Wind Alert → Soda Lake → Standley Lake → Wind Guru → Settings
- **Data Source**: WindAlert API via `useWindData` hook
- **Complexity**: Full wind analysis, verification windows, trend charts

### Current DP Wind Alert Features
- Real-time wind data fetching from WindAlert API
- Complex wind analysis (speed, direction, consistency)
- 6am-8am verification window
- Wind speed trend graphs and charts
- Manual refresh functionality
- `WindDataDisplay` component with full analytics

## Target State

### New Tab Structure
- **Landing Page**: Soda Lake (`app/(tabs)/soda-lake.tsx`)
- **Tab Order**: Soda Lake → DP Alarm → Standley Lake → Wind Guru → Settings
- **Data Source**: Ecowitt API via `useStandleyLakeWind` hook
- **Complexity**: Simple speed threshold checking only

### New DP Alarm Features
- Simplified alarm status display
- Basic wind conditions summary from Ecowitt
- Alarm control panel (existing component)
- No complex analysis or charts
- Trust Ecowitt wind direction data

## Detailed Requirements

### 1. Navigation & Tab Changes

#### Tab Layout Updates (`app/(tabs)/_layout.tsx`)
- **Change landing route**: Move Soda Lake to index position
- **Rename tab**: "DP Wind Alert Alarm" → "DP Alarm"
- **Update tab order**: Soda Lake first, DP Alarm second

#### Route Structure Changes
- **Current**: `index.tsx` = DP Wind Alert (landing)
- **Target**: `index.tsx` = Soda Lake (landing), `dp-alarm.tsx` = DP Alarm

### 2. DP Alarm Page Simplification

#### Remove Complex Components
- **Remove**: `WindDataDisplay` component entirely
- **Remove**: Wind trend charts and graphs
- **Remove**: Real-time data refresh functionality
- **Remove**: 6am-8am verification logic
- **Remove**: Manual refresh buttons and pull-to-refresh

#### New Simple Interface
```
┌─────────────────────────────┐
│   Dawn Patrol Alarm         │
├─────────────────────────────┤
│                             │
│     Wake Up! 🌊             │
│       or                    │
│     Sleep In 😴             │
│                             │
├─────────────────────────────┤
│  Current: 12 mph NW         │
│  Threshold: 10 mph          │
│  Last Check: 5:23 AM        │
├─────────────────────────────┤
│   [Alarm Control Panel]     │
│                             │
│  🔔 Alarm: ON | 5:00 AM     │
│  [Test] [Settings]          │
└─────────────────────────────┘
```

### 3. Data Flow Changes

#### Current Data Flow
```
DP Tab → useWindData → WindAlert API → Complex Analysis → 6am-8am Verification → Alarm Decision
```

#### New Data Flow
```
DP Tab → useDPAlarm → useStandleyLakeWind → Ecowitt API → Simple Speed Check → Alarm Decision
```

### 4. Alarm Logic Simplification

#### Current Criteria (Complex)
```typescript
interface AlarmCriteria {
  minimumAverageSpeed: number;
  directionConsistencyThreshold: number;
  minimumConsecutivePoints: number;
  directionDeviationThreshold: number;
  preferredDirection: number;
  preferredDirectionRange: number;
  useWindDirection: boolean;
  alarmEnabled: boolean;
  alarmTime: string;
}
```

#### New Criteria (Simplified)
```typescript
interface SimplifiedAlarmCriteria {
  minimumAverageSpeed: number;
  alarmEnabled: boolean;
  alarmTime: string;
}
```

#### New Alarm Decision Logic
1. **Fetch Latest Ecowitt Data**: Get most recent wind readings
2. **Calculate Average Speed**: Simple average over recent data points
3. **Apply Threshold**: Trigger if average >= minimumAverageSpeed
4. **Trust Direction**: No direction analysis (trust Ecowitt quality)

### 5. Settings Simplification

#### Remove from Settings
- Direction consistency threshold
- Minimum consecutive points
- Direction deviation threshold
- Preferred direction settings
- Wind direction usage toggle

#### Keep in Settings
- Minimum average speed slider
- Alarm enabled toggle
- Alarm time picker
- Test alarm functions

## Implementation Plan

### Phase 1: Tab Structure & Navigation (30 min)
**Goal**: Update routing and tab structure

**Files to Modify**:
- `app/(tabs)/_layout.tsx` - Update tab order and names
- Create `app/(tabs)/dp-alarm.tsx` - New simplified alarm page
- Update `app/(tabs)/index.tsx` - Move to Soda Lake redirect or copy

**Tasks**:
1. Rename "DP Wind Alert Alarm" to "DP Alarm" in tab layout
2. Create new `dp-alarm.tsx` file with basic structure
3. Update index route to redirect to soda-lake or copy soda-lake content
4. Test tab navigation works correctly

### Phase 2: Create New Data Hook (45 min)
**Goal**: Build simplified data layer

**Files to Create**:
- `hooks/useDPAlarm.ts` - New simplified alarm logic hook

**Files to Modify**:
- `services/windService.ts` - Add simplified criteria interface

**Tasks**:
1. Create `useDPAlarm` hook that uses `useStandleyLakeWind`
2. Implement simple speed threshold checking
3. Add interface for simplified alarm criteria
4. Test hook returns correct alarm decisions

### Phase 3: Implement Simplified DP Alarm Page (1 hour)
**Goal**: Build new simplified UI

**Files to Modify**:
- `app/(tabs)/dp-alarm.tsx` - Complete implementation

**Tasks**:
1. Create large alarm status display
2. Show basic current conditions summary
3. Integrate existing `AlarmControlPanel` component
4. Add last check timestamp
5. Remove all chart and complex analysis components
6. Style for clean, minimal appearance

### Phase 4: Update Settings (30 min)
**Goal**: Simplify alarm configuration

**Files to Modify**:
- `app/(tabs)/settings.tsx` - Remove complex wind settings

**Tasks**:
1. Remove direction-related settings
2. Remove consecutive points settings
3. Keep only minimum wind speed setting
4. Update settings to work with simplified criteria
5. Test settings save/load correctly

### Phase 5: Service Layer Updates (30 min)
**Goal**: Clean up backend logic

**Files to Modify**:
- `services/unifiedAlarmManager.ts` - Update alarm logic
- `services/windService.ts` - Clean up unused functions

**Tasks**:
1. Update unified alarm manager to use Ecowitt data
2. Simplify alarm triggering logic
3. Remove unused WindAlert integration code
4. Update alarm criteria storage/retrieval

### Phase 6: Testing & Cleanup (30 min)
**Goal**: Verify functionality and clean up

**Tasks**:
1. Test alarm functionality end-to-end
2. Verify background notifications still work
3. Test settings changes apply correctly
4. Remove unused code and imports
5. Update any remaining references to old system

## Risk Mitigation

### Backup Strategy
- Keep existing `WindDataDisplay` component as backup
- Comment out old logic before removing
- Maintain old hooks until new system is verified

### Testing Strategy
- Test each phase before proceeding to next
- Verify alarm audio still works
- Test background notification functionality
- Validate settings persistence

### Rollback Plan
- Revert tab structure changes if needed
- Restore original index.tsx content
- Re-enable complex wind analysis if required

## Success Criteria

### Functional Requirements
- ✅ Soda Lake is the landing page
- ✅ DP Alarm tab shows simple alarm status
- ✅ Alarm triggers based on Ecowitt wind speed threshold only
- ✅ Settings show only minimum wind speed option
- ✅ No wind charts or complex analysis in DP tab
- ✅ Background alarms continue to work correctly
- ✅ All existing alarm features (test, schedule, etc.) still work

### Non-Functional Requirements
- ✅ App startup time not negatively impacted
- ✅ Memory usage reduced (fewer components)
- ✅ No breaking changes to other tabs
- ✅ User settings migrate cleanly

## Migration Notes

### Data Migration
- Existing alarm criteria settings will need migration
- Only `minimumAverageSpeed`, `alarmEnabled`, and `alarmTime` will be preserved
- Complex direction settings will be ignored but not deleted (in case of rollback)

### User Impact
- Users will see simplified interface immediately
- Alarm behavior may change slightly (no direction checking)
- Overall user experience should be simpler and more reliable

## Future Considerations

### Potential Enhancements
- Add basic wind direction display (non-filtering)
- Include simple wind trend indicator
- Add customizable threshold presets
- Consider bringing back optional direction filtering

### Integration Points
- Ensure compatibility with future Ecowitt device additions
- Maintain integration with unified alarm system
- Keep settings structure extensible for future features

---

**Next Steps**: Begin Phase 1 implementation with tab structure updates.
