#!/bin/bash

# OpenWeatherMap API Key Troubleshooting Script

echo "🔧 OPENWEATHERMAP API KEY TROUBLESHOOTING"
echo "========================================"
echo ""

# Check if API key exists in environment
if [ -z "$OPENWEATHER_API_KEY" ]; then
    echo "❌ No OPENWEATHER_API_KEY found in environment"
    echo "💡 Make sure to set the environment variable"
    exit 1
fi

echo "🔑 API Key found: ${OPENWEATHER_API_KEY:0:8}...${OPENWEATHER_API_KEY: -4}"
echo ""

# Test the API key
echo "🧪 Testing API key with simple request..."
echo ""

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  "https://api.openweathermap.org/data/2.5/weather?q=London&appid=$OPENWEATHER_API_KEY")

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ API KEY IS WORKING!"
    echo "🌤️  Successfully retrieved weather data"
    echo ""
    echo "Sample response:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
elif [ "$http_code" -eq 401 ]; then
    echo "❌ INVALID API KEY"
    echo ""
    echo "Common causes:"
    echo "1. 🕐 New API key not activated yet (wait 10-60 minutes)"
    echo "2. 📝 Typo in the API key"
    echo "3. 🚫 API key disabled or expired"
    echo "4. 🔑 Wrong API key (free vs paid tiers)"
    echo ""
    echo "Steps to fix:"
    echo "1. Go to https://home.openweathermap.org/api_keys"
    echo "2. Verify your API key is correct and active"
    echo "3. If new, wait up to 1 hour for activation"
    echo "4. Generate a new API key if needed"
    echo ""
    echo "API Response:"
    echo "$body"
elif [ "$http_code" -eq 429 ]; then
    echo "⚠️  RATE LIMIT EXCEEDED"
    echo "Your API key is valid but you've hit the rate limit"
    echo "Wait a few minutes and try again"
else
    echo "❌ UNEXPECTED ERROR (HTTP $http_code)"
    echo "Response: $body"
fi

echo ""
echo "🔗 Useful links:"
echo "   • API Keys: https://home.openweathermap.org/api_keys"
echo "   • FAQ: https://openweathermap.org/faq#error401"
echo "   • Account: https://home.openweathermap.org/"
