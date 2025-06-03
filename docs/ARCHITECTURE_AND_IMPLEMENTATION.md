# Architecture & Implementation

This document provides a comprehensive overview of the Dawn Patrol Alarm application's architecture and implemented features.

## Table of Contents
1. [System Architecture](#system-architecture)
    - [Architectural Overview](#architectural-overview)
    - [System Layers](#system-layers) 
    - [Data Flow](#data-flow)
2. [Core Services](#core-services)
3. [User Interface](#user-interface)
4. [Implemented Features](#implemented-features)
5. [Technical Decisions](#technical-decisions)

---

## System Architecture

### Architectural Overview

The Dawn Patrol Alarm is a React Native/Expo application that follows a **service-oriented architecture** with clear separation of concerns between data management, UI components, and system services.

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Tabs     │    │   Screens   │    │  Components │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                       Business Logic                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Hooks    │    │   Reducers  │    │  Analyzers  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                       Service Layer                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  API Client │    │   Storage   │    │System Services│    │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### System Layers

The application is divided into three main layers:

1. **UI Layer**
   - React components organized using Expo Router
   - Functional components with hooks
   - Shared UI components for consistent styling

2. **Business Logic Layer**
   - Custom React hooks for data management
   - Reducers for complex state management
   - Analysis algorithms for wind data

3. **Service Layer**
   - API clients for external data sources
   - Storage services for local persistence
   - System-level services (alarms, notifications)

### Data Flow

```
┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│  Data Source │ ──▶ │  Services     │ ──▶ │    Hooks    │
│  (WindAlert) │     │ (windService) │     │(useWindData)│
└──────────────┘     └───────────────┘     └─────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│    UI        │ ◀── │   Analysis    │ ◀── │   Reducer   │
│  Components  │     │   Results     │     │    State    │
└──────────────┘     └───────────────┘     └─────────────┘
```

## Core Services

### Wind Data Services

The wind data pipeline consists of:

- **windService.ts**: Fetches and transforms data from WindAlert API
- **useWindData.ts**: React hook that manages wind data state
- **useWindAnalyzer.ts**: Analyzes wind patterns for alarm decisions
- **useWindAlarmReducer.ts**: Manages complex wind alarm state

### Storage Services

- **storageService.ts**: Abstracts AsyncStorage operations
- Implements caching, error handling, and type safety

### System Services

- **alarmAudioService.ts**: Handles alarm sound playback
- **crashMonitor.ts**: Monitors app stability
- **diagnosticService.ts**: Provides diagnostic tools

## User Interface

### Navigation Structure

The app uses Expo Router v2 with the following structure:

- **/**: Home tab with main wind analysis
- **/settings**: App settings and configuration
- **/standley-lake**: Standley Lake wind monitor
- **/test-alarm**: Developer tool to test alarm functionality

### Key Components

- **WindChart.tsx**: Visualizes wind data with interactive chart
- **WindDataDisplay.tsx**: Shows key wind metrics
- **AlarmImplementationComparison.tsx**: Compares analysis methods

## Implemented Features

### Core Features

- **Wind Data Services**
  - Fetches data from WindAlert API (endpoint: Soda Lake Dam 1)
  - Converts kph to mph and processes data
  - Analyzes 3am-5am alarm window and 6am-8am verification window
  - Configurable alarm criteria with sensible defaults
  - Offline caching with AsyncStorage and fallback data

- **UI Components**
  - Interactive wind chart with selection capability
  - Responsive design with light/dark mode support
  - Tabbed interface with smooth navigation
  - Day selector with historical data access

- **User Settings**
  - Configurable wind thresholds (min speed, consistency)
  - Direction preference settings
  - Custom alarm settings

- **Analysis System**
  - Smart algorithm to detect favorable conditions
  - Verification system using later window data
  - Statistical analysis for consistency detection

### Stability Features

- **Crash Recovery System**
  - White screen detection and recovery
  - Detailed crash reporting
  - Self-healing mechanisms

- **Offline Support**
  - Cached data availability
  - Graceful degradation when offline
  - Background data synchronization

### Additional Features

- **Standley Lake Wind Monitor**
  - Integration with Ecowitt weather stations
  - Custom analysis for Standley Lake conditions
  - Configurable API settings

- **Developer Tools**
  - Debug console with detailed logging
  - Performance monitoring
  - Test suite for wind analysis algorithms

## Technical Decisions

### Technology Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development toolchain and build services
- **TypeScript**: Type safety and improved developer experience
- **Expo Router**: File-based navigation system
- **AsyncStorage**: Local data persistence
- **React Hooks**: State management and side effects

### Design Patterns

- **Service Pattern**: Isolating external dependencies
- **Hook Pattern**: Reusable logic with React hooks
- **Reducer Pattern**: Complex state management
- **Provider Pattern**: Context-based state sharing

### Performance Considerations

- **Data Caching**: Minimizing network requests
- **Memoization**: Preventing unnecessary re-renders
- **Lazy Loading**: Loading components on demand
- **Virtualization**: Efficient list rendering

### Security

- **Environment Variables**: Secure API keys handling
- **Input Validation**: Preventing injection attacks
- **Error Handling**: Graceful failure management
- **Secure Storage**: Protecting sensitive user data
