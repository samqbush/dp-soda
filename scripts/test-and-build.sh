#!/bin/bash

echo "🧪 Testing White Screen Fixes Locally"
echo "===================================="

cd "$(dirname "$0")/.."

echo "1. Running lint check..."
npm run lint

if [ $? -ne 0 ]; then
    echo "❌ Lint check failed. Please fix errors before building."
    exit 1
fi

echo "✅ Lint check passed"

echo ""
echo "2. Starting development server..."
echo "   This will test the app locally with all white screen fixes enabled"
echo "   Pay attention to:"
echo "   - How quickly the app loads"
echo "   - Whether debugging tools appear"
echo "   - Any console errors or warnings"
echo ""
echo "   Press 'a' to open Android emulator"
echo "   Press 'i' to open iOS simulator"
echo "   Press 'q' to quit and proceed to build"
echo ""

npm start

echo ""
echo "3. Ready to build for production?"
echo "   The production build will include all white screen fixes:"
echo ""
echo "   🔧 Architectural fixes (newArchEnabled: false)"
echo "   🐛 Debugging tools (WhiteScreenDetective, AndroidDebugger)"
echo "   🔄 Progressive recovery (Force Reload, Emergency Recovery)"
echo "   ⏱️  Timeout management (5s, 8s, 12s, 15s intervals)"
echo "   📱 Android optimizations"
echo ""
read -p "Build production APK now? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building production APK with EAS..."
    npx eas build --platform android --clear-cache
else
    echo "Build cancelled. Run './scripts/build-with-fixes.sh' when ready."
fi
