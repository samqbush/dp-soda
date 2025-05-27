#!/bin/bash

# Enhanced Crash Detection Test Build Script
# For Bear Creek Lake Wind Analyzer

echo "🛡️ Building with Enhanced Crash Detection..."
echo "============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from the project root directory"
    exit 1
fi

echo "📋 Pre-build checks..."

# Check for required files
echo "✅ Checking crash detection files..."
if [ ! -f "services/globalCrashHandler.ts" ]; then
    echo "❌ Missing globalCrashHandler.ts"
    exit 1
fi

if [ ! -f "components/GlobalCrashRecovery.tsx" ]; then
    echo "❌ Missing GlobalCrashRecovery.tsx"
    exit 1
fi

if [ ! -f "components/DataCrashDetector.tsx" ]; then
    echo "❌ Missing DataCrashDetector.tsx"
    exit 1
fi

echo "✅ All crash detection files present"

# Run TypeScript check
echo "🔍 Running TypeScript check..."
if ! npx tsc --noEmit; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo "✅ TypeScript check passed"

# Run lint check
echo "🧹 Running lint check..."
if ! npm run lint; then
    echo "❌ Lint check failed"
    exit 1
fi

echo "✅ Lint check passed"

# Clean and prebuild
echo "🧽 Cleaning and prebuilding..."
npx expo prebuild --clean

# Build the APK
echo "🔨 Building Android APK with crash detection..."
echo ""
echo "🛡️ CRASH DETECTION FEATURES INCLUDED:"
echo "   - Global crash handler for early crashes"
echo "   - Component-level error boundaries"
echo "   - Emergency recovery system"
echo "   - Comprehensive crash logging"
echo "   - Automatic data clearing for persistent issues"
echo ""

# Build command
npx eas build --platform android --profile preview --local

echo ""
echo "🛡️ TESTING INSTRUCTIONS:"
echo "========================"
echo ""
echo "1. Install the APK and open the app"
echo "2. If crashes occur, you should now see:"
echo "   - Global Crash Recovery screen for early crashes"
echo "   - Component crash recovery for React errors"
echo "   - Detailed crash information and recovery options"
echo ""
echo "3. Test the crash detection:"
echo "   - Load data and see if crashes are caught"
echo "   - Try the recovery options (Try Again, Clear Data)"
echo "   - Check if emergency recovery activates after 3+ crashes"
echo ""
echo "4. If you still don't see crash recovery screens:"
echo "   - Check console logs for crash detection initialization"
echo "   - Look for global crash handler messages"
echo "   - Crashes might be happening at an even lower level"
echo ""
echo "5. Debug mode features:"
echo "   - Android Debug panel includes crash test button"
echo "   - Use 'Test Crash' to verify recovery systems work"
echo ""
echo "🚨 If crashes persist without recovery screens showing:"
echo "   - Report the exact timing of crashes (during splash, after data load, etc.)"
echo "   - Note if any console logs appear"
echo "   - Try the emergency data clear option"
echo ""

echo "✅ Build complete with enhanced crash detection!"
