#!/bin/bash

# APK Debug Build Script with Enhanced Crash Detection
# This script builds a debug APK with maximum crash detection and logging capabilities

set -e  # Exit on any error

echo "🚀 Building Android APK with enhanced crash detection..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
if [ ! -f "package.json" ] || [ ! -d "android" ]; then
    print_error "This script must be run from the root of your React Native project"
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf android/app/build/outputs/apk/
rm -rf .expo/

# Install dependencies
print_status "Installing dependencies..."
npm install

# Pre-build checks
print_status "Running pre-build checks..."

# Check for TypeScript errors
print_status "Checking TypeScript..."
if ! npx tsc --noEmit; then
    print_warning "TypeScript errors found, but continuing with build..."
fi

# Build the APK with enhanced debugging
print_status "Building debug APK with crash detection..."

# Set environment variables for enhanced debugging
export REACT_NATIVE_ENABLE_LOGS=1
export EXPO_DEBUG=1

# Build the APK
if npx expo run:android --variant debug; then
    print_success "APK build completed successfully!"
else
    print_error "APK build failed!"
    exit 1
fi

# Find the built APK
APK_PATH=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -1)

if [ -f "$APK_PATH" ]; then
    print_success "APK found at: $APK_PATH"
    
    # Get APK info
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_status "APK size: $APK_SIZE"
    
    # Copy APK to a convenient location
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    OUTPUT_APK="./wind-analyzer-debug-${TIMESTAMP}.apk"
    cp "$APK_PATH" "$OUTPUT_APK"
    print_success "APK copied to: $OUTPUT_APK"
    
    echo ""
    echo "📋 Installation Instructions:"
    echo "1. Transfer the APK to your Android device"
    echo "2. Enable 'Unknown sources' in your device settings"
    echo "3. Install the APK"
    echo "4. If the app crashes, check the crash logger in the top-right corner"
    echo ""
    echo "🔍 Debugging Features Enabled:"
    echo "- Production crash detector"
    echo "- Android crash logger (visible in top-right)"
    echo "- Enhanced error boundaries"
    echo "- AsyncStorage debugging"
    echo "- User action logging"
    echo ""
    echo "📱 If app crashes on startup:"
    echo "1. Reinstall the APK"
    echo "2. Look for the crash logger button (red/orange circle) in top-right"
    echo "3. Tap it to view crash logs"
    echo "4. Use 'Export Logs' to share crash data"
    
else
    print_error "APK not found after build!"
    echo "Expected location: android/app/build/outputs/apk/debug/"
    ls -la android/app/build/outputs/apk/debug/ || echo "Directory doesn't exist"
    exit 1
fi

echo ""
print_success "Build complete! APK ready for testing."
