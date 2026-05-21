# Architecture Guide

Technical architecture overview of the Dawn Patrol Alarm application.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Services](#core-services)
3. [Data Flow](#data-flow)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [API Integration](#api-integration)
7. [Transmission Quality Monitoring](#transmission-quality-monitoring)
8. [Performance Considerations](#performance-considerations)

## System Architecture

### High-Level Overview

Dawn Patrol follows a **service-oriented architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Screens   │    │  Components │    │   Layouts   │     │
│  │  (app/tabs) │    │ (components)│    │ (app/_layout│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Hooks    │    │  Contexts   │    │   Config    │     │
│  │  (hooks/)   │    │ (contexts/) │    │  (config/)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                      Service Layer                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Ecowitt    │    │   Storage   │    │    Wind     │     │
│  │  Service    │    │   Service   │    │   Service   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                      Platform Layer                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Expo SDK   │    │React Native │    │  Native iOS │     │
│  │     55      │    │    0.83     │    │  / Android  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Service-based**: All API calls and data processing happen in service modules
2. **Hook-driven UI**: Custom hooks bridge services to components
3. **No mock data**: Errors are displayed to users, never hidden behind fake data
4. **Offline-capable**: Cached data provides continuity during network issues
5. **Multi-station**: Same architecture pattern replicated per weather station

## Core Services

### Ecowitt Service (`services/ecowittService.ts`)

**Purpose**: Primary data source — fetches wind data from Ecowitt weather stations

**Key Functions**:
- `fetchEcowittCombinedWindDataForDevice()` — combines historical + real-time APIs to eliminate data gaps
- Real-time data fetching for current conditions
- Historical data fetching for chart display

**Data Strategy**:
- Historical API provides data from start of day
- Real-time API provides current conditions
- Combined approach eliminates the common 7am–1pm data gap issue

### Wind Service (`services/windService.ts`)

**Purpose**: Wind data processing and analysis

### Wind Threshold Service (`services/windThresholdService.ts`)

**Purpose**: Manages user-configured wind speed thresholds with persistence via AsyncStorage

### Storage Service (`services/storageService.ts`)

**Purpose**: AsyncStorage wrapper for local data persistence

### Sunrise Service (`services/sunriseService.ts`)

**Purpose**: Calculates sunrise/sunset times for dawn patrol timing

### App Logger (`services/appLogger.ts`)

**Purpose**: Centralized logging utility

### Fallback Data (`services/fallbackData.ts`)

**Purpose**: Provides fallback data structure when API calls fail (not mock data — used for error state display)

## Data Flow

### Primary Data Flow

```
User opens tab (e.g., Standley Lake)
       ↓
useStandleyLakeWind hook activates
       ↓
Calls ecowittService.fetchEcowittCombinedWindDataForDevice()
       ↓
Ecowitt API (historical + real-time)
       ↓
Data processed (timestamps, units, gap detection)
       ↓
Transmission quality analyzed
       ↓
Hook state updated
       ↓
WindStationTab + CustomWindChart re-render
```

### Error Handling Flow

```
API Request
    ↓
[Success] → Process Data → Update UI
    ↓
[Failure] → Check Cache
    ↓
[Cache Valid] → Use Cached Data → Update UI (with stale indicator)
    ↓
[Cache Invalid] → Show Error Message → Update UI
```

## Component Architecture

### Screen Components (`/app`)

```
app/
├── _layout.tsx              # Root layout, SettingsContext provider
├── +not-found.tsx           # 404 screen
└── (tabs)/
    ├── _layout.tsx          # Tab bar config (5 tabs)
    ├── index.tsx            # Soda Lake (home)
    ├── standley-lake.tsx    # Standley Lake
    ├── boulder-res.tsx      # Boulder Reservoir
    ├── wind-guru.tsx        # Predictions (experimental, gated)
    └── settings.tsx         # App settings
```

### Reusable Components (`/components`)

| Component | Purpose |
|-----------|---------|
| `WindStationTab.tsx` | Shared layout for wind station screens |
| `CustomWindChart.tsx` | SVG chart with scrolling, gap handling, time labels |
| `DayPredictionCard.tsx` | Wind prediction display card |
| `WeeklyForecast.tsx` | 7-day forecast component |
| `ThresholdSlider.tsx` | Wind threshold configuration slider |
| `ErrorBoundary.tsx` | Crash recovery wrapper |
| `HeaderImage.tsx` | Tab header image display |
| `LoadingScreen.tsx` | Loading state display |
| `SafeImage.tsx` | Protected image loading |

### UI Primitives (`/components/ui`)

- `IconSymbol.tsx` / `IconSymbol.ios.tsx` — Platform-specific icon rendering
- `TabBarBackground.tsx` / `TabBarBackground.ios.tsx` — Tab bar styling

## State Management

### Pattern: Custom Hooks + Context

**SettingsContext** (`contexts/SettingsContext.tsx`):
- Wind Guru enabled/disabled toggle
- Wind threshold preferences
- Persisted via AsyncStorage

**Station Wind Hooks**:
- `useStationWind.ts` — Base hook for wind data fetching
- `useStandleyLakeWind.ts` — Standley Lake specific config
- `useSodaLakeWind.ts` — Soda Lake specific config
- `useBoulderResWind.ts` — Boulder Reservoir specific config
- `useWindThreshold.ts` — Threshold value management

Each station hook follows the same pattern:
```typescript
const { windData, loading, error, refresh, transmissionQuality } = useStandleyLakeWind();
```

### Theme

- `useColorScheme.ts` / `useColorScheme.web.ts` — System theme detection
- `useThemeColor.ts` — Color values for current theme

## API Integration

### Ecowitt API (Primary)

**Authentication**: Application key + API key + device MAC address

**Endpoints**:

| Endpoint | Purpose |
|----------|---------|
| `/api/v3/device/real_time` | Current conditions (last 2 hours) |
| `/api/v3/device/history` | Historical data (5-min resolution for past 90 days) |

**Configuration** (`config/ecowittConfig.ts`):
- Station MAC addresses
- Device names and locations
- API parameter defaults

**Unit Configuration**:
| Measurement | Default |
|-------------|---------|
| Wind Speed | mph (`wind_speed_unitid: 9`) |
| Temperature | °F (`temp_unitid: 2`) |
| Pressure | inHg (`pressure_unitid: 4`) |

**History Resolution Constraints**:
| Time Range | Resolution | Max Span |
|---|---|---|
| Past 90 days | 5 min | 1 day |
| Past 365 days | 30 min | 1 week |
| Past 730 days | 240 min | 1 month |

### OpenWeatherMap API (Secondary)

Used for weather forecast data. Configured via `OPENWEATHER_API_KEY` environment variable.

## Transmission Quality Monitoring

### Overview

Detects antenna issues that cause incomplete data transmission from weather stations, distinguishing "station can't transmit" from "no wind."

### Implementation

**Analysis Functions**:
- `analyzeDataPointTransmissionQuality()` — per-reading analysis
- `analyzeOverallTransmissionQuality()` — temporal pattern detection

**Quality States**:
- `good` — All sensors reporting
- `partial` — Some sensors missing
- `indoor-only` — Antenna issue (only indoor sensors transmitting)
- `offline` — No data received

**Integration**:
- Station wind hooks include `transmissionQuality` in their return value
- UI displays color-coded status indicators
- Chart gaps are annotated with transmission context

### Data Flow

```
API Response → Data Point Analysis → Quality Metadata → Hook State → UI Alerts
```

## Performance Considerations

### Data Fetching
- Combined historical + real-time API calls minimize round-trips
- Auto-refresh only on first tab navigation (not every focus)
- Pull-to-refresh for manual updates

### Rendering
- SVG-based charts (CustomWindChart) for smooth scrolling
- Proper gap handling avoids false interpolation
- Dynamic chart width based on data range

### Caching
- AsyncStorage for data persistence across sessions
- Stale data shown immediately while fresh data loads
- Configurable cache duration per data type

## Security

### API Key Management
- Environment variables (`.env`) — never committed to version control
- GitHub Actions secrets for CI/CD builds
- No API keys bundled in app binary (injected at build time via `app.config.js`)

### Data Privacy
- All processing happens on-device
- No user tracking or personal data collection
- Minimal permissions (network access only)
