# Wind Trend Analyzer - Bear Creek Lake

A React Native mobile application built with Expo that monitors wind conditions at Bear Creek Lake (Soda Lake Dam 1) in Colorado. The app analyzes early morning wind trends to determine if conditions are favorable for beach activities.

## Project Overview

This app is designed for water sports enthusiasts who want to know if early morning wind conditions at Bear Creek Lake are worth waking up for. It fetches wind data from WindAlert, analyzes patterns during specific time windows, and provides a clear wake-up recommendation.

### Key Features

- **Real-time Wind Data**: Fetches current wind data from WindAlert API
- **Smart Analysis**: Analyzes 3am-5am window for alarm decisions
- **Verification System**: Checks 6am-8am window to verify predictions
- **Offline Support**: Caches data locally for offline access
- **Configurable Criteria**: User-adjustable thresholds for all wind parameters
- **Dark Mode Support**: Automatically adapts to system theme
- **Mobile-First Design**: Optimized for iOS and Android devices

## Getting Started

### Prerequisites

- Node.js 16+
- Expo CLI
- iOS simulator or Android emulator for testing (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dp-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Launch on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical devices

## Technical Implementation

### Data Flow

1. **Fetch**: Data is retrieved from WindAlert API for Bear Creek Lake
2. **Process**: Wind speeds are converted from kph to mph
3. **Filter**: Data is filtered to focus on the relevant time windows:
   - 2am-8am overall window
   - 3am-5am alarm analysis window
   - 6am-8am verification window
4. **Analyze**: Apply configurable criteria to determine alarm status
5. **Store**: Cache data locally for offline access
6. **Display**: Show results with visual indicators and charts

### Alarm Logic

The app determines if wind conditions are "alarm-worthy" based on these criteria:

1. **Average Wind Speed**: Must meet minimum threshold (default: 10 mph)
2. **Direction Consistency**: Wind direction must be consistent (default: 70%)
3. **Consecutive Good Points**: Requires a minimum number of consecutive qualifying data points (default: 4)
4. **Speed Deviation**: Speed should not vary too much (default: ±3 mph)
5. **Direction Deviation**: Direction should not vary too much (default: ±45°)

All these parameters are user-configurable through the settings screen.

### Core Components

- **`windService.ts`**: Core data fetching and analysis logic
- **`useWindData.ts`**: React hook for state management
- **`WindDataDisplay.tsx`**: Main UI component for data visualization
- **`WindChart.tsx`**: Line chart component for wind trends
- **`explore.tsx`**: Settings screen for configuring alarm criteria

## Usage Guide

### Home Screen

The home screen displays:
- Current alarm status ("Wake Up! 🌊" or "Sleep In 😴")
- Key metrics: speed, direction consistency, consecutive points
- Wind trend chart for the last 12 hours
- Verification results for the 6am-8am window
- Last updated timestamp
- Manual refresh button

### Settings Screen

Access the settings screen from the "Explore" tab to:
- Adjust minimum average wind speed
- Set direction consistency threshold
- Configure consecutive good points requirement
- Set speed and direction deviation thresholds
- Enable/disable alarm functionality
- Reset all settings to defaults

### Offline Usage

The app caches the most recent wind data and settings locally, allowing you to:
- View the last fetched data without internet connection
- Modify settings while offline
- See when data was last updated
- Force a refresh when connectivity is restored

## Standalone Script

For automation or server-side usage, a standalone script is provided:

```bash
npm run fetch-wind
```

This script:
- Fetches the latest wind data from WindAlert
- Performs the same analysis as the mobile app
- Outputs results to console
- Generates JSON and CSV files with wind data and analysis results

## Future Enhancements

The modular architecture makes it easy to add:
- Push notifications for favorable conditions
- Historical tracking of prediction accuracy
- Multiple locations beyond Bear Creek Lake
- Weather integration for more context
- Advanced visualization options

## Troubleshooting

### Common Issues

1. **No wind data displays**:
   - Check your internet connection
   - Verify WindAlert API is accessible
   - Try using the "Sample Data" button for testing

2. **Chart not displaying**:
   - Ensure you have at least 2 data points in the last 12 hours
   - Check if your device has sufficient memory

3. **Settings not saving**:
   - Verify AsyncStorage is working properly
   - Try restarting the app

4. **Slow performance**:
   - Clear app cache
   - Close other apps running in the background
   - Ensure you have the latest Expo Go version

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
