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

### Katabatic Analyzer (`hooks/useKatabaticAnalyzer.ts`)

**Purpose**: Advanced wind prediction using 4-factor meteorological analysis

**Analysis Factors**:
1. **Rain Factor**: Precipitation probability during dawn patrol
2. **Clear Sky Factor**: Cloud cover during overnight cooling
3. **Pressure Factor**: Barometric pressure changes
4. **Temperature Factor**: Elevation-based temperature gradients

**Calculation Process**:
```typescript
// Simplified calculation flow
const calculatePrediction = (weatherData: WeatherData) => {
  const rainScore = calculateRainFactor(weatherData);
  const skyScore = calculateSkyFactor(weatherData);
  const pressureScore = calculatePressureFactor(weatherData);
  const tempScore = calculateTemperatureFactor(weatherData);
  
  const overallProbability = (rainScore + skyScore + pressureScore + tempScore) / 4;
  const confidence = calculateConfidence(weatherData);
  
  return { probability: overallProbability, confidence };
};
```

### Audio Service (`services/alarmAudioService.ts`)

**Purpose**: Audio playback and alarm management

**Features**:
- Alarm sound playback
- Volume control
- Background audio capabilities
- Platform-specific optimizations

## Data Flow

### Primary Data Flow

```
User Interface
      ↓
Custom Hooks (useWindData, useKatabaticAnalyzer)
      ↓
Weather Service
      ↓
API/Cache/Mock Data
      ↓
Data Processing & Analysis
      ↓
State Updates (useReducer)
      ↓
UI Re-render
```

### State Flow Example

1. **User opens app** → `useWindData` hook activates
2. **Hook requests data** → `weatherService.getCurrentWeather()`
3. **Service checks cache** → Valid? Return cached : Fetch new
4. **Data processed** → `useKatabaticAnalyzer` calculates prediction
5. **State updated** → `useWindAlarmReducer` manages state
6. **UI updates** → Components re-render with new data

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
2. **State Colococation**: Keep state close to where it's used
3. **Virtualization**: Efficient list rendering for large datasets (future consideration)

### Bundle Size Management

1. **Tree Shaking**: Remove unused code
2. **Dynamic Imports**: Load features on demand
3. **Asset Optimization**: Compress images and fonts

### Network Efficiency

1. **Request Batching**: Combine multiple API calls when possible
2. **Compression**: Enable gzip for API responses
3. **Connection Pooling**: Reuse connections for better performance

## Security Considerations

### API Key Management

- **Environment Variables**: Never commit API keys to version control
- **Runtime Configuration**: Support for dynamic key configuration
- **Secure Storage**: Use Expo SecureStore for sensitive data

### Data Privacy

- **Local Processing**: All analysis happens on-device
- **No User Tracking**: No personal data collection
- **Minimal Permissions**: Request only necessary device permissions

This architecture provides a solid foundation for reliable, maintainable, and performant mobile application development while addressing the unique challenges of cross-platform React Native development.
