# User Guide

Complete guide for using the Dawn Patrol Alarm application to make informed wind sport decisions at Soda Lake, Colorado.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding the Interface](#understanding-the-interface)
3. [Wind Prediction System](#wind-prediction-system)
4. [Standley Lake Monitoring](#standley-lake-monitoring)
5. [Tips for Success](#tips-for-success)

## Quick Start

### What is Dawn Patrol?
Dawn patrol refers to the optimal wind conditions that occur during early morning hours (6-8 AM) when katabatic winds flow down from the mountains, creating consistent conditions perfect for wind sports.

### Using the App

1. **Open the app** - Launches with current conditions
2. **Check Wind Guru tab** - See today's verification and tomorrow's prediction
3. **Review the probability** - 75-100% = GO, 50-74% = Likely good, 25-49% = Marginal, 0-24% = Stay home
4. **Check confidence level** - High/Medium/Low reliability indicator
5. **Plan accordingly** - App updates every 30 minutes

### Reading Your Prediction

**Probability Scale:**
- **75-100%** 🟢 **Excellent** - GO! Ideal conditions expected
- **50-74%** 🟡 **Good** - Likely favorable conditions  
- **25-49%** 🟠 **Marginal** - Mixed conditions, use judgment
- **0-24%** 🔴 **Poor** - Not recommended

**Confidence Levels:**
- **High** 🟢 Very reliable prediction
- **Medium** 🟡 Fairly reliable prediction  
- **Low** 🔴 Less reliable, proceed with caution

## Understanding the Interface

### Main Tabs

**Wind Guru Tab** - Primary prediction interface
- Today's verification with real-time accuracy
- Tomorrow's forecast for advance planning
- 4-factor analysis breakdown
- Historical accuracy tracking

**Other Tabs** - Additional features and testing interfaces

### Data Freshness Indicators

- **Green**: Fresh data (updated within 30 minutes)
- **Yellow**: Slightly stale data (30-60 minutes)
- **Red**: Old data (over 1 hour) - manual refresh recommended

## Wind Prediction System

### 4-Factor Analysis

The app analyzes four key meteorological factors:

#### 1. Rain Factor ☔
- **Good**: <20% precipitation chance during dawn patrol
- **Poor**: >20% chance of rain/snow
- **Why it matters**: Precipitation disrupts katabatic flow patterns

#### 2. Clear Sky Factor ☀️
- **Good**: >70% clear sky coverage during overnight cooling (2-5 AM)
- **Poor**: <70% cloud cover
- **Why it matters**: Clear skies enable radiational cooling necessary for katabatic winds

#### 3. Pressure Factor 📊
- **Good**: >2.0 hPa pressure change during overnight period
- **Poor**: <2.0 hPa pressure stability
- **Why it matters**: Pressure gradients drive wind flow from mountains to valley

#### 4. Temperature Factor 🌡️
- **Good**: >9.0°F temperature difference between Morrison (5,709 ft) and Nederland (8,236 ft)
- **Poor**: <9.0°F temperature difference
- **Why it matters**: Temperature gradients create the density differences that drive katabatic flow

### Prediction Timing

**Analysis Period**: 2:00 AM - 5:00 AM (overnight cooling)
**Dawn Patrol Window**: 6:00 AM - 8:00 AM (optimal katabatic time)
**Update Frequency**: Every 30 minutes for current conditions

### Today vs Tomorrow

#### Today's Prediction
- **Real-time verification** during 6-8 AM window
- **Accuracy tracking** for model improvement
- **Learn patterns** specific to Soda Lake conditions

#### Tomorrow's Prediction  
- **Immediate availability** - see forecast right now
- **Preliminary analysis** improves after 6 PM
- **Planning advantage** for dawn patrol logistics

## Standley Lake Monitoring

In addition to Soda Lake predictions, the app includes **Standley Lake monitoring** via Ecowitt weather station integration.

### Features
- Real-time wind speed and direction
- Historical trend analysis
- Complementary data source for Front Range conditions

### Setup Required
Requires Ecowitt API credentials - see [API Integration Guide](api-integration.md) for setup instructions.

## Tips for Success

### Maximizing Accuracy

1. **Check confidence levels** - Higher confidence = more reliable
2. **Consider local conditions** - App provides general guidance, but local factors matter
3. **Track patterns** - Learn what works best for your specific activities
4. **Use historical data** - App shows accuracy verification to improve future decisions

### Best Practices

1. **Check the night before** - Plan your dawn patrol in advance
2. **Verify morning of** - Conditions can change, especially with low confidence predictions
3. **Have backup plans** - Marginal predictions (25-49%) can go either way
4. **Learn your preferences** - Different activities have different wind requirements

### Common Scenarios

**Excellent Conditions (75-100%)**
- All 4 factors favorable
- High confidence level
- Ideal for beginners and advanced users alike

**Good Conditions (50-74%)**  
- Most factors favorable
- Medium-High confidence
- Good for experienced users, beginners should check conditions

**Marginal Conditions (25-49%)**
- Mixed factors
- Variable confidence
- Experienced users only, have backup plans

**Poor Conditions (0-24%)**
- Few favorable factors
- Any confidence level
- Recommended to stay home or find alternative activities

### Understanding Verification

During and after dawn patrol hours (6-8 AM), the app shows **verification data**:
- How accurate was the prediction?
- What actual conditions occurred?
- Pattern recognition for future predictions

This helps you calibrate your personal thresholds and understand what prediction levels work best for your activities.

## Troubleshooting

**App not updating?**
- Pull down to refresh manually
- Check internet connection
- Restart app if needed

**Predictions seem inaccurate?**
- Check confidence level (Low confidence = less reliable)
- Consider local microclimate factors
- Review verification data to understand patterns

**Missing tomorrow's prediction?**
- Ensure internet connectivity
- Predictions improve after 6 PM daily
- Try manual refresh

For technical issues, see the [Troubleshooting Guide](troubleshooting.md).
