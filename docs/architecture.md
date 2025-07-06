# Architecture Guide

Complete technical architecture overview of the Dawn Patrol Alarm application.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Services](#core-services)
3. [Data Flow](#data-flow)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Android Optimizations](#android-optimizations)
8. [Performance Considerations](#performance-considerations)
9. [Transmission Quality Monitoring](#transmission-quality-monitoring)

## System Architecture

### High-Level Overview

Dawn Patrol Alarm follows a **service-oriented architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Screens  │    │  Components │    │   Layouts   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Hooks    │    │   Analyzers │    │   Reducers  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                      Service Layer                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Weather API │    │   Storage   │    │ Audio/Alarm │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                      Platform Layer                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Expo     │    │React Native │    │   Native    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Self-Contained**: No backend server dependency
2. **Mobile-First**: Optimized for mobile interfaces and interactions
3. **Offline-Capable**: Cached data for reliability
4. **Predictable**: Clear data flow and state management
5. **Maintainable**: Modular architecture with clear boundaries

## Core Services

### Weather Service (`services/weatherService.ts`)

**Purpose**: Centralized weather data management with multiple data sources

**Key Features**:
- OpenWeatherMap API integration
- Intelligent fallback system (API → Cache → Mock)
- 30-minute caching to minimize API calls
- Data source tracking and error handling

```typescript
// Service interface
interface WeatherService {
  getCurrentWeather(): Promise<WeatherData>;
  getForecast(): Promise<ForecastData>;
  getDataSource(): 'api' | 'cache' | 'mock';
}
```

**Data Flow**:
1. Request weather data
2. Check cache validity (30 minutes)
3. If expired, fetch from OpenWeatherMap API
4. Fall back to cached data if API fails
5. Fall back to mock data if all else fails

### Weather Data Functionality (Removed)

**Note**: The `useWeatherData.ts` hook has been **removed** as weather prediction functionality has been migrated to server-side processing.

**Previous Features (Removed in Server Migration)**:
- ~~Advanced wind prediction using 6-factor MKI meteorological analysis~~
- ~~Local katabatic analysis factors (precipitation, sky conditions, pressure, temperature, wave patterns, atmospheric stability)~~
- ~~MKI enhancement features and prediction tracking~~

**Current Features**:
- Basic weather data fetching from Open-Meteo API
- Simple temperature differential calculations
- Pressure trend analysis
- Cache management and error handling

**Server Migration**: Complex wind prediction logic moved to server infrastructure for enhanced performance and accuracy.

**Calculation Process**:
```typescript
// Enhanced MKI calculation flow
const calculatePrediction = (weatherData: WeatherData, waveAnalysis: MountainWaveAnalysis) => {
  const rainScore = calculateRainFactor(weatherData);
  const skyScore = calculateSkyFactor(weatherData);
  const pressureScore = calculatePressureFactor(weatherData);
  const tempScore = calculateTemperatureFactor(weatherData);
  const waveScore = calculateWavePatternFactor(waveAnalysis);
  const stabilityScore = calculateStabilityFactor(weatherData);
  
  const weightedProbability = calculateWeightedMKIScore(factors);
  const confidence = calculateMKIConfidence(weatherData, waveAnalysis);
  
  return { prediction: weightedProbability, confidence, mkiFactors };
};
```

### Mountain Wave Analyzer (`services/mountainWaveAnalyzer.ts`)

**Purpose**: Analyzes mountain wave conditions for MKI integration

**Key Functions**:
- **Froude Number Calculation**: Fr = U/(N*H) for mountain wave assessment
- **Wave Pattern Analysis**: Amplitude, organization, and surface coupling evaluation
- **Atmospheric Stability Profiling**: Multi-layer stability assessment
- **Enhancement Potential**: Determines positive/neutral/negative wave impact on katabatic flow

**Analysis Output**:
```typescript
interface MountainWaveAnalysis {
  froudeNumber: number;
  waveAmplitude: 'low' | 'moderate' | 'high';
  waveOrganization: 'organized' | 'mixed' | 'chaotic';
  surfaceCoupling: 'strong' | 'moderate' | 'weak';
  enhancement: 'positive' | 'neutral' | 'negative';
  confidence: number;
}
```

### Audio Service (`services/alarmAudioService.ts`)

**Purpose**: Audio playback and alarm management

**Features**:
- Alarm sound playback
- Volume control
- Background audio capabilities
- Platform-specific optimizations

## Data Flow

### Primary Data Flow (Simplified for Server-Based Predictions)

```
User Interface
      ↓
Custom Hooks (useWindData)
      ↓
Weather Service
      ↓
API/Cache/Mock Data
      ↓
Basic Data Processing
      ↓
State Updates
      ↓
UI Re-render
```

### State Flow Example

1. **User opens app** → `useWindData` hook activates
2. **Hook requests data** → `weatherService.getCurrentWeather()`
3. **Service checks cache** → Valid? Return cached : Fetch new
4. **Data processed** → Basic weather data formatting
5. **State updated** → Simple state management
6. **UI updates** → Components re-render with new data

### Wind Guru Server Integration (Coming Soon)

```
Client Request → Server API → AI Analysis → Prediction Response → UI Update
```

### Error Handling Flow

```
API Request
    ↓
[Success] → Process Data → Update UI
    ↓
[Failure] → Check Cache
    ↓
[Cache Valid] → Use Cached Data → Update UI
    ↓
[Cache Invalid] → Use Mock Data → Show Warning → Update UI
```

## Component Architecture

### Screen Components (`/app`)

**Structure**: File-based routing with Expo Router
```
app/
├── _layout.tsx           # Root layout with navigation
├── (tabs)/              # Tab-based navigation
│   ├── _layout.tsx      # Tab layout configuration
│   ├── index.tsx        # Home/Wind data screen
│   ├── wind-guru.tsx    # Katabatic predictions  
│   └── ...              # Additional tab screens
└── +not-found.tsx       # 404 error screen
```

**Key Patterns**:
- Each screen is a functional component
- Uses custom hooks for data and state
- Implements error boundaries for crash recovery
- Supports both light and dark themes

### Reusable Components (`/components`)

**Organization**:
```
components/
├── ui/                  # Generic UI components
├── WindChart.tsx        # Wind data visualization
├── WindDataDisplay.tsx  # Wind data presentation
├── AndroidSafeWrapper.tsx # Android crash protection
├── ErrorBoundary.tsx    # Error recovery
└── ...                  # Feature-specific components
```

**Design Patterns**:
- **Composition over inheritance**
- **Props-based configuration**
- **Consistent theming support**
- **Android-specific safety wrappers**

### Android-Specific Components

Due to Android platform challenges, several components provide crash protection:

- `AndroidSafeWrapper`: Generic crash protection wrapper
- `SafeImage`: Protected image loading
- `WhiteScreenDetective`: White screen detection and recovery
- `GlobalCrashRecovery`: App-wide crash recovery system

## State Management

### Hook-Based State Management

**Primary Pattern**: Custom hooks with `useReducer` for complex state

```typescript
// Example: Wind alarm state management
const useWindAlarmReducer = () => {
  const [state, dispatch] = useReducer(windAlarmReducer, initialState);
  
  const actions = {
    setWeatherData: (data: WeatherData) => 
      dispatch({ type: 'SET_WEATHER_DATA', payload: data }),
    setPrediction: (prediction: KatabaticPrediction) =>
      dispatch({ type: 'SET_PREDICTION', payload: prediction }),
    // ... other actions
  };
  
  return { state, actions };
};
```

### State Structure

```typescript
interface AppState {
  // Weather data
  currentWeather: WeatherData | null;
  forecast: ForecastData | null;
  
  // Predictions
  todayPrediction: KatabaticPrediction | null;
  tomorrowPrediction: KatabaticPrediction | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  dataSource: 'api' | 'cache' | 'mock';
  
  // Settings
  userPreferences: UserPreferences;
}
```

### Context Usage

Context is used sparingly, primarily for:
- Theme management (light/dark mode)
- Global error handling
- User preferences
- Debug settings (development only)

## API Integration

### OpenWeatherMap Integration

**Configuration**:
```typescript
const weatherConfig = {
  baseUrl: 'https://api.openweathermap.org/data/2.5',
  apiKey: process.env.OPENWEATHER_API_KEY,
  locations: {
    morrison: { lat: 39.6525, lon: -105.1178 },
    nederland: { lat: 39.9617, lon: -105.5067 }
  }
};
```

**Data Processing**:
1. Fetch current weather for both elevation points
2. Fetch 5-day forecast for trend analysis
3. Convert units (Kelvin → Fahrenheit, m/s → mph)
4. Extract relevant time windows (2-5 AM, 6-8 AM)
5. Calculate gradients and changes

### Ecowitt Integration (Optional)

**Purpose**: Standley Lake real-time monitoring
**Configuration**: Requires separate API credentials
**Usage**: Supplementary data source for Front Range conditions

### Caching Strategy

**Cache Duration**: 30 minutes for weather data
**Storage**: AsyncStorage for persistence across app sessions
**Validation**: Timestamp-based expiration
**Fallback**: Graceful degradation to mock data

## Android Optimizations

### Crash Prevention

**Challenge**: Android platform instability with React Native
**Solution**: Multi-layered protection system

1. **Error Boundaries**: Catch and recover from component crashes
2. **Safe Wrappers**: Protect crash-prone native operations
3. **White Screen Detection**: Detect and recover from white screen crashes
4. **Global Recovery**: App-wide crash recovery with state restoration

### Memory Management

- **Image Optimization**: Proper image loading and disposal
- **Component Cleanup**: Cleanup timers and listeners
- **Memory Monitoring**: Debug tools for memory leak detection

### Performance Optimizations

- **Lazy Loading**: Load components only when needed
- **Efficient Re-renders**: useMemo and useCallback optimization
- **Background Processing**: Minimize main thread blocking

## Performance Considerations

### Data Fetching Optimization

1. **Intelligent Caching**: 30-minute cache prevents excessive API calls
2. **Background Updates**: Refresh data without blocking UI
3. **Optimistic Updates**: Show cached data immediately, update when fresh data arrives

### Rendering Optimization

1. **Component Memoization**: Prevent unnecessary re-renders
2. **State Colocational**: Keep state close to where it's used
3. **Virtualization**: Efficient list rendering for large datasets (future consideration)

### Bundle Size Management

1. **Tree Shaking**: Remove unused code
2. **Dynamic Imports**: Load features on demand
3. **Asset Optimization**: Compress images and fonts

### Network Efficiency

1. **Request Batching**: Combine multiple API calls when possible
2. **Compression**: Enable gzip for API responses
3. **Connection Pooling**: Reuse connections for better performance

## MKI Integration Architecture

### Mountain Wave-Katabatic Interaction Implementation

The Phase 4 MKI integration represents a significant architectural enhancement that transforms the prediction system from basic meteorological analysis to sophisticated atmospheric science modeling.

### Enhanced Prediction Pipeline

```
Weather Data Input
      ↓
Basic Meteorological Analysis (4 factors)
      ↓
Mountain Wave Analysis (NEW)
      ↓
Atmospheric Stability Profiling (NEW)
      ↓
MKI Integration & Enhancement Calculation
      ↓
6-Factor Weighted Prediction with Confidence
```

### New Service Integration

**Mountain Wave Analyzer Service**:
- Calculates Froude numbers for wave assessment
- Analyzes wave amplitude, organization, and surface coupling
- Determines enhancement potential (positive/neutral/negative)
- Integrates with main prediction pipeline

**Enhanced Katabatic Analyzer**:
- Rebalanced factor weights for 6-factor system (25%, 20%, 20%, 15%, 15%, 5%)
- Advanced bonus system with MKI-aware calculations
- Multi-scale confidence assessment
- Nonlinear interaction modeling

### Technical Implementation Benefits

1. **Accuracy Improvement**: Target 15-25% increase in prediction accuracy
2. **Edge Case Handling**: Better handling of marginal conditions with wave enhancement
3. **Scientific Foundation**: First practical consumer implementation of MKI research
4. **Scalable Architecture**: Foundation for future machine learning integration

### Performance Considerations for MKI

- **Computation Caching**: Complex Froude number calculations cached for 30 minutes
- **Background Processing**: Wave analysis performed asynchronously
- **Graceful Degradation**: Falls back to 4-factor system if wave data unavailable
- **Memory Optimization**: Efficient wave pattern data structures

## Security Considerations

### API Key Management

- **Environment Variables**: Never commit API keys to version control
- **Runtime Configuration**: Support for dynamic key configuration
- **Secure Storage**: Use Expo SecureStore for sensitive data

### Data Privacy

- **Local Processing**: All analysis happens on-device
- **No User Tracking**: No personal data collection
- **Minimal Permissions**: Request only necessary device permissions

## Transmission Quality Monitoring

### Overview

The app includes comprehensive transmission quality monitoring to detect and handle antenna issues that cause incomplete data transmission from weather stations.

### Implementation

#### Core Components

1. **TransmissionQualityInfo Interface**
   - `isFullTransmission`: Boolean indicating complete sensor data
   - `hasOutdoorSensors`: Boolean for outdoor temperature/humidity availability
   - `hasWindData`: Boolean for wind sensor availability
   - `transmissionGaps`: Array of detected gaps with timing and type
   - `currentTransmissionStatus`: Current status (good/partial/indoor-only/offline)

2. **Data Point Analysis**
   - `analyzeDataPointTransmissionQuality()`: Analyzes individual readings
   - Detects missing outdoor sensors vs. indoor-only transmissions
   - Identifies antenna issues when only indoor data is transmitted

3. **Temporal Analysis**
   - `analyzeOverallTransmissionQuality()`: Analyzes patterns over time
   - Detects gaps and their duration
   - Categorizes gap types (antenna, offline, partial)

#### Integration Points

1. **Data Fetching**
   - Modified API calls to request wind + outdoor + indoor data
   - Enhanced response parsing to detect missing fields
   - Quality metadata attached to each data point

2. **Hook Updates**
   - `useSodaLakeWind` and `useStandleyLakeWind` now include transmission quality
   - Automatic analysis on data refresh
   - State management for quality information

3. **UI Components**
   - Transmission status indicators in current conditions
   - Detailed alerts for antenna issues
   - Chart context explanations for data gaps
   - Color-coded status messages

#### Data Flow

```
API Response → Data Point Analysis → Quality Metadata → Hook State → UI Alerts
     ↓                                      ↓                          ↓
Enhanced Parsing → Individual Assessment → Overall Analysis → User Warnings
```

### Benefits

1. **User Understanding**: Clear distinction between technical issues and weather conditions
2. **Data Transparency**: Users know when gaps are due to transmission problems
3. **Reliability**: Better interpretation of incomplete data
4. **Troubleshooting**: Helps identify station hardware issues

## Wind Prediction System Architecture

### Hybrid 5-Factor Implementation Summary

Successfully updated the Wind Guru prediction system from a theoretical 6-factor system to a practical 5-factor hybrid system combining NOAA and OpenWeather APIs with real meteorological data.

#### 1. Hybrid Weather Service (`hybridWeatherService.ts`)
- **Primary NOAA Integration**: Rain probability, sky cover, temperature grids, transport winds
- **Secondary OpenWeather Integration**: Pressure trends and backup data
- **Smart Fallback Logic**: NOAA → OpenWeather → Cache → Mock data progression
- **Data Source Tracking**: Real-time monitoring of which API provides each factor

#### 2. Updated 5-Factor Katabatic Analyzer (`katabaticAnalyzer.ts`)
**Current Factors:**
- **Factor #1 - Rain Probability (25% weight)**: NOAA precipitation forecasts
- **Factor #2 - Clear Sky Conditions (25% weight)**: NOAA sky cover analysis  
- **Factor #3 - Pressure Change (20% weight)**: OpenWeather pressure trends
- **Factor #4 - Temperature Differential (15% weight)**: NOAA temperature grid data
- **Factor #5 - Wave Pattern Analysis (10% weight)**: NOAA transport winds + mixing height data

**Algorithm Enhancements:**
- Rebalanced factor weights for 5-factor system (25%/25%/20%/15%/10%)
- Enhanced bonus system for multiple favorable factors
- Improved confidence calculation accounting for hybrid data sources

#### Factor Weighting System
```
precipitation: 25%        (replaces atmospheric stability)
skyConditions: 25%        (same) 
pressureChange: 20%       (same)
temperatureDifferential: 15%  (same)
wavePattern: 10%          (updated: uses transportWindAnalysis)
```

#### Confidence Calculation
- **High Confidence**: 4+ factors met with hybrid data reliability
- **Medium Confidence**: 3-4 factors met with some data uncertainty
- **Low Confidence**: <3 factors met or significant data gaps

#### Bonus System (Updated for 5-factor)
- **4+ factors met**: 20% bonus
- **5 factors met**: Additional 25% bonus (45% total)
- **Positive wave enhancement**: Additional 10% bonus when confidence >70%

### Wind Guru Enhancement Plan: MKI Integration

#### Current System Strengths
- 5-factor analysis system (Precipitation, Sky Conditions, Pressure, Temperature, Wave Pattern) 
- Confidence calculation with factor weighting
- Real-time verification and learning
- User-friendly presentation with probability and recommendations

#### Future Enhancement Phases

**Phase 1: Enhanced Data Collection**
- Synoptic Wind Data: Upper-level wind speed and direction (2-4km altitude)
- Atmospheric Stability: Calculate Brunt-Väisälä frequency and stability profile
- Froude Number: Compute Fr = U/NH for mountain wave assessment
- Multi-level Temperature: Temperature profiles for stability analysis
- Enhanced Pressure Data: Higher temporal resolution pressure measurements

**Phase 2: MKI Factor Integration**
- Wave Pattern Factor: Calculate Froude number from synoptic conditions
- Atmospheric Stability Factor: Multi-layer stability optimization
- Expand factor weighting system to 6 factors
- Update recommendation logic for MKI scenarios

**Phase 3: Advanced Prediction Logic**
- Multi-scale Variability Modeling (mesoscale/microscale)
- Enhanced Pressure Analysis with wave-induced modifications
- Coupling Efficiency Calculation for wave energy transmission

**Phase 4: Advanced UI/UX**
- Enhanced factor display with MKI-specific explanations
- Advanced prediction windows based on wave evolution
- Activity-specific MKI guidance and safety considerations
