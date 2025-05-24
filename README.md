# Wind Trend Analyzer - Bear Creek Lake

A React Native app built with Expo that monitors wind conditions at Bear Creek Lake (Soda Lake Dam 1) in Colorado. The app analyzes early morning wind trends to determine if conditions are favorable for beach activities.

## Features

- **Real-time Wind Data**: Fetches current wind data from WindAlert API
- **Smart Analysis**: Analyzes 3am-5am window for alarm decisions
- **Verification System**: Checks 6am-8am window to verify predictions
- **Offline Support**: Caches data locally for offline access
- **Configurable Criteria**: User-adjustable thresholds for wind speed, direction consistency, and data quality
- **Dark Mode Support**: Automatically adapts to system theme
- **Mobile-First Design**: Optimized for iOS and Android devices

## Quickstart (Expo/React Native)

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the app**
   ```bash
   npx expo start --tunnel
   ```
   - Open in iOS simulator: Press `i`
   - Open in Android emulator: Press `a`
   - Scan QR code with Expo Go app for physical device

## How It Works

### Data Collection
- Fetches wind data from WindAlert API every few minutes
- Collects 24 hours of historical data
- Converts wind speeds from kph to mph
- Caches data locally using AsyncStorage

### Analysis Algorithm
The app analyzes wind conditions using configurable criteria:

- **Minimum Average Speed**: Default 10 mph during 3am-5am window
- **Direction Consistency**: Default 70% consistency threshold
- **Consecutive Good Points**: Default 4 consecutive data points meeting criteria
- **Speed/Direction Deviation**: Configurable thresholds for variability

### Time Windows
- **Alarm Window (3am-5am)**: Primary analysis period for wake-up decisions
- **Verification Window (6am-8am)**: Checks if predicted conditions occurred

## Usage

### Main Screen
- View current wind conditions and analysis
- See alarm status (Wake Up! 🌊 or Sleep In 😴)
- Check wind metrics: speed, direction consistency, data points
- Manual refresh of wind data

### Settings Screen (Explore Tab)
- Configure alarm criteria:
  - Minimum average wind speed
  - Direction consistency threshold
  - Required consecutive good points
  - Speed and direction deviation limits
- Reset to default values
- Manual data refresh

### Standalone Script
Run the wind data fetcher independently:
```bash
npm run fetch-wind
```
This creates JSON and CSV files with current wind data and analysis.

## File Structure

```
services/
  windService.ts          # Core wind data fetching and analysis
hooks/
  useWindData.ts          # React hook for wind data state management
components/
  WindDataDisplay.tsx     # Main wind data visualization component
  WindDataTest.tsx        # Testing component for development
scripts/
  fetch-wind-data.mjs     # Standalone wind data fetching script
```

## API Integration

The app integrates with WindAlert's API to fetch real-time wind data:
- **Endpoint**: `https://api.weatherflow.com/wxengine/rest/graph/getGraph`
- **Location**: Bear Creek Lake (Spot ID: 149264)
- **Data**: Wind speed, gusts, and direction over 24-hour period

## Configuration

All alarm criteria are configurable through the settings screen:

| Setting | Default | Description |
|---------|---------|-------------|
| Minimum Average Speed | 10 mph | Required wind speed for alarm |
| Direction Consistency | 70% | Minimum direction consistency |
| Consecutive Good Points | 4 | Required consecutive qualifying points |
| Speed Deviation | 3 mph | Maximum speed variation |
| Direction Deviation | 45° | Maximum direction variation |

## Data Storage

- **Wind Data**: Cached locally for offline access (2-hour expiry)
- **User Settings**: Persisted in AsyncStorage
- **Analysis Results**: Calculated in real-time

## Development

### Testing Wind Service
The app includes a test component (`WindDataTest`) that can be used to verify:
- API connectivity
- Data parsing
- Analysis calculations
- Error handling

### Debugging
1. Enable remote debugging in Expo Dev Tools
2. Check console logs for API responses
3. Use the test component to validate functionality
4. Check cached data in device storage

### Adding New Features
The modular structure makes it easy to extend:
- Add new analysis criteria in `windService.ts`
- Create new visualizations in `components/`
- Extend the React hook in `useWindData.ts`

## Future Enhancements

- **Push Notifications**: Alert users when conditions are favorable
- **Historical Trends**: Track accuracy of predictions over time
- **Weather Integration**: Combine with weather forecasts
- **Multiple Locations**: Support for different wind monitoring spots
- **Charts and Graphs**: Visual representation of wind trends
- **Sharing**: Share conditions with friends

## Troubleshooting

### Common Issues

1. **No wind data**: Check internet connection and API availability
2. **App crashes**: Check Expo Go version compatibility
3. **Settings not saving**: Ensure AsyncStorage permissions
4. **Stale data**: Use manual refresh or check cache expiry

### Error Messages
- "Failed to fetch wind data": API connectivity issue
- "No data available for alarm window": Missing data for analysis period
- "Failed to parse JSONP response": API response format changed

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Contact

For questions or support, please open an issue in the repository.
