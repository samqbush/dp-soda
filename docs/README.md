# Dawn Patrol Alarm Documentation

Welcome to the Dawn Patrol Alarm documentation! This application analyzes wind conditions at Soda Lake, Colorado to help users make informed decisions about wind sports during dawn patrol hours.

## Quick Start Guide

| I want to... | Go to... |
|--------------|----------|
| **Use the app** | [User Guide](user-guide.md) |
| **Understand wind predictions** | [Wind Prediction Guide](wind-prediction-guide.md) |
| **Set up development** | [Developer Setup](developer-setup.md) |
| **Build and deploy** | [Deployment Guide](deployment.md) |
| **Fix problems** | [Troubleshooting Guide](troubleshooting.md) |
| **Learn the architecture** | [Architecture Guide](architecture.md) |
| **Configure APIs** | [API Integration Guide](api-integration.md) |

## Documentation Overview

### 📱 User Documentation
- **[User Guide](user-guide.md)** - Complete guide for app users
  - How to read predictions and confidence levels
  - Understanding the 4-factor analysis system
  - Tips for successful dawn patrol planning
  
- **[Wind Prediction Guide](wind-prediction-guide.md)** - Deep dive into katabatic wind theory
  - Technical methodology and calculations
  - Verification and accuracy understanding
  - Advanced interpretation strategies

### 👨‍💻 Developer Documentation
- **[Developer Setup](developer-setup.md)** - Complete development environment setup
  - Prerequisites and installation
  - Project structure and workflow
  - Code style guidelines and best practices
  
- **[Architecture Guide](architecture.md)** - Technical system design
  - Service-oriented architecture overview
  - Component patterns and state management
  - Android optimizations and performance considerations
  
- **[API Integration Guide](api-integration.md)** - Weather data sources and setup
  - OpenWeatherMap and Ecowitt configuration
  - Data processing and caching strategies
  - Error handling and fallback systems

### 🚀 Operations Documentation
- **[Deployment Guide](deployment.md)** - Build and release processes
  - GitHub Actions CI/CD workflow
  - Android APK and iOS TestFlight distribution
  - Environment configuration and secrets management
  
- **[Troubleshooting Guide](troubleshooting.md)** - Comprehensive problem solving
  - Android crash recovery and white screen issues
  - API and data problems
  - Performance optimization and debugging tools

## Application Overview

**Dawn Patrol Alarm** is an Expo/React Native application that:

- 🌬️ **Analyzes wind conditions** at Soda Lake (Soda Lake Dam 1), Colorado
- 📊 **Predicts katabatic winds** using advanced meteorological analysis
- ⏰ **Optimizes dawn patrol timing** (6-8 AM optimal window)  
- 📱 **Provides mobile-friendly interface** with dark mode support
- 🔄 **Updates every 30 minutes** for real-time accuracy

### Key Features

- **Real Weather Data**: Integration with OpenWeatherMap API
- **Katabatic Prediction**: 4-factor analysis system with confidence levels
- **Dual-Day Display**: Today's verification + tomorrow's forecast
- **Android Optimization**: Crash detection and white screen recovery
- **Offline Support**: Cached data for reliability

## Tech Stack

- **Framework**: Expo/React Native with TypeScript
- **Navigation**: React Navigation v7
- **State Management**: React hooks with custom reducers
- **APIs**: OpenWeatherMap, Ecowitt (Standley Lake monitoring)
- **Build/Deploy**: GitHub Actions workflow
- **Testing**: Local with `npm start`

## Project Structure

```
app/                    # Main application screens and navigation
components/             # Reusable UI components and utilities
hooks/                  # Custom React hooks for data and state
services/               # API services and data processing
utils/                  # Helper functions and utilities
config/                 # Configuration files
docs/                   # Documentation (you are here!)
```

## Getting Started

### For Users
1. Read the [User Guide](user-guide.md) to understand how to use the app
2. Check the [Wind Prediction Guide](wind-prediction-guide.md) for technical details
3. Review the [Troubleshooting Guide](troubleshooting.md) if you encounter issues

### For Developers
1. Follow the [Developer Setup](developer-setup.md) to configure your environment
2. Study the [Architecture Guide](architecture.md) to understand the system design
3. Reference the [API Integration Guide](api-integration.md) for data source configuration
4. Use the [Deployment Guide](deployment.md) for build and release processes

## Documentation Maintenance

### Recent Reorganization (June 7, 2025)

This documentation was recently reorganized to eliminate sprawl and improve accessibility:

**Before**: 15+ scattered documentation files with overlapping content
**After**: 8 focused guides with clear purposes and cross-references

**Archived Files**: Old documentation moved to `archive/` directory for reference
**New Structure**: Logical organization by user type (users, developers, operations)

### Keeping Documentation Current

- **Update with code changes**: Modify relevant docs when implementing features
- **Cross-reference updates**: Update related guides when changing one file
- **User feedback**: Incorporate feedback to improve clarity and completeness
- **Version documentation**: Note significant changes and update timestamps

## Getting Help

- **Issues**: Report bugs via GitHub Issues
- **Questions**: Check the [Troubleshooting Guide](troubleshooting.md) first
- **Contributing**: See [Developer Setup](developer-setup.md) for contribution guidelines
- **Feature Requests**: Submit through GitHub Issues with detailed descriptions

## Archive

Historical documentation is preserved in the `archive/` directory:
- Previous architecture documents
- Legacy setup guides  
- Feature-specific documentation
- Build and deployment archives

These files remain available for reference but are no longer actively maintained.

---

*Last updated: June 7, 2025 - Documentation reorganization and consolidation*
