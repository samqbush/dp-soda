# Katabatic Wind Prediction Analysis System

A comprehensive katabatic wind prediction analysis system that uses the actual TypeScript services from the Dawn Patrol Alarm app to track and analyze prediction accuracy over time.

## 🎯 Purpose

This system allows you to:
- **Evening Predictions**: Generate katabatic wind predictions using real app logic
- **Morning Verification**: Compare predictions against actual conditions  
- **Trend Analysis**: Track prediction accuracy over time with beautiful dashboards
- **Algorithm Refinement**: Use real data to improve the 5-factor katabatic algorithm

## 📁 Structure

```
katabatic-analysis/                    # Self-contained analysis system
├── scripts/                           # Analysis scripts
│   ├── predict-katabatic.ts          # Evening prediction generator
│   ├── verify-katabatic.ts           # Morning verification checker
│   ├── analyze-katabatic-trends.mjs  # Dashboard generator
│   └── tsconfig.json                 # TypeScript configuration
├── services/                          # Node.js-compatible services
│   ├── hybridWeatherService-node.ts  # Real weather service logic
│   └── katabaticAnalyzer-node.ts     # Real 5-factor algorithm
├── data/                              # Generated data (gitignored)
│   ├── predictions/                   # Daily prediction files
│   ├── verifications/                 # Verification results
│   └── reports/                       # Analysis reports
├── assets/                            # Dashboard assets
├── dashboard.html                     # Interactive analysis dashboard
└── README.md                          # This file
```

## 🚀 Quick Start

### 1. Generate Evening Prediction
```bash
npm run katabatic:predict
```
- Fetches real weather data from NOAA + OpenWeather APIs
- Runs identical 5-factor algorithm as the mobile app
- Generates prediction for next day's dawn patrol window (6-8 AM)
- Saves prediction data to `data/predictions/`

### 2. Verify Morning Results  
```bash
npm run katabatic:verify
```
- Fetches actual weather conditions from the prediction day
- Compares predicted vs actual conditions
- Calculates accuracy metrics
- Saves verification data to `data/verifications/`

### 3. Generate Analysis Dashboard
```bash
npm run katabatic:analyze
```
- Creates beautiful HTML dashboard with charts and insights
- Shows prediction accuracy trends over time
- Identifies which factors perform best/worst
- Opens interactive dashboard in browser

## 🔬 Real TypeScript Services

This system uses **identical logic** to your mobile app:

### `services/hybridWeatherService-node.ts`
- Same weather API integration as `services/hybridWeatherService.ts`
- Real NOAA National Weather Service API calls
- Real OpenWeather API integration (when subscription active)
- Same data processing and error handling

### `services/katabaticAnalyzer-node.ts`  
- Same 5-factor algorithm as `services/katabaticAnalyzer.ts`
- Identical probability calculations
- Same confidence scoring
- Same recommendation logic (GO/MARGINAL/SKIP)

**Algorithm Synchronization**: Any improvements to your main app algorithm can be reflected in both versions to keep analysis in sync.

## 📊 5-Factor Analysis

The system analyzes these factors (same as mobile app):

1. **☔ Precipitation** - Low precipitation favors katabatic flow
2. **☀️ Sky Conditions** - Clear skies enable radiational cooling  
3. **📊 Pressure Change** - Stable pressure supports katabatic flow
4. **🌡️ Temperature Differential** - Large gradients drive stronger flows
5. **🌊 Wave Pattern** - Mountain wave enhancement effects

## 🎨 Beautiful Console Output

The prediction script generates beautiful terminal output with:
- **Colored status indicators** (✅ ❌)
- **Formatted data tables** showing factor analysis
- **ASCII charts** displaying probability trends
- **Time-based recommendations** for optimal windows
- **Confidence scores** for each factor

## 📈 Example Prediction Output

```
🌬️  KATABATIC WIND PREDICTION SYSTEM
    Using Real App TypeScript Services
================================================================================

📅 Prediction for: Friday, June 13, 2025
⏰ Dawn Patrol Window: 6:00 AM - 8:00 AM
🕐 Generated: 6/12/2025, 8:01:45 AM

🔮 PREDICTION SUMMARY
   Probability: 33%
   Confidence: 71%
   Recommendation: SKIP
   Explanation: 1/5 factors favorable (33% probability). Unfavorable conditions...

📊 5-FACTOR ANALYSIS (REAL APP ALGORITHM)
┌────────────────────┬────────┬────────────────────┬────────────┬──────────────┐
│ Factor             │ Status │ Value              │ Confidence │ Details      │
├────────────────────┼────────┼────────────────────┼────────────┼──────────────┤
│ ☔ Precipitation   │ ✅ PASS│ 1.0% (≤25%)        │ 85%        │ Low precip...│
│ ☀️ Sky Conditions  │ ❌ FAIL│ 0% clear (≥70%)    │ 40%        │ Clouds block │
│ 📊 Pressure Change │ ❌ FAIL│ 0.0 hPa (stable)   │ 85%        │ Weak gradient│
│ 🌡️ Temperature Di… │ ❌ FAIL│ 4.0°F (≥8°F)       │ 80%        │ Weak temp    │
│ 🌊 Wave Pattern    │ ❌ FAIL│ 36/100 (none)      │ 65%        │ No enhancement│
└────────────────────┴────────┴────────────────────┴────────────┴──────────────┘

📊 PROBABILITY TREND CHART
==================================================
      38.00 ┼   ╭╮╭╮                 
      34.37 ┤ ╭─╯╰╯│                 
      30.75 ┤ │    ╰─╮               
      27.12 ┤╭╯      │            ╭─ 
      23.49 ┤│       │            │  
      19.86 ┼╯       ╰╮    ╭╮ ╭╮  │  
Hours: 0=midnight, 6=dawn, 12=noon, 18=evening
Peak katabatic window: 2-8am
```

## 🔧 Maintenance & Cleanup

### Keeping Algorithm in Sync
When you update the katabatic algorithm in your main app:
1. Update `/services/katabaticAnalyzer.ts` (your mobile app)
2. Sync the same changes to `/katabatic-analysis/services/katabaticAnalyzer-node.ts`
3. Test with `npm run katabatic:predict` to verify

### Data Privacy
- All prediction data is kept private (added to `.gitignore`)
- Data stays on your local machine
- No sensitive location/weather data is committed to git

### Cleanup
To remove the entire analysis system:
```bash
rm -rf katabatic-analysis/
```
Everything is self-contained in this folder.

## 🛠️ Technical Details

### Dependencies
- **tsx**: TypeScript execution in Node.js
- **chalk**: Terminal colors and styling  
- **cli-table3**: Beautiful terminal tables
- **asciichart**: ASCII chart generation
- **dotenv**: Environment variable loading

### API Integration
- **NOAA National Weather Service**: Free, no API key required
- **OpenWeather**: Requires subscription for One Call 3.0 API
- **Graceful Degradation**: Works with NOAA data if OpenWeather unavailable

### Data Format
Predictions and verifications are saved as JSON files with standardized schema for easy analysis and dashboard generation.

---

## 🎯 This System is Production-Ready!

✅ **Complete end-to-end workflow**  
✅ **Real TypeScript services from your app**  
✅ **Beautiful console output and dashboards**  
✅ **Self-contained and easy to maintain**  
✅ **Privacy-focused (local data only)**  
✅ **Algorithm synchronization with main app**

Run your first prediction tonight and start tracking your katabatic algorithm's performance!
