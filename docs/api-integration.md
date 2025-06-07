# API Integration Guide

Complete guide for setting up and managing API integrations in Dawn Patrol Alarm.

## Table of Contents

1. [Overview](#overview)
2. [OpenWeatherMap Setup](#openweathermap-setup)
3. [Ecowitt Integration](#ecowitt-integration)
4. [Environment Configuration](#environment-configuration)
5. [Data Processing](#data-processing)
6. [Troubleshooting](#troubleshooting)

## Overview

Dawn Patrol Alarm integrates with multiple weather data sources to provide accurate katabatic wind predictions:

- **Primary**: OpenWeatherMap API (real meteorological data)
- **Secondary**: Ecowitt API (Standley Lake real-time monitoring)
- **Fallback**: Cached data and mock data for reliability

### Data Source Priority

1. **OpenWeatherMap API** → Fresh meteorological data
2. **Cached Data** → Recent API data (30-minute expiration)
3. **Mock Data** → Backup data when all else fails

## OpenWeatherMap Setup

### Step 1: Create Account

1. Go to [OpenWeatherMap API](https://openweathermap.org/api)
2. Click **"Sign Up"** to create a free account
3. Verify your email address

### Step 2: Get API Key

1. Sign in and go to [API Keys](https://home.openweathermap.org/api_keys)
2. Copy your **default API key** (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
3. Note: New keys may take up to 10 minutes to activate

### Step 3: Configure Environment

**Option A: Environment File (Recommended)**
```bash
# Add to .env file
OPENWEATHER_API_KEY=your_api_key_here
```

**Option B: Direct Configuration**
```javascript
// In app.config.js
export default {
  expo: {
    extra: {
      openWeatherApiKey: 'your_api_key_here'
    }
  }
};
```

### Features Provided

- **Current Weather**: Real-time conditions for Morrison and Nederland
- **5-Day Forecast**: Extended prediction data
- **Historical Data**: Pattern analysis and verification
- **Multiple Locations**: Elevation-based temperature gradients

### API Endpoints Used

```typescript
// Current weather
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_key}

// 5-day forecast  
https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_key}
```

### Data Points Collected

- **Temperature**: Current and forecasted
- **Pressure**: Barometric pressure changes
- **Humidity**: Moisture content
- **Cloud Cover**: Sky conditions
- **Precipitation**: Rain/snow probability
- **Wind**: Speed and direction

## Ecowitt Integration

### Purpose

Provides **real-time wind monitoring** at Standley Lake for Front Range conditions complementing Soda Lake predictions.

### Step 1: Ecowitt Account Setup

1. Create account at [Ecowitt Weather](https://www.ecowitt.net/)
2. Register your weather station (if you have one)
3. Access the API section in your account dashboard

### Step 2: API Credentials

You need two credentials:
- **Application Key**: Identifies your application
- **API Key**: Authenticates your requests

### Step 3: Configuration

```bash
# Add to .env file
ECOWITT_APPLICATION_KEY=your_application_key_here
ECOWITT_API_KEY=your_api_key_here
```

### Features Provided

- **Real-time Wind Data**: Current speed and direction at Standley Lake
- **Historical Trends**: Pattern analysis for Front Range conditions
- **Station Data**: Temperature, humidity, pressure from local station

### Usage in App

The Ecowitt integration appears in:
- Standley Lake monitoring tab/section
- Supplementary data for prediction confidence
- Regional wind pattern analysis

### API Endpoints

```typescript
// Real-time data
https://api.ecowitt.net/api/v3/device/real_time?application_key={app_key}&api_key={api_key}&mac={device_mac}
```

## Environment Configuration

### Development vs Production

**Development (.env file)**:
```bash
# Local development environment
OPENWEATHER_API_KEY=your_dev_api_key
ECOWITT_APPLICATION_KEY=your_dev_app_key
ECOWITT_API_KEY=your_dev_api_key
```

**Production (GitHub Secrets)**:
- Set environment variables in GitHub repository secrets
- CI/CD workflow automatically injects them during build

### Configuration Priority

1. **Environment Variables** (highest priority)
2. **app.config.js** settings
3. **Default/Mock Values** (fallback)

### Validation

The app automatically validates API keys:
```typescript
// Key validation
const validateApiKey = (key: string) => {
  return key && key.length > 10 && !key.includes('your_');
};
```

## Data Processing

### Weather Data Processing

**OpenWeatherMap Response Processing**:
```typescript
interface ProcessedWeatherData {
  temperature: {
    current: number;      // °F
    min: number;          // °F  
    max: number;          // °F
  };
  pressure: {
    current: number;      // hPa
    change: number;       // hPa difference
  };
  cloudCover: number;     // % (0-100)
  precipitation: number;  // % probability
  windSpeed: number;      // mph
  windDirection: number;  // degrees
}
```

**Unit Conversions**:
- Temperature: Kelvin → Fahrenheit
- Wind Speed: m/s → mph  
- Pressure: hPa (no conversion needed)
- Distance: meters → feet (for elevation)

### Caching Strategy

**Cache Duration**: 30 minutes
**Storage Location**: AsyncStorage (persistent across app sessions)
**Cache Keys**: Location-based and timestamp-based

```typescript
interface CachedData {
  data: WeatherData;
  timestamp: number;
  source: 'api' | 'cache' | 'mock';
  expiresAt: number;
}
```

### Error Handling

**Graceful Degradation**:
1. **API Failure** → Use cached data
2. **Cache Expired** → Use mock data with warning
3. **No Data** → Show error message with retry option

**Error Types**:
- Network connectivity issues
- Invalid API keys
- Rate limiting (OpenWeatherMap: 1000 calls/day free tier)
- Server downtime

## Troubleshooting

### Common Issues

**"Invalid API Key" Error**
- **Cause**: API key not set or incorrect
- **Solution**: Verify key in .env file, check for typos
- **Debug**: Look for key validation in app logs

**"No Data Available" Message**
- **Cause**: All data sources failed
- **Solution**: Check internet connection, verify API status
- **Fallback**: App will use mock data with warning

**Outdated Predictions**
- **Cause**: API calls failing, using old cached data
- **Solution**: Manual refresh, check API quota
- **Check**: Data source indicator (API/Cache/Mock)

### Debug Tools

**Data Source Indicators**:
- 🟢 **API**: Fresh data from OpenWeatherMap
- 🟡 **Cache**: Recent cached data (< 30 minutes)
- 🔴 **Mock**: Fallback data (API unavailable)

**Debug Information**:
Enable debug mode to see:
- API response times
- Cache hit/miss ratios
- Error details and stack traces
- Network request details

### API Limits and Quotas

**OpenWeatherMap Free Tier**:
- 1,000 API calls per day
- 60 calls per minute
- Typical app usage: ~48 calls per day (every 30 minutes)

**Ecowitt Limits**:
- Contact Ecowitt for specific rate limits
- Generally more generous for personal use

### Optimization Tips

1. **Minimize API Calls**:
   - Use 30-minute caching effectively
   - Don't refresh unnecessarily
   - Batch requests when possible

2. **Monitor Usage**:
   - Track daily API call count
   - Set up alerts for quota limits
   - Consider paid plans for heavy usage

3. **Handle Failures Gracefully**:
   - Always provide fallback data
   - Show clear error messages
   - Enable easy retry mechanisms

### Testing API Integration

**Test Commands**:
```bash
# Test OpenWeatherMap key
curl "https://api.openweathermap.org/data/2.5/weather?lat=39.6525&lon=-105.1178&appid=YOUR_API_KEY"

# Validate environment setup
npm run validate-env

# Debug API calls
npm run debug-api
```

**Mock Data Testing**:
- Temporarily disable API keys to test fallback behavior
- Verify caching works correctly
- Ensure UI handles all data source states

This integration guide ensures reliable weather data for accurate katabatic wind predictions while providing robust fallback mechanisms for consistent app functionality.
