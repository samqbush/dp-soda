---
mode: 'agent'
tools: ['file_search', 'semantic_search', 'read_file', 'list_dir', 'grep_search', 'run_in_terminal', 'create_file', 'replace_string_in_file', 'insert_edit_into_file']
description: 'Feature development assistant for Dawn Patrol Alarm - wind analysis and alarm functionality'
---

# Dawn Patrol Alarm - Feature Development Instructions

## Project Overview
Dawn Patrol Alarm is an Expo/React Native application that helps wind sports enthusiasts make early morning decisions for "dawn patrol" sessions at Soda Lake (Soda Lake Dam 1), Colorado. The app scrapes wind data from WindAlert, analyzes early morning wind trends (3am-5am), and provides intelligent wake-up recommendations.

## Architecture & Key Components

### Core Architecture Pattern
- **Service-Oriented Design**: Clear separation between data, UI, and system services
- **Custom Hook Architecture**: Domain-specific hooks for state management
- **Multi-Layer Error Handling**: Comprehensive crash detection and recovery

### Key Directories & Files
```
app/                     # Expo Router screens and navigation
├── (tabs)/             # Tab-based navigation structure
├── _layout.tsx         # Root layout and providers
└── index.tsx           # Main home screen

components/             # Reusable UI components
├── WindChart.tsx       # Wind data visualization
├── WindDataDisplay.tsx # Current conditions display
├── ErrorBoundary.tsx   # Error handling wrapper
└── ui/                 # Platform-specific UI components

hooks/                  # Custom React hooks
├── useWindData.ts      # Wind data fetching and caching
├── useAlarmAudio.ts    # Audio playback management
├── useWindAnalyzer.ts  # Wind analysis and predictions
└── useWindAlarmReducer.ts # Centralized state management

services/               # Business logic and external integrations
├── windService.ts      # WindAlert data scraping
├── alarmAudioService.ts # Audio playback with race condition prevention
├── storageService.ts   # Data persistence layer
└── crashMonitor.ts     # Error tracking and reporting

utils/                  # Helper functions and utilities
constants/              # App-wide constants and configuration
config/                 # Build and environment configuration
```

### State Management Patterns
- **useWindAlarmReducer**: Centralized state with reducer pattern for complex wind alarm logic
- **useWindData**: Manages wind data fetching, caching, and retry logic
- **useAlarmAudio**: Handles audio state with race condition prevention
- **AsyncStorage**: Persistent storage for user settings and cached data

## Development Guidelines

### When Adding New Features

#### 1. Data & API Integration
- **Wind Data**: All wind-related data flows through `windService.ts`
- **Caching Strategy**: Implement proper caching in `useWindData` hook
- **Error Handling**: Always include fallback data and error recovery
- **Rate Limiting**: Respect WindAlert's API limits and implement backoff strategies

#### 2. User Interface Components
- **Theming**: Use `ThemedText` and `ThemedView` components for consistent styling
- **Platform Differences**: Handle iOS/Android differences in `ui/` directory
- **Accessibility**: Include proper accessibility labels and roles
- **Performance**: Use React.memo and useMemo for expensive operations

#### 3. Audio & Alarms
- **Audio Management**: Use `alarmAudioService.ts` to prevent race conditions
- **Background Processing**: Handle app state changes and background execution
- **Permission Handling**: Request necessary permissions for audio playback
- **Platform Audio**: Account for iOS/Android audio behavior differences

#### 4. Settings & Configuration
- **User Preferences**: Store in AsyncStorage via `storageService.ts`
- **Default Values**: Define sensible defaults for wind thresholds and alarm settings
- **Validation**: Validate user input for wind speed, direction, and time settings
- **Migration**: Handle settings migration when adding new configuration options

### Code Quality Standards

#### React Native Best Practices
- **Expo Compatibility**: Ensure all features work with Expo managed workflow
- **Performance**: Use FlatList for large datasets, optimize re-renders
- **Memory Management**: Clean up timers, subscriptions, and event listeners
- **Testing**: Add unit tests for business logic in `__tests__/` directory

#### TypeScript Standards
- **Type Safety**: Define proper interfaces for wind data, settings, and API responses
- **Strict Mode**: Follow strict TypeScript configuration in `tsconfig.json`
- **Error Types**: Use proper error typing for catch blocks and error boundaries
- **Component Props**: Define clear prop interfaces for all components

