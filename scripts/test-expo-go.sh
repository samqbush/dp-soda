#!/bin/bash

# Expo Go Testing Script with Crash Detection
# This script starts the Expo development server for testing with Expo Go

set -e

echo "🧪 Starting Expo Go testing with crash detection enabled..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}📱 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    print_error "This script must be run from the root of your Expo project"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Pre-flight checks
print_status "Running pre-flight checks..."

# Check for TypeScript errors
print_status "Checking TypeScript..."
if ! npx tsc --noEmit; then
    print_warning "TypeScript errors found, but continuing with Expo Go testing..."
fi

# Ensure crash detection is enabled
print_status "Enabling crash detection for Expo Go testing..."

# Set environment variables for enhanced debugging in Expo Go
export EXPO_DEBUG=1
export REACT_NATIVE_ENABLE_LOGS=1

print_success "Crash detection features enabled:"
echo "- 🚨 Production crash detector (background logging)"
echo "- 📱 Android crash logger (visual indicator)"
echo "- 🔧 APK diagnostics (system health checks)"
echo "- 📊 User action tracking"
echo "- 🔄 Error boundaries with recovery"
echo ""

print_status "Starting Expo development server..."
echo ""
echo "📋 Testing Instructions for Expo Go:"
echo "1. Scan the QR code with Expo Go app on your Android device"
echo "2. Wait for the app to load"
echo "3. Look for debug tools in the top-right corner:"
echo "   - 🚨 Crash Logger (colored circle)"
echo "   - 🔧 Diagnostics (blue circle)"
echo "4. If crashes occur:"
echo "   - Tap the crash logger to view crash history"
echo "   - Tap diagnostics to run system health checks"
echo "   - Shake device to open Expo Go debug menu"
echo ""
echo "🔍 Debug Features Available:"
echo "- Real-time crash detection and logging"
echo "- System diagnostics (AsyncStorage, memory, network)"
echo "- User action tracking"
echo "- Export crash data functionality"
echo "- Recovery mechanisms"
echo ""

# Check if tunnel is requested
if [[ "$1" == "--tunnel" || "$1" == "-t" ]]; then
    print_status "Starting with tunnel for better device connectivity..."
    npx expo start --tunnel
else
    print_status "Starting with local network (use --tunnel if connection issues)"
    npx expo start
fi
