# Dawn Patrol - Wind Monitor

A wind monitoring app for Colorado lakes (Soda Lake, Standley Lake, Boulder Reservoir) that helps you decide whether it's worth heading out for water sports based on real-time wind conditions from Ecowitt weather stations.

## Features

- **Real-time Wind Monitoring**: Live wind speed and direction from Ecowitt weather stations
- **Multi-Station Support**: Soda Lake, Standley Lake, and Boulder Reservoir tabs
- **Custom Wind Charts**: SVG charts with horizontal scrolling, gap handling, and time labels
- **Configurable Thresholds**: Set your minimum wind speed for visual threshold indicators
- **Transmission Quality**: Detects antenna issues and explains data gaps
- **Wind Guru (Experimental)**: Advanced katabatic wind predictions (server migration in progress)

## Tabs

| Tab | Description |
|-----|-------------|
| **Soda Lake** (Home) | Real-time wind at Soda Lake Dam 1 |
| **Standley Lake** | Real-time wind at Standley Lake |
| **Boulder Res** | Real-time wind at Boulder Reservoir |
| **Wind Guru** | Experimental predictions (disabled by default, enable in Settings) |
| **Settings** | Threshold config, Wind Guru toggle, app info |

## Getting Started

### Download

- Private link (contact repo owner)

### Using the App

1. **View wind conditions** — open the app and select your lake tab
2. **Pull to refresh** — swipe down to get latest data
3. **Set your threshold** — go to Settings → Wind Display → adjust minimum wind speed
4. **Check charts** — scroll horizontally to see wind history throughout the day

### Settings

- **Wind Threshold**: Minimum wind speed (mph) shown as a reference line on charts
- **Wind Guru Toggle**: Enable/disable the experimental prediction tab

## Transmission Quality Indicators

Weather stations can experience antenna issues that cause data gaps:

- 🟢 **Good** — All sensors transmitting normally
- 🟡 **Partial** — Some sensors missing data
- 🟠 **Indoor-only** — Antenna issue (only indoor sensors reporting)
- 🔴 **Offline** — No data being received

The app distinguishes between "no wind" and "station can't transmit" so you always know what's happening.

## CI/CD

Builds run automatically via GitHub Actions on push to `main`. See [Developer Setup](docs/developer-setup.md) for details.

## Documentation

- 📖 **[README](README.md)** — User-facing features (this file)
- 👨‍💻 **[Developer Setup](docs/developer-setup.md)** — Build, deploy, and contribute
- 🏗️ **[Architecture](docs/architecture.md)** — Technical system design

## Coming Soon

- Push notifications for ideal wind conditions
- Server-powered Wind Guru predictions

## Contact & Support

For questions or feature requests, open a GitHub issue in this repository.

