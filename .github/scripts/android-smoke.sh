#!/usr/bin/env bash
# Android native smoke test, run by the android-smoke job inside
# reactivecircus/android-emulator-runner (which executes each `script:` line in
# its own shell, hence a separate file).
#
# Usage: android-smoke.sh <new-apk> <app-version> [previous-release-apk]
#
# With a previous-release APK: install it, change a setting, upgrade in place to
# the new APK (same signing key, so this mirrors a store update), then run the
# smoke flow and confirm the setting survived. Without one: fresh install only.
set -euo pipefail

NEW_APK="$1"
APP_VERSION="$2"
PREV_APK="${3:-}"
APP_ID=com.samqbush.dpsoda
OUT=maestro-output

mkdir -p "$OUT"
adb wait-for-device

# A freshly booted CI emulator often raises "Pixel Launcher isn't responding",
# which covers the app and fails every assertion. Suppress ANR/crash dialogs
# and dismiss any already showing before each flow.
adb shell settings put global hide_error_dialogs 1
close_dialogs() { adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null; }
close_dialogs
adb uninstall "$APP_ID" >/dev/null 2>&1 || true

if [ -n "$PREV_APK" ]; then
  echo "📦 Installing previous release: $PREV_APK"
  adb install "$PREV_APK"
  close_dialogs
  maestro test --test-output-dir "$OUT/upgrade-before" .maestro/upgrade-before.yaml

  echo "⬆️ Upgrading in place to $NEW_APK"
  adb install -r "$NEW_APK"
else
  echo "ℹ️ No previous release APK; testing a fresh install only"
  adb install "$NEW_APK"
fi

close_dialogs
maestro test --test-output-dir "$OUT/smoke" -e APP_VERSION="$APP_VERSION" .maestro/smoke.yaml

# Google Play's memory vital is anonymous RSS + swap, with bad-behavior
# thresholds enforced from February 2027. Record it while the app is still in
# the foreground after visiting every tab. Informational only: never fails the job.
log_memory() {
  local pid
  pid=$(adb shell pidof "$APP_ID" | tr -d '\r' || true)
  if [ -z "$pid" ]; then
    echo "⚠️ $APP_ID is not running after the smoke flow; memory not measured"
    return
  fi
  adb shell "grep -E '^(RssAnon|VmSwap):' /proc/$pid/status" | tr -d '\r' \
    || echo "⚠️ Could not read /proc/$pid/status; memory not measured"
}
log_memory | tee "$OUT/memory.txt"
{
  echo "### Android memory after smoke flow (foreground)"
  echo '```'
  cat "$OUT/memory.txt"
  echo '```'
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

if [ -n "$PREV_APK" ]; then
  close_dialogs
  maestro test --test-output-dir "$OUT/upgrade-after" .maestro/upgrade-after.yaml
fi
