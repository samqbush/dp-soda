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