#### Error Handling Strategy
```typescript
// Use the established error handling pattern
try {
  // Feature implementation
} catch (error) {
  // Log error for debugging
  console.error('Feature error:', error);
  
  // Report to crash monitor
  crashMonitor.reportError(error, 'feature-context');
  
  // Provide fallback behavior
  return fallbackValue;
}
```

### Wind Sports Domain Knowledge

#### Wind Analysis Concepts
- **Dawn Patrol Window**: 3am-5am critical analysis period
- **Verification Window**: 6am-8am for prediction validation
- **Wind Direction**: Onshore vs offshore preferences for different sports
- **Consistency**: Steady winds vs gusty conditions
- **Trend Analysis**: Increasing/decreasing patterns throughout morning

#### Soda Lake Specific Considerations
- **Location**: Soda Lake Dam 1, Colorado
- **Elevation Effects**: High altitude wind patterns
- **Seasonal Variations**: Different thresholds for winter vs summer
- **Local Weather**: Mountain/valley wind effects

### Common Feature Patterns

#### Adding New Wind Criteria
```typescript
// 1. Update types in windService.ts
interface WindCriteria {
  minSpeed: number;
  maxSpeed: number;
  // Add new criteria
  newCriterion: number;
}

// 2. Update settings UI in settings.tsx
// 3. Update analysis logic in useWindAnalyzer.ts
// 4. Add validation in windService.ts
```

#### Adding New Alarm Features
```typescript
// 1. Extend alarm state in useWindAlarmReducer.ts
// 2. Update audio service if needed
// 3. Add UI controls in appropriate tab
// 4. Handle persistence in storageService.ts
```

#### Adding Data Visualization
```typescript
// 1. Create new chart component in components/
// 2. Use react-native-chart-kit library (already included)
// 3. Format data in custom hook
// 4. Handle loading states and errors
```

### Testing Strategy

#### Unit Testing
- Test business logic in services and hooks
- Mock external dependencies (WindAlert API)
- Test error scenarios and edge cases
- Use `__tests__/` directory structure

#### Integration Testing
- Test complete user workflows
- Test alarm functionality end-to-end
- Test data persistence and recovery
- Test across different platform conditions

### Build & Deployment

#### Local Development
```bash
# Start development server
npm start

# Lint and type check
npm run lint
```

#### Production Builds
- Builds are handled by GitHub Actions workflows
- Never build locally for production
- EAS Build configuration in `eas.json`
- Keystore management for Android builds

### Documentation Requirements

#### Feature Documentation
- Update `docs/ARCHITECTURE.md` for architectural changes
- Add feature-specific documentation to `docs/` directory
- Update README.md for user-facing features
- Document any new configuration options

#### Code Documentation
- Use JSDoc comments for complex functions
- Document wind analysis algorithms
- Include usage examples for new hooks or services
- Document any platform-specific behavior

### Common Pitfalls to Avoid

#### Performance Issues
- Don't fetch wind data too frequently (respect API limits)
- Avoid creating new objects in render loops
- Use proper memoization for expensive calculations
- Handle memory leaks in audio and timers

#### Platform Compatibility
- Test audio functionality on both iOS and Android
- Handle different permission models
- Account for background app behavior differences
- Test with different screen sizes and orientations

#### Data Consistency
- Always validate wind data format from external sources
- Handle network failures gracefully
- Implement proper data migration for settings changes
- Cache critical data for offline scenarios

#### User Experience
- Provide clear feedback for all user actions
- Handle loading states appropriately
- Make all wind criteria configurable
- Ensure alarm reliability across app states

## Feature Request Workflow

1. **Analysis**: Understand wind sports domain impact
2. **Architecture**: Plan integration with existing services
3. **Implementation**: Follow established patterns and error handling
4. **Testing**: Cover edge cases and platform differences
5. **Documentation**: Update relevant docs and add examples
6. **Review**: Ensure no hardcoded values, proper error handling, and performance optimization

Remember: This app helps people make early morning decisions about wind sports. Reliability, accuracy, and user experience are paramount. Every feature should contribute to better dawn patrol decision-making.
