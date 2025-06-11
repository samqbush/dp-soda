# Wind Prediction Guide

Technical guide to understanding the katabatic wind prediction system used in Dawn Patrol Alarm.

## Table of Contents

1. [Katabatic Wind Theory](#katabatic-wind-theory)
2. [Prediction Methodology](#prediction-methodology)
3. [6-Factor MKI Analysis System](#6-factor-mki-analysis-system)
4. [Confidence Calculation](#confidence-calculation)
5. [Verification & Accuracy](#verification--accuracy)
6. [Advanced Understanding](#advanced-understanding)

## Katabatic Wind Theory

### What Are Katabatic Winds?

Katabatic winds are **gravity-driven downslope winds** that occur when:
1. **Radiational cooling** occurs on mountain slopes during clear nights
2. **Dense, cold air** flows downhill toward warmer valley floors  
3. **Consistent wind patterns** develop during dawn hours (6-8 AM)
4. **Optimal conditions** emerge for wind sports at locations like Soda Lake

### Mountain Wave-Katabatic Flow Interaction (MKI)

Recent atmospheric research has revealed that katabatic winds don't operate in isolation. They interact in complex, **nonlinear ways** with mountain-generated gravity waves, creating what scientists call **Mountain Wave-Katabatic Flow Interaction (MKI)**:

**Key MKI Principles:**
- **Dual Influence**: Mountain waves affect the atmospheric stability in which katabatic flows develop, while katabatic flows are simultaneously impacted by evolving gravity wave patterns
- **Pressure Variability**: Wave evolution aloft creates local variability in surface pressure gradients that govern katabatic flow strength
- **Multi-scale Effects**: Variability occurs on two time scales:
  - **Meso-β scale**: Hourly changes due to mountain wave system evolution
  - **Microscale**: Rapid fluctuations from wave breaking and short wavelength features
- **Altitude Coupling**: Perturbations in gravity wave structure at high altitudes can be transmitted down through the atmospheric column, affecting surface katabatic flow

This interaction explains much of the **observed variability** in katabatic wind strength and timing that makes prediction challenging.

### Why Soda Lake?

Soda Lake sits in an ideal position to receive katabatic flow:
- **Elevation**: 5,430 feet in Boulder Valley
- **Geography**: Positioned to receive downslope flow from surrounding mountains
- **Exposure**: Open water surface amplifies and channels wind patterns
- **Timing**: Dawn patrol window (6-8 AM) aligns with peak katabatic activity

## Prediction Methodology

### Enhanced Analysis Approach

The prediction system combines **meteorological modeling** with **local pattern recognition** and **mountain wave interaction analysis**:

1. **Synoptic Pattern Assessment** (Large-scale conditions)
   - Evaluate Froude number (Fr = U/NH) to determine mountain wave behavior
   - Fr ≈ 0.45 indicates optimal nonlinear gravity wave conditions
   - High-pressure systems with clear skies provide best foundation

2. **Overnight Analysis** (2:00 AM - 5:00 AM)
   - Peak radiational cooling period  
   - Establishes temperature and pressure gradients
   - Analyzes atmospheric stability structure for wave development
   - Determines potential for katabatic development

3. **Mountain Wave Analysis** (Continuous)
   - Assess upstream flow conditions and barriers
   - Evaluate wave amplitude and wavelength development
   - Predict wave breaking potential and turbulent mixing
   - Analyze pressure gradient modifications from wave patterns

4. **Dawn Patrol Forecast** (6:00 AM - 8:00 AM)
   - Projects katabatic strength into optimal window
   - Accounts for sunrise warming effects and wave-flow coupling
   - Integrates mountain wave influence on surface conditions
   - Provides probabilistic forecast accounting for MKI variability

5. **Real-time Verification** (during dawn patrol)
   - Compares predictions to actual conditions
   - Improves future accuracy through machine learning
   - Provides immediate feedback to users

### Advanced Prediction Factors

Beyond the basic 4-factor system, advanced prediction considers:

**Atmospheric Stability Profile**
- **Stable Layers**: Strong near-surface stability supports katabatic flow
- **Wave Propagation**: Mid-level stability affects mountain wave development
- **Coupling Efficiency**: How effectively high-altitude waves influence surface flow

**Pressure Gradient Dynamics**
- **Synoptic Gradients**: Large-scale pressure patterns
- **Mesoscale Modifications**: Mountain wave-induced pressure changes
- **Local Variations**: Microscale pressure fluctuations from wave breaking

**Timing Sensitivity**
- **Wave Phase**: Position of mountain wave peaks and troughs
- **Cooling Rates**: Speed of radiational temperature drop
- **Transition Periods**: How quickly conditions change during dawn

### Data Sources

- **Primary**: OpenWeatherMap API (real meteorological data)
- **Elevation Points**: Morrison (5,709 ft) and Nederland (8,236 ft)
- **Secondary**: Ecowitt Standley Lake monitoring station
- **Historical**: Pattern recognition from previous predictions

## 6-Factor MKI Analysis System

The evolution from the basic 4-factor system incorporates mountain wave interaction science:

### 1. Rain Factor ☔ (Enhanced)

**Purpose**: Precipitation disrupts both katabatic flow and mountain wave patterns
**Measurement**: Precipitation probability during dawn patrol window + overnight period
**Enhanced Scoring**:
- 0-5% chance → 100% factor score (Excellent)
- 6-10% chance → 75% factor score (Good)  
- 11-20% chance → 50% factor score (Fair)
- 21%+ chance → 0% factor score (Poor)

**MKI Consideration**: Precipitation indicates atmospheric instability that disrupts both the stable stratification needed for katabatic flow and the wave propagation patterns that enhance it.

### 2. Clear Sky Factor ☀️ (Enhanced)

**Purpose**: Clear skies enable both radiational cooling and mountain wave development
**Measurement**: Cloud cover percentage during overnight cooling (2-5 AM) + wave propagation windows
**Enhanced Scoring**:
- 80-100% clear → 100% factor score (Excellent)
- 70-79% clear → 75% factor score (Good)
- 60-69% clear → 50% factor score (Fair)  
- <60% clear → 0% factor score (Poor)

**MKI Consideration**: Clouds not only prevent radiational cooling but also indicate turbulent mixing that disrupts organized mountain wave patterns essential for enhancing katabatic flow.

### 3. Pressure Factor 📊 (Enhanced)

**Purpose**: Pressure gradients drive wind flow, enhanced by mountain wave dynamics
**Measurement**: Multi-scale pressure analysis including synoptic patterns and mesoscale wave effects
**Enhanced Scoring**:
- 3.0+ hPa change + organized wave pattern → 100% factor score (Excellent)
- 2.0-2.9 hPa change + moderate wave activity → 75% factor score (Good)
- 1.0-1.9 hPa change + weak wave signature → 50% factor score (Fair)
- <1.0 hPa change + no wave enhancement → 0% factor score (Poor)

**MKI Consideration**: Mountain waves create additional pressure gradients that can enhance or diminish surface pressure patterns driving katabatic flow.

### 4. Temperature Factor 🌡️ (Enhanced)

**Purpose**: Temperature gradients create density-driven flow, modified by wave-induced mixing
**Measurement**: Temperature difference between elevations + atmospheric stability assessment
**Enhanced Scoring**:
- 12.0+ °F difference + stable atmosphere → 100% factor score (Excellent)
- 9.0-11.9 °F difference + mostly stable → 75% factor score (Good)
- 6.0-8.9 °F difference + some mixing → 50% factor score (Fair)
- <6.0 °F difference + unstable conditions → 0% factor score (Poor)

**MKI Consideration**: Mountain wave breaking can create turbulent mixing that reduces temperature gradients, while organized wave flow can enhance temperature differential patterns.

### 5. **NEW** - Wave Pattern Factor 🌊

**Purpose**: Assess mountain wave enhancement or disruption of katabatic flow
**Measurement**: Froude number analysis, wave amplitude estimation, and flow coupling assessment
**Scoring**:
- Optimal Fr (0.4-0.6) + organized waves + surface coupling → 100% factor score (Excellent)
- Good Fr (0.3-0.7) + moderate waves + some coupling → 75% factor score (Good)
- Marginal Fr + weak waves + limited coupling → 50% factor score (Fair)
- Poor Fr + disorganized/breaking waves → 0% factor score (Poor)

**Why it matters**: Mountain waves can create organized pressure and flow patterns that significantly enhance katabatic winds when conditions align properly.

### 6. **NEW** - Atmospheric Stability Factor 🏔️

**Purpose**: Evaluate multi-layer atmospheric stability for optimal wave-katabatic coupling
**Measurement**: Stability profile from surface to mountain wave propagation levels
**Scoring**:
- Strong surface stability + optimal wave propagation aloft → 100% factor score (Excellent)  
- Good surface stability + moderate wave levels → 75% factor score (Good)
- Fair surface stability + some wave activity → 50% factor score (Fair)
- Poor stability structure + disrupted wave patterns → 0% factor score (Poor)

**Why it matters**: The vertical structure of atmospheric stability determines both katabatic development potential and mountain wave behavior, with optimal configurations enhancing both phenomena.

### Enhanced Factor Weighting System

The 6-factor MKI system uses scientifically-calibrated weightings based on atmospheric research:

```
Precipitation Factor:        25% (reduced from 30% - still critical)
Sky Conditions Factor:       20% (reduced from 25% - important but balanced)
Pressure Change Factor:      20% (reduced from 25% - balanced with wave effects)
Temperature Differential:    15% (reduced from 20% - significant but not dominant)
Wave Pattern Factor:         15% (NEW - substantial impact on enhancement)
Atmospheric Stability:        5% (NEW - fine-tuning factor for coupling)
```

**Weighting Rationale**:
- **Core factors reduced but remain dominant**: Basic meteorological factors still comprise 80% of prediction
- **Wave pattern significance**: 15% weight reflects substantial impact when conditions align
- **Stability as fine-tuning**: 5% weight provides precision without overcomplicating

### Enhanced Bonus System

The MKI system includes sophisticated bonuses that account for nonlinear interactions:

**Standard Bonuses**:
- **4+ factors favorable**: +20% bonus (recognizes multiple good conditions)
- **5+ factors favorable**: Additional +25% bonus (+45% total)
- **6 factors favorable**: Additional +10% bonus (+55% total)

**MKI-Specific Bonuses**:
- **Positive wave enhancement**: +10% bonus when overall confidence >70%
- **Optimal Froude number**: Additional enhancement when Fr = 0.4-0.6
- **Perfect atmospheric coupling**: Bonus for ideal stability profile alignment

**Why Bonuses Matter**: Research shows that katabatic-wave interactions are nonlinear - when multiple factors align, the enhancement effect is greater than the sum of individual factors.

## Enhanced Confidence Calculation

### Confidence Levels with MKI Integration

The system calculates prediction confidence based on multi-scale atmospheric analysis:

**High Confidence (80-100%)**
- All 6 factors have reliable data quality with strong correlations
- Mountain wave patterns clearly enhance katabatic potential
- Historical patterns strongly support prediction with MKI precedent
- Weather models show consistent forecasts across multiple scales
- Low uncertainty in critical meteorological conditions
- Optimal synoptic pattern (Fr ≈ 0.4-0.6) with organized wave structure

**Medium Confidence (50-79%)**  
- Most factors have good data quality with moderate correlations
- Some mountain wave enhancement or neutral wave impact
- Partial historical precedent for similar MKI conditions
- Weather models show moderate agreement across scales
- Some uncertainty in key variables but stable overall pattern
- Acceptable synoptic conditions with some wave organization

**Low Confidence (0-49%)**
- Limited or poor data quality for key factors
- Mountain waves likely disrupting katabatic development
- Unusual conditions with little historical MKI precedent  
- Weather models show disagreement, especially at different scales
- High uncertainty in critical variables
- Poor synoptic pattern or disorganized/breaking wave conditions

### Enhanced Data Quality Factors

- **Temporal Resolution**: More frequent data updates = higher confidence
- **Spatial Resolution**: Local weather station data = higher confidence  
- **Model Agreement**: Multiple weather models agreeing across scales = higher confidence
- **Historical Validation**: Similar past MKI conditions with known outcomes = higher confidence
- **Wave Pattern Consistency**: Organized, predictable mountain wave behavior = higher confidence
- **Stability Profile Quality**: Clear atmospheric layering structure = higher confidence

## Verification & Accuracy

### Real-time Verification

During dawn patrol hours (6-8 AM), the system:

1. **Compares predictions to actual conditions**
2. **Calculates accuracy percentages** for each factor
3. **Updates user interface** with verification results
4. **Stores results** for future model improvement

### Example Verification Display

```
Prediction: 73% (Good) - Medium Confidence
Actual Outcome: Favorable conditions observed
Accuracy: 89% - Prediction verified
```

### Learning System

The app uses verification data to:
- **Calibrate factor weights** for local conditions
- **Improve confidence calculations** over time
- **Identify pattern recognition** opportunities
- **Enhance user-specific preferences**

### Historical Accuracy

Users can view historical accuracy to understand:
- How reliable predictions are at different probability levels
- Which confidence levels work best for their risk tolerance
- Seasonal and weather pattern variations in accuracy
- Personal calibration for their specific activities

## Advanced Understanding

### Microclimate Considerations with MKI

While the app provides excellent general guidance, **Mountain Wave-Katabatic Interaction** creates additional local factors:

**Wave-Enhanced Thermal Effects**
- Organized mountain waves can enhance or disrupt sunrise heating effects
- Wave-induced pressure patterns create localized temperature variations
- Surface temperature contrasts can be amplified by wave focusing
- Local topographical channeling interacts with wave flow structures

**Complex Wind Interactions**  
- Synoptic winds interact nonlinearly with both katabatic flow and mountain waves
- Wave patterns can create rapid changes in wind direction and strength
- **Microscale fluctuations**: Wave breaking creates sudden wind speed variations
- **Mesoscale patterns**: Hourly evolution of wave systems affects sustained flow

**MKI Timing Effects**
- Mountain wave phase can advance or delay katabatic onset
- Wave breaking events can temporarily disrupt established katabatic flow  
- Optimal conditions occur when wave patterns and katabatic timing align
- Dawn transition timing becomes more variable due to wave interactions

**Pressure Pattern Complexity**
- Surface pressure gradients modified by wave-induced variations  
- **Multi-scale pressure effects**: Both large wave patterns and small turbulent eddies
- Local pressure minimums and maximums created by wave topography interaction
- Rapid pressure fluctuations during active wave periods

### Seasonal Variations

**Spring (March-May)**
- Stronger temperature gradients
- More variable weather patterns  
- Higher prediction confidence

**Summer (June-August)**
- Weaker overnight cooling
- More stable conditions
- Moderate prediction confidence

**Fall (September-November)**  
- Excellent radiational cooling
- Stable high-pressure systems
- Highest prediction confidence

**Winter (December-February)**
- Snow effects and ice conditions
- Extreme temperature gradients
- Variable prediction confidence

### Activity-Specific Interpretation

**Kiteboarding**
- Requires sustained winds >12 mph
- Benefits from consistent direction
- Marginal predictions (25-49%) often insufficient

**Windsurfing**
- Effective with lighter winds 8-15 mph
- More tolerant of direction changes
- Good predictions (50-74%) often sufficient

**Wing Foiling**
- Effective in very light winds 6-12 mph  
- Most tolerant of variable conditions
- Even marginal predictions (25-49%) can be worthwhile

### Advanced Planning Strategies with MKI

**Multi-day Forecasting with Wave Patterns**
- Tomorrow's predictions available with mountain wave trend analysis
- Accuracy improves throughout the day as wave patterns become clearer
- **Plan backup dates** when confidence is low due to uncertain wave conditions
- **Monitor wave evolution**: Conditions can improve or deteriorate based on upstream changes

**Enhanced Pattern Recognition**
- Learn personal thresholds for different MKI conditions
- Understand how wave patterns affect your specific activities
- **Develop intuition** for when wave enhancement might overcome marginal basic conditions
- **Recognize disruption patterns**: When good basic conditions might be spoiled by wave breaking

**MKI-Aware Risk Management**  
- Always have backup plans for marginal conditions, especially during active wave periods
- Consider safety factors beyond just wind prediction (wave-induced turbulence)
- **Understand complexity**: MKI conditions can change rapidly and unpredictably
- **Monitor real-time conditions**: Wave effects can create sudden changes during sessions

**Activity-Specific MKI Interpretation**

**Kiteboarding with MKI**
- Benefits most from organized wave enhancement of steady katabatic flow
- **Avoid periods of wave breaking**: Can create dangerous gustiness and turbulence
- **Best during stable wave patterns**: Consistent enhancement over time periods

**Windsurfing with MKI**
- More tolerant of wave-induced variability than kiteboarding
- **Can benefit from wave focusing**: Localized areas of enhanced flow
- **Moderate wave activity**: Often still provides good conditions

**Wing Foiling with MKI**
- Most adaptable to wave-induced flow changes
- **Can exploit wave pattern variations**: Different wind windows throughout session
- **Early warning advantage**: Can launch during wave-enhanced periods even if basic conditions are marginal

This advanced understanding enables you to make more sophisticated decisions about when MKI conditions might create opportunities that basic predictions miss, or when apparent good conditions might be disrupted by unfavorable wave interactions.

This technical guide provides the foundation for understanding how Dawn Patrol Alarm's predictions work, enabling you to make the most informed decisions possible for your wind sport activities.
