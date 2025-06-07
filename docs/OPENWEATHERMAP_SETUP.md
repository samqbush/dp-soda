# OpenWeatherMap API Setup Guide

## Getting Your Free API Key

The Dawn Patrol app now uses **real weather data** from OpenWeatherMap instead of mock data! This will fix the accuracy issues that the wind guru identified.

### Step 1: Create OpenWeatherMap Account

1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Click **"Sign Up"** (or **"Sign In"** if you have an account)
3. Create a free account with your email

### Step 2: Get Your API Key

1. After signing in, go to [https://home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)
2. You should see a **default API key** already created
3. Copy this API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 3: Configure Your App

#### Option A: Environment Variables (Recommended)
1. Copy `.env.example` to `.env`: `cp .env.example .env`
2. Edit `.env` file and replace `your_openweather_api_key_here` with your actual API key:
   ```bash
   OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
3. Restart your app: `npm start`

#### Option B: Runtime Configuration (Testing)
If you want to test without setting up environment variables:
1. Open the Wind Guru tab in your app
2. Look for "API Configuration" or settings
3. Enter your API key manually

### Step 4: Verify It's Working

Once configured, you should see:
- **Real weather forecasts** instead of mock data
- **Accurate precipitation probabilities** (not random numbers)
- **Correct cloud cover predictions** 
- **Actual pressure trends**
- **Data source indicator** showing "API" instead of "Mock"

## API Limits & Usage

### Free Tier Includes:
- **1,000 API calls per day** (plenty for dawn patrol predictions)
- **Current weather data**
- **5-day/3-hour forecasts** (perfect for 48-hour predictions)
- **No credit card required**

### Call Frequency:
The app automatically:
- **Fetches every 30 minutes** when active
- **Caches data** to minimize API usage
- **Falls back to cache** if API limits are reached
- **Uses mock data** only if API key is missing

## Troubleshooting

### "API Key Not Configured" Message
- Check your `.env` file exists and has the correct key
- Restart the app after adding the API key
- Verify the key doesn't have extra spaces or quotes

### "API Error" Messages
- **New API keys take 10-60 minutes to activate** - be patient!
- Check you copied the full API key correctly
- Verify your internet connection
- Free tier might have temporary rate limits

### Still Seeing Mock Data
- Restart the app completely (close and reopen)
- Check the console logs for API configuration status
- Try the manual API key entry option

## What This Fixes

### Before (Mock Data Issues):
- ❌ Random precipitation predictions
- ❌ Fake cloud cover patterns  
- ❌ Artificial pressure trends
- ❌ "Clear skies" errors that wind gurus noticed

### After (Real API Data):
- ✅ Actual weather service forecasts
- ✅ Real precipitation probabilities
- ✅ Accurate cloud cover predictions
- ✅ Genuine pressure change analysis
- ✅ Predictions that match expert knowledge

## Data Sources

Your app now gets weather data from:
1. **OpenWeatherMap**: Forecast data (precipitation, clouds, pressure)
2. **WindAlert**: Real-time wind measurements
3. **Ecowitt**: Personal weather station data (if configured)

This combination provides the most accurate katabatic wind predictions possible!

## Need Help?

- **OpenWeatherMap Support**: [https://openweathermap.org/faq](https://openweathermap.org/faq)
- **API Documentation**: [https://openweathermap.org/forecast5](https://openweathermap.org/forecast5)
- **App Issues**: Check the validation script output for data quality

The wind guru should now see much more accurate predictions! 🎯
