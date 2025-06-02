# Standley Lake Wind Monitor

## Overview
The Standley Lake Wind Monitor is a new feature that allows users to monitor real-time wind conditions at Standley Lake using their personal Ecowitt weather station. This provides an additional wind monitoring location beyond the existing Soda Lake monitoring.

## Features

### Current Implementation
- **Real-time Wind Data**: Fetches current day wind data from Ecowitt API
- **Wind Visualization**: Interactive wind speed chart showing today's trends
- **Current Conditions**: Display of latest wind speed, direction, and data freshness
- **Wind Analysis**: Automatic analysis of wind patterns using existing algorithms
- **Data Caching**: Local storage of wind data for offline viewing
- **API Configuration**: User-friendly setup for Ecowitt API credentials

### API Integration
- **Service**: `services/ecowittService.ts`
- **Hook**: `hooks/useStandleyLakeWind.ts`
- **Screen**: `app/(tabs)/standley-lake.tsx`

## Setup Instructions

### For Users
1. Navigate to the "Standley Lake" tab in the app
2. Tap the settings gear icon to configure API access
3. Enter your Ecowitt credentials:
   - **Application Key**: From Ecowitt account → API Management
   - **API Key**: From Ecowitt account → API Management  
   - **MAC Address**: From Ecowitt account → Device Management
4. Save configuration and the app will automatically fetch wind data

### For Developers
The Standley Lake monitor reuses existing wind analysis algorithms and chart components from the Soda Lake implementation, ensuring consistency across the app.

#### Key Components
- **EcowittService**: Handles API communication with Ecowitt servers
- **useStandleyLakeWind**: React hook for data management and state
- **StandleyLakeScreen**: Main UI component with configuration and visualization

#### Data Flow
1. User configures API credentials (stored securely in AsyncStorage)
2. Hook automatically fetches current day data on initialization
3. Data is cached locally for offline access
4. Wind analysis runs automatically using existing algorithms
5. Chart displays data using existing WindChart component

## Future Enhancements

### Planned Features
- **Wind Alerts**: Configurable alerts for specific wind conditions
- **Direction-based Alerts**: Alerts based on wind direction preferences
- **Time-based Monitoring**: Alerts for sustained wind conditions over time
- **Multiple Location Comparison**: Side-by-side comparison with Soda Lake data
- **Historical Trends**: Weekly and monthly wind pattern analysis
- **Custom Thresholds**: Standley Lake-specific wind speed thresholds

### Technical Considerations
- **Rate Limiting**: Ecowitt API has rate limits that should be respected
- **Error Handling**: Robust handling of network failures and API errors
- **Background Updates**: Consider background refresh for real-time monitoring
- **Data Storage**: Implement longer-term data storage for trend analysis

## Location Information
**Standley Lake Regional Park and Wildlife Area**
- Location: Westminster, Colorado
- Use Case: Wind sports and recreational activities
- Typical Wind Patterns: West/Northwest winds preferred
- Best Conditions: Steady winds 12+ mph from western directions

## API Documentation
The integration uses the Ecowitt API v3 for historic data retrieval:
- **Endpoint**: `https://api.ecowitt.net/api/v3/device/history`
- **Documentation**: https://doc.ecowitt.net/web/#/apiv3en?page_id=19
- **Data Frequency**: 5-minute intervals for detailed analysis
- **Rate Limits**: As specified by Ecowitt API terms

## Troubleshooting

### Common Issues
- **No Data**: Check API configuration and device connectivity
- **API Errors**: Verify credentials and rate limit compliance
- **Network Issues**: App handles offline scenarios with cached data
- **Device Issues**: Ensure weather station is online and reporting data

### Debug Features
In development mode, additional debug options are available:
- Clear cache functionality
- Extended error logging
- API response inspection
