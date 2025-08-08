#!/bin/bash

# Android Setup Script
# Ensures Android emulator is ready before running the app

echo "🤖 Android Development Setup Checker"
echo "===================================="

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set"
    echo "Please set ANDROID_HOME to your Android SDK directory"
    exit 1
fi

echo "✅ ANDROID_HOME: $ANDROID_HOME"

# Set ANDROID_SDK_ROOT for compatibility
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Add Android tools to PATH
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Check if emulator command exists
if ! command -v emulator &> /dev/null; then
    echo "❌ Android emulator not found in PATH"
    echo "Add $ANDROID_HOME/emulator to your PATH"
    exit 1
fi

echo "✅ Android emulator command found"

# Check if adb exists
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found in PATH"
    echo "Add $ANDROID_HOME/platform-tools to your PATH"
    exit 1
fi

echo "✅ ADB command found"

# List available AVDs
echo ""
echo "📱 Available Android Virtual Devices:"
emulator -list-avds

# Check if any devices are already connected
echo ""
echo "🔌 Currently connected devices:"
adb devices

echo ""
echo "✅ Android development environment is ready!"
echo ""
echo "Usage:"
echo "  npm run android-safe   # Start emulator and run app safely"
echo "  npm run android        # Run app (requires emulator to be running)"
