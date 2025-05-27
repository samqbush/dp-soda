# EAS Local Instructions

## Commands
- [production profile](../eas.json)
```shell
## connects app.json to EAS
east init --id XXXX

## Builds android from production profile
eas build --platform android --non-interactive --profile production

## Uploads keystore credentials to EAS
eas credentials --platform android
```

# Local Debug Instructions
```shell
# install new apk
adb install /Users/samquakenbush/Downloads/app-release-universal-with-fixes.apk 

# clear the logs
adb logcat -c
# Launch the app and let it crash
adb logcat -s "ReactNative:*" "ReactNativeJS:*" "AndroidRuntime:*" "System.err:*" "com.samqbush.dpsoda:*" "*:F" "*:E" | tee crash-logs-filtered.log
```