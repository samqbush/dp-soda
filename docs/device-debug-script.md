# Ecowitt Device Discovery Script

This script helps identify which Ecowitt weather devices are available in your account, so you can choose the right one for Standley Lake monitoring.

## Usage

```bash
npm run debug-devices
```

Or run directly:
```bash
node scripts/debug-ecowitt-devices.mjs
```

## What It Does

1. **Tests API connectivity** - Shows raw API response structure
2. **Lists all devices** - Displays device name, MAC address, model, and online status  
3. **Shows current selection logic** - Explains which device would be automatically chosen
4. **Provides recommendations** - Suggests improvements based on your device list

## Expected Output (When API Works)

```
🔍 ECOWITT DEVICE DISCOVERY SCRIPT
==================================================
✅ Loaded API configuration from environment variables

📡 Step 1: Raw API Debug (shows full API response structure)
------------------------------
📊 DEBUG: Raw API response data: { ... }

📱 Step 2: Parsed Device List
------------------------------
✅ Found 2 device(s):

📟 Device #1:
   Name: Standley Lake Weather Station
   MAC: AA:BB:CC:DD:EE:FF
   Model: WS2902C
   Online: 🟢 Yes

📟 Device #2:
   Name: Home Weather Station
   MAC: 11:22:33:44:55:66
   Model: WS2032A
   Online: 🟢 Yes

🎯 CURRENT SELECTION LOGIC:
------------------------------
✅ Currently selecting first ONLINE device: "Standley Lake Weather Station"

💡 RECOMMENDATIONS:
------------------------------
🤔 Multiple devices found. Consider:
   1. Which device is physically located at Standley Lake?
   2. Should we prefer online devices or a specific device by name/model?
   3. Should we allow user selection in the app?

   🏷️ Devices with location-related names:
      - "Standley Lake Weather Station" (online)
```

## When API is Down (Current Issue)

If you see messages about "502 Bad Gateway" or "API SERVER ERROR", the Ecowitt API is temporarily unavailable. This is a server-side issue, not a problem with your configuration.

**What to do:**
1. Wait 1-2 hours and try again
2. Check Ecowitt's status or support channels
3. Test API recovery manually with curl

## Using the Results

Once you can see your device list:

1. **Identify the Standley Lake device** - Look for device names that mention the location
2. **Note the MAC address** - You may want to hardcode this for reliable selection
3. **Check online status** - Ensure the device is consistently online
4. **Update device selection logic** - Implement smarter device choosing in the app

## Troubleshooting

### Missing API Credentials
```
❌ Missing required environment variables:
   - ECOWITT_APPLICATION_KEY
   - ECOWITT_API_KEY
```
**Fix:** Make sure your `.env` file contains valid Ecowitt API credentials.

### Network Issues
```
❌ Network connection failed
```
**Fix:** Check your internet connection and try again.

### Invalid Credentials
```
❌ Invalid API credentials for device list
```
**Fix:** Verify your API keys are correct in the `.env` file.

## Files Modified by This Analysis

- `scripts/debug-ecowitt-devices.mjs` - The device discovery script
- `docs/ecowitt-device-selection-analysis.md` - Detailed analysis and recommendations  
- `scripts/README-device-debug.md` - This usage guide
