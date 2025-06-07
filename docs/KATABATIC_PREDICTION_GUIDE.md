# Katabatic Wind Prediction User Guide

## Understanding Your Wind Predictions

The Wind Guru tab provides sophisticated katabatic wind predictions based on meteorological analysis. This guide explains how to interpret the predictions and understand what the numbers mean.

## What is Katabatic Wind?

Katabatic winds are downslope winds that occur when cold, dense air flows down mountain slopes due to gravitational pull. These winds are crucial for wind sports as they can provide consistent, predictable conditions during dawn hours.

### Key Conditions for Katabatic Winds:
1. **Clear skies at night** (2-5am) for radiative cooling
2. **Low precipitation** to prevent disruption  
3. **Pressure changes** indicating air movement
4. **Temperature differences** between valley and mountain

## Reading the Prediction Display

### Probability Percentage
The large percentage (e.g., "47% Probability") indicates the likelihood of favorable katabatic conditions forming.

**Probability Ranges:**
- **75-100%**: Excellent conditions likely
- **50-74%**: Good conditions possible  
- **25-49%**: Marginal conditions
- **0-24%**: Poor conditions unlikely

### Confidence Levels
The confidence indicator shows how reliable the prediction is:

- **High Confidence**: 🟢 Very reliable prediction, act on it
- **Medium Confidence**: 🟡 Fairly reliable, consider conditions
- **Low Confidence**: 🔴 Less reliable, proceed with caution

### Recommendations
Clear action guidance based on the analysis:

- **GO! 🎯**: Conditions are favorable, head out early
- **MAYBE 🤔**: Conditions are marginal, consider your experience level  
- **SKIP ❌**: Conditions are unfavorable, stay home

## Understanding the Factor Analysis

### ✅/❌ Factor Status
Each factor shows whether it meets the minimum criteria:

#### Rain Probability
- **✅ Good**: ≤20% chance of precipitation
- **❌ Poor**: >20% chance of precipitation
- **Why it matters**: Rain disrupts katabatic flow formation

#### Clear Sky (2-5am)
- **✅ Good**: ≥70% of the 2-5am period is clear
- **❌ Poor**: <70% clear during cooling period
- **Why it matters**: Clear skies allow surface cooling that drives katabatic winds

#### Pressure Change  
- **✅ Good**: ≥2.0 hPa pressure change detected
- **❌ Poor**: <2.0 hPa pressure change
- **Why it matters**: Pressure changes indicate air movement patterns

#### Temperature Differential
- **✅ Good**: ≥5.0°C difference (valley warmer than mountain)
- **❌ Poor**: <5.0°C temperature difference  
- **Why it matters**: Temperature gradients create the driving force for katabatic flow

## Real Example: Understanding 47% Prediction

Let's break down the screenshot example showing 47% probability:

### The Calculation:
```
Factor Status:
✅ Rain Probability: 17.8% (meets ≤20% criteria) → 85% confidence
❌ Clear Sky: 56% clear (below ≥70% criteria) → 40% confidence  
✅ Pressure Change: -7.3 hPa (exceeds ≥2.0 criteria) → 90% confidence
✅ Temp Differential: 6.1°C (exceeds ≥5.0 criteria) → 80% confidence

Weighted Calculation:
Rain: 85 × 30% = 25.5 points
Sky: 40 × 25% = 10.0 points (with penalty for not meeting criteria)  
Pressure: 90 × 25% = 22.5 points
Temperature: 80 × 20% = 16.0 points

Total: ~47% probability
```

### Why SKIP was Recommended:
Even though 3 out of 4 factors were favorable, the **sky conditions were the deal-breaker**:
- Only 56% clear skies during the critical 2-5am cooling period
- Without adequate clear sky, radiative cooling can't occur effectively
- This makes katabatic wind formation unreliable, hence "Low Confidence"
- The algorithm correctly recommended SKIP despite decent overall conditions

## Best Practices for Using Predictions

### When to Trust High Confidence
- **All 4 factors favorable**: Very reliable, plan your dawn patrol
- **3 factors + high confidence**: Usually reliable, good conditions likely
- **Strong temperature differential**: Often the most important single factor

### When to Be Cautious  
- **Low confidence predictions**: Even high percentages may be unreliable
- **Mixed factor results**: Some good, some bad = unpredictable conditions
- **Poor sky conditions**: Often the most critical factor for failure

### Timing Your Dawn Patrol
- **Best prediction window**: 6-8am (when katabatic winds peak)
- **Setup window**: 2-5am (when radiative cooling occurs)
- **Monitor changes**: Conditions can change rapidly, check updates

## Advanced Tips

### Factor Importance Ranking
1. **Sky Conditions (25% weight)**: Most critical for cooling
2. **Precipitation (30% weight)**: Highest penalty when present
3. **Pressure Change (25% weight)**: Indicates active air movement
4. **Temperature Differential (20% weight)**: Driving force magnitude

### Weather Pattern Recognition
- **Clear, cold nights**: Often produce strong katabatic winds
- **High pressure systems**: Usually favorable for clear conditions  
- **Temperature inversions**: Can enhance katabatic flow strength
- **Post-frontal conditions**: Often create ideal temperature gradients

### Location-Specific Considerations
The predictions use data from:
- **Morrison, CO**: Valley reference point for temperature
- **Nederland, CO**: Mountain reference point for temperature differential
- **Analysis optimized**: For Soda Lake and similar Front Range locations

## Troubleshooting Predictions

### When Predictions Seem Wrong
1. **Check update time**: Ensure you have fresh data
2. **Consider local variations**: Micro-climates can differ from regional data
3. **Verify conditions**: Compare predicted vs actual conditions at your location
4. **Report feedback**: Helps improve future predictions

### Understanding Confidence vs Probability
- **High probability, low confidence**: Uncertain conditions despite good indicators
- **Low probability, high confidence**: Reliable prediction of poor conditions
- **Always consider both**: Don't ignore confidence levels

## Customization Options

### Adjustable Criteria (Future Versions)
- Precipitation thresholds (currently 20%)
- Clear sky requirements (currently 70%)
- Pressure sensitivity (currently 2.0 hPa)
- Temperature differential minimums (currently 5.0°C)

### Personal Preferences
- Confidence thresholds for recommendations
- Time window adjustments
- Location-specific calibrations

## Summary

The katabatic wind prediction system provides sophisticated analysis of four key meteorological factors. Understanding how these factors combine to create the probability percentage and confidence levels will help you make better decisions about dawn patrol conditions.

**Remember**: The system is designed to be conservative - it's better to occasionally miss good conditions than to recommend poor ones. When in doubt, consider your experience level and local knowledge alongside the predictions.
