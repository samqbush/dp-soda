#!/bin/bash

# Visual Data Source Indicator Demo
# Shows what users will see in different scenarios

echo "🎭 VISUAL DATA SOURCE INDICATOR DEMO"
echo "====================================="
echo ""

# Function to show colored output
show_indicator() {
    local color=$1
    local status=$2
    local message=$3
    local bg_color=""
    
    case $color in
        "green") bg_color="\033[42m\033[30m" ;;
        "orange") bg_color="\033[43m\033[30m" ;;
        "red") bg_color="\033[41m\033[37m" ;;
    esac
    
    echo -e "${bg_color} $status \033[0m"
    echo -e "  $message"
    echo ""
}

echo "📱 What Users See in Different Scenarios:"
echo ""

echo "🟢 SCENARIO 1: Good Setup (APIs Configured)"
echo "──────────────────────────────────────────"
show_indicator "green" "🌐 Data Status: Live API Data" "✅ Receiving real-time weather data from OpenWeatherMap API. Predictions are based on current meteorological conditions."
show_indicator "green" "🌐 Live Wind Data (96 points from Soda Lake sensors)" "Real wind measurements from actual sensors"
echo "👤 User thinks: 'Great! I can trust these predictions for dawn patrol.'"
echo ""

echo "🟡 SCENARIO 2: Network Issues (Using Cache)"
echo "───────────────────────────────────────────"
show_indicator "orange" "💾 Data Status: Cached Data" "📱 Using recent weather data from cache (fetched 15 minutes ago). Predictions may be slightly outdated but still reliable."
show_indicator "green" "🌐 Live Wind Data (48 points from Soda Lake sensors)" "Wind data still current, weather data from cache"
echo "👤 User thinks: 'Wind data is live, weather is recent. Still good for planning.'"
echo ""

echo "🔴 SCENARIO 3: Poor Setup (Missing API Key)"
echo "─────────────────────────────────────────────"
show_indicator "red" "⚠️ Data Status: DEMO DATA (NOT REAL)" "🚨 WARNING: This is DEMO DATA for testing purposes only. These are NOT real weather conditions! Configure your OpenWeatherMap API key in settings to see real data."
echo -e "\033[31m🔧 To fix: Add your OpenWeatherMap API key to .env file\033[0m"
echo -e "\033[31m📖 See: docs/OPENWEATHERMAP_SETUP.md for setup instructions\033[0m"
echo "👤 User thinks: 'I need to configure this properly. These aren't real conditions.'"
echo ""

echo "❌ SCENARIO 4: Connection Failed"
echo "─────────────────────────────────"
show_indicator "red" "⚠️ No Wind Data Available" "Check connection or try refresh"
echo "🔄 [Retry Button] 📡 [Real Data Button]"
echo "👤 User thinks: 'Something's wrong with the connection. I need to troubleshoot.'"
echo ""

echo "🎯 KEY BENEFITS:"
echo "═══════════════"
echo "✅ Users never confused about data quality"
echo "✅ Clear visual indicators (color + icons + text)"
echo "✅ Specific actionable instructions when issues occur"
echo "✅ No false confidence from fake data"
echo "✅ Progressive disclosure (summary → details → instructions)"
echo ""

echo "🧭 BEFORE vs AFTER:"
echo "═══════════════════"
echo "❌ BEFORE: Random 'clear skies' predictions that didn't match reality"
echo "❌ BEFORE: No way to tell if data was real or fake"
echo "❌ BEFORE: Wind guru confused by inconsistent predictions"
echo ""
echo "✅ AFTER: Color-coded data source indicators at all times"
echo "✅ AFTER: Clear warnings when demo data is shown"
echo "✅ AFTER: Specific setup instructions when configuration needed"
echo "✅ AFTER: Complete transparency about data quality"
echo ""

echo "🎉 RESULT: No more confusion about mock vs real data!"
