# Katabatic Analysis Alignment Instructions

applyTo: "**/*katabatic*.ts", "app/(tabs)/wind-guru.tsx"

## CRITICAL: Katabatic Analysis Synchronization

**These files must stay synchronized for prediction logic consistency.**

### When modifying ANY katabatic analysis logic:

1. **Confidence Calculation**: Any changes to confidence formula must be applied to ALL analyzers:
   - `app/(tabs)/wind-guru.tsx` - UI display logic
   - `services/katabaticAnalyzer.ts` - Main app service
   - `katabatic-analysis/services/katabaticAnalyzer-node.ts` - Node.js analyzer

2. **Factor Evaluation**: Changes to factor criteria must match across:
   - Precipitation analysis thresholds
   - Sky condition evaluation logic
   - Pressure change calculations
   - Temperature differential formulas
   - Wave pattern analysis

3. **Location Requirements**: 
   - **ONLY Colorado locations**: Soda Lake, Morrison, Nederland
   - **NO Nevada locations** (Tahoe, Reno, etc.)
   - Coordinates must match exactly across all files

4. **Testing Requirements**:
   - Run `npm run predict-katabatic` to test Node.js analysis
   - Run `npm run verify-katabatic` to test verification logic
   - Check Wind Guru tab UI for matching displays
   - Ensure consistent GO/MAYBE/SKIP recommendations

5. **Data Integration**:
   - **NO mock data** - use real Ecowitt API data
   - Error handling must be consistent
   - Fallback behavior must align

### Alignment Verification Checklist:
- [ ] Confidence calculation formula identical across all analyzers
- [ ] Factor evaluation criteria match exactly
- [ ] Threshold values consistent (precipitation, pressure, temperature)
- [ ] Colorado location coordinates match
- [ ] UI displays match backend analysis results
- [ ] Both Node.js scripts and Wind Guru show same recommendations
- [ ] Error handling behavior aligned
- [ ] Real Ecowitt data integration working

**NEVER modify prediction logic in only one location. Always update corresponding files.**
