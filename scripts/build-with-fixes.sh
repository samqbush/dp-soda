#!/bin/bash

echo "🔧 Building Wind Trend Analyzer with Enhanced Crash Detection & White Screen Fixes"
echo "================================================================================"
echo ""
echo "🛡️ NEW: Multi-layer crash detection system added!"
echo "🔧 Includes all previous white screen fixes"
echo ""
echo "ℹ️  Note: The same fixes are also integrated into"
echo "   the GitHub Actions workflow (.github/workflows/build.yml)"
echo "   You can push to main branch to trigger an automatic build."
echo ""

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

echo "1. Cleaning previous builds..."
npx expo install --fix
rm -rf node_modules/.cache
rm -rf .expo

echo "2. Installing dependencies..."
npm install

echo "3. Running lint check..."
npm run lint

echo "4. Testing local start..."
echo "   Starting Expo development server to test locally first..."
echo "   (Press Ctrl+C to continue to build once you've tested)"
npm start

echo ""
echo "5. Now building for Android..."
echo "   This will create a production build with all white screen fixes"
echo ""
read -p "Press Enter to continue with EAS build, or Ctrl+C to exit..."

npx eas build --platform android --clear-cache

echo "✅ Build complete!"
echo ""
echo "📱 WHITE SCREEN TESTING INSTRUCTIONS:"
echo "======================================"
echo ""
echo "1. Download and install the APK from EAS"
echo "2. Open the app and watch for these progressive recovery features:"
echo ""
echo "   ⏱️  0-3 seconds: Normal loading with spinner"
echo "   🔍 3-5 seconds: White Screen Detective panel appears (top-left)"
echo "   🐛 5-8 seconds: Debug panel appears (top-right)"
echo "   🔄 8-12 seconds: 'Force Reload' button appears"
echo "   🆘 12+ seconds: 'Emergency Recovery' button appears"
echo ""
echo "3. If you see a white screen:"
echo "   - Wait for the diagnostic tools to appear"
echo "   - Check the White Screen Detective for specific issues"
echo "   - Use the Debug panel to see technical details"
echo "   - Try the Force Reload button if available"
echo "   - Use Emergency Recovery as a last resort"
echo ""
echo "🔧 KEY FIXES IMPLEMENTED:"
echo "- Disabled React Native new architecture (newArchEnabled: false)"
echo "- Enhanced timeout and recovery mechanisms"
echo "- Comprehensive debugging tools"
echo "- Progressive recovery system"
echo "- Emergency recovery options"
echo "- Improved Android-specific handling"
echo "- Better AsyncStorage initialization"
echo "- Memory and execution monitoring"
echo "- Advanced crash detection and monitoring"
echo "- Component-level error boundaries with recovery"
echo "- Chart rendering error handling"
echo ""
echo "📝 Please report what you see:"
echo "1. Does the app load normally now?"
echo "2. If not, what does the White Screen Detective show?"
echo "3. What appears in the Debug panel?"
echo "4. Do the recovery options work?"
echo ""
echo "🤖 GitHub Actions Alternative:"
echo "Push to the main branch to trigger an automatic build"
echo "with the same white screen fixes integrated into CI/CD."
