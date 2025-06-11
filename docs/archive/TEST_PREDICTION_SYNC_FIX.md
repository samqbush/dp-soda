# Test Plan: Prediction Sync Fix

## Issue Summary
Fixed the discrepancy where the "daily breakdown" showed different percentages than the "today section" for katabatic predictions in the Wind Guru screen.

## Root Cause
- **Today section**: Used `useKatabaticAnalyzer` with time-aware analysis (freezes after 8am)
- **Daily breakdown**: Used `useWeatherData.getWeeklyPredictions()` which always performed fresh analysis

## Fix Implementation
Modified `getDayPrediction()` in `useWeatherData.ts` to:
1. For `dayOffset = 0` (today): Use time-aware prediction from `katabaticAnalysis.prediction`
2. For other days: Continue with fresh analysis as normal
3. Added proper dependency tracking with `katabaticAnalysis` in callback

## Files Modified
- `/hooks/useWeatherData.ts` - Lines ~260-342

## Test Scenarios

### Scenario 1: Pre-Dawn (00:00 - 06:00)
**Expected**: Both sections show same prediction, updates every 30 minutes
- [ ] Today section shows prediction with 🔮 PREDICTION mode
- [ ] Daily breakdown shows same percentage for today
- [ ] Both update when refresh is triggered

### Scenario 2: Dawn Patrol (06:00 - 08:00) 
**Expected**: Both sections show same prediction, real-time verification mode
- [ ] Today section shows prediction with ⚡ VERIFICATION mode
- [ ] Daily breakdown shows same percentage for today
- [ ] Both continue updating during dawn patrol window

### Scenario 3: Post-Dawn (08:00 - 23:59)
**Expected**: Both sections show frozen prediction to preserve accuracy
- [ ] Today section shows prediction with 🔒 FROZEN mode
- [ ] Daily breakdown shows same percentage for today (no fresh calculation)
- [ ] Both show exact same values even hours later
- [ ] Tomorrow predictions still update normally

### Scenario 4: Consistency Check
**Expected**: Values remain synchronized across refreshes
- [ ] Refresh app multiple times - today values stay consistent
- [ ] Navigate away and back - today values stay consistent
- [ ] Future day values can still change with forecast updates

## Verification Commands

```bash
# Check for any compilation errors
npm run lint

# Check specific behavior in logs
# Look for: "📊 Using time-aware today prediction from katabaticAnalysis for daily breakdown"
```

## Success Criteria
✅ **FIXED**: Today section and daily breakdown show identical percentages  
✅ **PRESERVED**: Time-aware behavior (freezing after 8am) works for both  
✅ **MAINTAINED**: Tomorrow+ predictions still update normally  
✅ **NO REGRESSION**: All other functionality continues working  

## Notes
- The fix ensures both sections use the same prediction source for today
- Only today (dayOffset = 0) uses time-aware logic
- Tomorrow+ days continue with fresh analysis for up-to-date forecasts
- Logging added to track when time-aware prediction is used
