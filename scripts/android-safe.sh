#!/bin/bash

# Android Safe Start Script
# Automatically starts emulator if needed, then runs the Android app

echo "🤖 Starting Android Development Session"
echo "======================================"

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set compatibility variables
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Function to check if emulator is running
check_emulator() {
    adb devices 2>/dev/null | grep -q "emulator.*device"
}

# Function to start emulator
start_emulator() {
    echo "🚀 Starting Android emulator..."
    
    # Get list of available AVDs
    avds=$(emulator -list-avds)
    
    if [ -z "$avds" ]; then
        echo "❌ No Android Virtual Devices found!"
        echo "Please create an AVD in Android Studio first."
        exit 1
    fi
    
    # Use first available AVD
    first_avd=$(echo "$avds" | head -n 1)
    echo "📱 Starting emulator: $first_avd"
    
    # Start emulator in background
    emulator -avd "$first_avd" &
    emulator_pid=$!
    
    echo "⏳ Waiting for emulator to boot..."
    
    # Wait for emulator to be ready (max 120 seconds)
    timeout=120
    while [ $timeout -gt 0 ]; do
        if check_emulator; then
            echo "✅ Emulator is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
        echo "   Waiting... ($timeout seconds remaining)"
    done
    
    if [ $timeout -le 0 ]; then
        echo "❌ Emulator failed to start within 120 seconds"
        kill $emulator_pid 2>/dev/null
        exit 1
    fi
}

# Check current state
echo "🔍 Checking Android development environment..."

if check_emulator; then
    echo "✅ Android emulator is already running"
else
    echo "⚠️  No Android emulator detected"
    start_emulator
fi

# Show connected devices
echo ""
echo "📱 Connected devices:"
adb devices

echo ""
echo "🚀 Starting Expo Android development..."
echo "   (Press Ctrl+C to stop)"

# Start the React Native development server
exec expo run:android
