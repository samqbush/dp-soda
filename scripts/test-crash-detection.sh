#!/bin/zsh

# Crash Analysis and Build Script
# Bear Creek Lake Wind Analyzer - Enhanced Crash Detection

echo "🛡️ Wind Analyzer - Enhanced Crash Detection Build"
echo "================================================="
echo ""

# Set the working directory to the project root
cd "$(dirname "$0")/.."

# Function to check if a file exists and print status
check_file() {
    if [[ -f "$1" ]]; then
        echo "✅ $1"
    else
        echo "❌ Missing: $1"
        return 1
    fi
}

echo "🔍 Checking Enhanced Crash Detection System..."
echo ""

# Check critical crash detection files
CRASH_DETECTION_FILES=(
    "services/globalCrashHandler.ts"
    "components/GlobalCrashRecovery.tsx"
    "components/DataCrashDetector.tsx"
    "services/crashMonitor.ts"
    "docs/CRASH_RECOVERY_GUIDE.md"
)

echo "📁 Critical Files:"
MISSING_FILES=0
for file in "${CRASH_DETECTION_FILES[@]}"; do
    if ! check_file "$file"; then
        ((MISSING_FILES++))
    fi
done

if [[ $MISSING_FILES -gt 0 ]]; then
    echo ""
    echo "❌ Missing $MISSING_FILES critical files. Cannot proceed with build."
    exit 1
fi

echo ""
echo "🔍 Code Quality Checks..."

# TypeScript check
echo -n "📘 TypeScript compilation: "
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✅ Passed"
else
    echo "❌ Failed"
    echo "   Run 'npx tsc --noEmit' to see errors"
    exit 1
fi

# Lint check
echo -n "🧹 ESLint check: "
if npm run lint > /dev/null 2>&1; then
    echo "✅ Passed"
else
    echo "❌ Failed"
    echo "   Run 'npm run lint' to see issues"
    exit 1
fi

echo ""
echo "🛡️ ENHANCED CRASH DETECTION FEATURES:"
echo "======================================"
echo "✅ Global crash handler (initialized at app startup)"
echo "✅ Component-level error boundaries with recovery UI"
echo "✅ Emergency data clearing after persistent crashes"
echo "✅ Multi-layer crash logging and analysis"
echo "✅ Real-time crash monitoring with diagnostic info"
echo "✅ Debug crash testing tools"
echo "✅ Comprehensive recovery screens and options"
echo ""

echo "🔨 Building APK with Enhanced Crash Detection..."
echo ""

# Clean build environment
echo "🧽 Cleaning build environment..."
npx expo prebuild --clean > /dev/null 2>&1

# Build the APK
echo "📱 Building Android APK..."
npx eas build --platform android --profile preview --local

BUILD_RESULT=$?

echo ""
echo "🧪 TESTING PROTOCOL:"
echo "==================="
echo ""
echo "📋 STEP 1: Installation & Initial Launch"
echo "1. Install APK on Android device"
echo "2. Open app and immediately check console for:"
echo "   - '🛡️ Global crash handler initialized'"
echo "   - '🚀 App initialization starting'"
echo "   - '✅ Storage initialization successful'"
echo ""
echo "📋 STEP 2: Normal Operation Test"
echo "1. Let app fully load past splash screen"
echo "2. Wait for wind data to load"
echo "3. Navigate between tabs"
echo "4. Check for any crashes during normal use"
echo ""
echo "📋 STEP 3: If Crashes Occur"
echo "1. IMMEDIATELY note the timing (splash, data load, chart render)"
echo "2. Look for crash recovery screens:"
echo "   - Global Crash Recovery (full-screen overlay)"
echo "   - Component Crash Recovery (smaller dialog)"
echo "3. Try recovery options: Try Again → Show Details → Clear Data"
echo "4. Check console for crash detection logs (🚨 markers)"
echo ""
echo "📋 STEP 4: Debug Testing (Development Mode)"
echo "1. Look for debug panel in top-right corner"
echo "2. Use '🧪 Test Crash' button to verify recovery works"
echo "3. Confirm crash recovery screens appear for test crashes"
echo ""
echo "🚨 CRITICAL: What to Report"
echo "=========================="
echo ""
echo "IF RECOVERY SCREENS APPEAR:"
echo "✅ Great! The crash detection is working"
echo "📝 Report: crash details, recovery options tried, success/failure"
echo ""
echo "IF NO RECOVERY SCREENS APPEAR:"
echo "❌ Crashes are happening at lower level than expected"
echo "📝 Report: exact timing, console output, device behavior"
echo ""
echo "🔍 Console logs to look for:"
echo "   - Initialization: '🛡️ Global crash handler initialized'"
echo "   - Crashes: '🚨 Global crash detected' or '🚨 CrashMonitor'"
echo "   - Recovery: '🚨 Emergency recovery completed'"
echo ""

if [[ $BUILD_RESULT -eq 0 ]]; then
    echo "✅ BUILD SUCCESSFUL!"
    echo ""
    echo "🎯 Next: Install APK and follow testing protocol above"
    echo "📱 APK location: Check EAS CLI output for download link"
else
    echo "❌ BUILD FAILED!"
    echo "🔧 Check build logs above for errors"
    exit $BUILD_RESULT
fi
