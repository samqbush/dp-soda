# Katabatic Algorithm Improvement Plan

## Current Issue Analysis
- **Real-world result**: Actual katabatic winds occurred during 6-8am dawn patrol
- **Algorithm prediction**: Only 60% probability
- **Problem**: Algorithm is too conservative and missing successful conditions

## Proposed Improvements

### 1. Threshold Adjustments
**Current → Improved**
- Sky conditions: 70% clear → 60% clear (more realistic for mountain weather)
- Pressure change: 2.0 hPa → 1.5 hPa (many successful days have smaller changes)
- Temperature differential: 5.0°C → 4.0°C (slightly more sensitive)

### 2. Penalty System Revision
**Current Penalties → Improved Penalties**
- Sky conditions: -30 → -20 (less harsh)
- Pressure change: -40 → -25 (less harsh)
- Precipitation: -50 → -40 (slightly less harsh)
- Temperature: -20 → -15 (minimal change)

### 3. Adaptive Weighting
**Current → Improved**
- Add bonus multipliers when 3+ factors are good
- Reduce penalty impact when other factors compensate
- Consider factor confidence levels more dynamically

### 4. Success Pattern Learning
- Track actual vs predicted outcomes
- Adjust thresholds based on real-world feedback
- Build local calibration for Soda Lake conditions

## Implementation Strategy
1. Create calibrated algorithm version
2. Add configuration options for easy adjustment
3. Implement feedback tracking system
4. Test with historical successful days

## Expected Results
- Increase accuracy for borderline good conditions
- Reduce false negatives (missed good days)
- Maintain low false positives (bad predictions for poor conditions)
- Target: 75-85% prediction for actual good conditions
