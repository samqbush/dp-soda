# Ecowitt Device Selection Analysis

## Current Status (June 8, 2025)

🚨 **API STATUS**: The Ecowitt API is currently returning 502 Bad Gateway errors, which explains why your device discovery script was hanging.

```
GET /api/v3/device/list HTTP/2
< HTTP/2 502 
< server: ESA
< content-type: text/html
```

## Current Device Selection Logic

Based on the code analysis, here's how device selection currently works:

### In `ecowittService.ts` - `getDeviceMacAddress()` function:

```typescript
// 1. Check for cached MAC address (24-hour cache)
const cachedMacData = await AsyncStorage.getItem(DEVICE_MAC_STORAGE_KEY);

// 2. If no cache or expired, fetch device list
const devices = await fetchEcowittDeviceList();

// 3. Selection logic (CURRENT APPROACH):
let selectedDevice = devices.find(device => device && device.online);
if (!selectedDevice) {
  selectedDevice = devices[0]; // Fallback to first device
}
```

### Current Selection Priority:
1. **First online device** found in the list
2. **First device in list** if no devices are online

## Problems with Current Approach

1. **Non-deterministic**: The "first online device" could change day-to-day
2. **No location awareness**: Doesn't consider which device is actually at Standley Lake
3. **No user preference**: Users can't choose their preferred device
4. **Cache issues**: If wrong device gets cached, it stays wrong for 24 hours

## Recommended Improvements

### Option 1: Smart Device Selection (Recommended)
```typescript
function selectBestDevice(devices: EcowittDevice[]): EcowittDevice {
  // 1. Look for devices with location-related names
  const locationDevices = devices.filter(d => 
    d.name && (
      d.name.toLowerCase().includes('standley') ||
      d.name.toLowerCase().includes('lake') ||
      d.name.toLowerCase().includes('wind') ||
      d.name.toLowerCase().includes('weather')
    )
  );
  
  // 2. Prefer online location devices
  const onlineLocationDevices = locationDevices.filter(d => d.online);
  if (onlineLocationDevices.length > 0) {
    return onlineLocationDevices[0];
  }
  
  // 3. Fallback to any location device
  if (locationDevices.length > 0) {
    return locationDevices[0];
  }
  
  // 4. Original logic as final fallback
  const onlineDevices = devices.filter(d => d.online);
  return onlineDevices.length > 0 ? onlineDevices[0] : devices[0];
}
```

### Option 2: User Device Selection
Add a settings screen where users can:
- View all available devices
- Select their preferred device for Standley Lake
- See device status (online/offline)
- Override automatic selection

### Option 3: Multiple Device Support
Allow monitoring multiple devices and let users switch between them or show combined data.

## Debug Script Output (When API Works)

When the API is functioning, your debug script will show:

```
📟 Device #1:
   Name: [Device Name]
   MAC: [MAC Address] 
   Model: [Device Model]
   Online: 🟢 Yes / 🔴 No
   
📟 Device #2:
   [Additional devices...]
```

This will help you:
1. **Identify device names** - Look for any that mention Standley Lake, wind, or weather
2. **Check device status** - See which devices are consistently online
3. **Note MAC addresses** - For hardcoding specific device selection if needed

## Next Steps

1. **Wait for API recovery**: Try the debug script again in a few hours
2. **Document device names**: When API works, note which device is at Standley Lake
3. **Implement smart selection**: Update the device selection logic based on findings
4. **Add user controls**: Consider adding device selection to app settings

## Temporary Workaround

If you know the MAC address of the Standley Lake device, you can temporarily hardcode it:

```typescript
// In ecowittConfig.ts - add this temporarily
export const STANDLEY_LAKE_DEVICE_MAC = 'YOUR_KNOWN_MAC_ADDRESS';

// In ecowittService.ts - modify getDeviceMacAddress()
export async function getDeviceMacAddress(): Promise<string> {
  // Temporary hardcode while API selection is improved
  if (STANDLEY_LAKE_DEVICE_MAC) {
    return STANDLEY_LAKE_DEVICE_MAC;
  }
  
  // ... existing logic
}
```

## API Recovery Check

You can check if the API is back online with:
```bash
curl -s "https://api.ecowitt.net/api/v3/device/list?application_key=YOUR_KEY&api_key=YOUR_KEY&call_back=device"
```

When you get JSON instead of HTML 502 error, the API is working again.
