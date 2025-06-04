#!/usr/bin/env bash
# xcode-log-processor.sh
# Processes Xcode build logs to extract only relevant warnings, errors, and important messages
# Usage: ./xcode-log-processor.sh [logfile]

set -e

LOG_FILE=$1
ERROR_FILE="${LOG_FILE}_errors.txt"

if [ -z "$LOG_FILE" ]; then
  echo "Usage: $0 <path-to-log-file>"
  exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
  echo "Error: Log file $LOG_FILE not found"
  exit 1
fi

echo "Processing $LOG_FILE..."
echo "Extracting errors and warnings to $ERROR_FILE"

# Extract only relevant information
{
  echo "=== BUILD SUMMARY ==="
  echo ""

  # Extract error and warning counts
  ERROR_COUNT=$(grep -c "error:" "$LOG_FILE" || echo 0)
  WARNING_COUNT=$(grep -c "warning:" "$LOG_FILE" || echo 0)
  
  echo "Errors: $ERROR_COUNT"
  echo "Warnings: $WARNING_COUNT"
  echo ""

  # Extract fatal errors first - these are the most important
  echo "=== FATAL ERRORS ==="
  grep -B 2 -A 2 "fatal error:" "$LOG_FILE" || echo "None"
  echo ""
  
  # Extract build errors
  echo "=== BUILD ERRORS ==="
  grep -B 2 -A 3 "error:" "$LOG_FILE" | grep -v "warning:" || echo "None"
  echo ""
  
  # Extract specific failure messages
  echo "=== BUILD FAILURES ==="
  grep -A 3 "BUILD FAILED" "$LOG_FILE" || echo "None"
  grep -A 3 "FAILED BUILD" "$LOG_FILE" || echo "None"
  grep -A 3 "Command.*failed" "$LOG_FILE" || echo "None"
  echo ""
  
  # Extract archive failure information
  echo "=== ARCHIVE FAILURES ==="
  grep -A 3 "ARCHIVE FAILED" "$LOG_FILE" || echo "None"
  grep -B 5 -A 5 "The following build commands failed:" "$LOG_FILE" || echo "None"
  echo ""

  # Extract important warnings
  echo "=== SIGNIFICANT WARNINGS ==="
  grep "warning:" "$LOG_FILE" | grep -i -E "deprecated|incompatible|missing|failed|invalid|unable|mismatch|conflict" | head -20 || echo "None"
  echo ""

  # Extract provisioning profile issues
  echo "=== PROVISIONING PROFILE ISSUES ==="
  grep -E "provisioning profile|code signing|PROVISIONING_PROFILE|CODE_SIGN" "$LOG_FILE" | grep -i -E "invalid|not found|error|fail|unable|missing" || echo "None"
  echo "" 

  # Extract bundle ID issues
  echo "=== BUNDLE IDENTIFIER ISSUES ==="
  grep -E "bundle identifier|bundleIdentifier|CFBundleIdentifier" "$LOG_FILE" | grep -i -E "invalid|not found|error|fail|unable|missing|mismatch" || echo "None"
  echo ""

} > "$ERROR_FILE"

echo "Done! Extracted information saved to $ERROR_FILE"
echo "Detected $ERROR_COUNT errors and $WARNING_COUNT warnings"
