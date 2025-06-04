#!/bin/bash

# Quick Build Log Error Extractor
# This script quickly extracts errors from large build logs
# Optimized for React Native and iOS/Android build logs
#
# Usage:
#   ./scripts/extract-build-errors.sh <path-to-log-file> [output-file]

# Color codes for terminal output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
function print_usage {
  echo "Usage: $0 <build-log-file> [output-file]"
  echo ""
  echo "Examples:"
  echo "  $0 build.log                     # Print errors to console"
  echo "  $0 build.log errors.txt          # Save errors to file"
  echo "  $0 build.log - | grep RNScreens  # Pipe errors to grep"
  echo "  $0 build.log --stats             # Show only statistics summary"
}

# Check arguments
if [ $# -lt 1 ]; then
  echo -e "${RED}Error: No log file specified${NC}"
  print_usage
  exit 1
fi

LOG_FILE=$1
OUTPUT_FILE=$2

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
  echo -e "${RED}Error: File not found: $LOG_FILE${NC}"
  exit 1
fi

# Get file size in human-readable format
FILE_SIZE=$(du -h "$LOG_FILE" | cut -f1)
echo -e "Analyzing log file: $LOG_FILE (${YELLOW}$FILE_SIZE${NC})"

# Create a temporary file for processing
TEMP_FILE=$(mktemp)

# Function to clean up temp file on exit
function cleanup {
  rm -f "$TEMP_FILE"
}
trap cleanup EXIT

# Extract the errors and warnings with context
echo "Extracting errors and warnings..."

# Create header in temp file
echo "========================" > "$TEMP_FILE"
echo "BUILD LOG ERROR SUMMARY" >> "$TEMP_FILE"
echo "File: $LOG_FILE" >> "$TEMP_FILE"
echo "Size: $FILE_SIZE" >> "$TEMP_FILE"
echo "Date: $(date)" >> "$TEMP_FILE"
echo "========================" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Extract compilation errors (most important)
echo -e "${RED}COMPILATION ERRORS:${NC}" >> "$TEMP_FILE"
grep -B 2 -A 2 "CompileC.*failed" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -B 2 -A 5 "The following build commands failed" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -B 1 -A 1 "Could not compile" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
echo "" >> "$TEMP_FILE"

# Extract critical messages
echo -e "${RED}CRITICAL MESSAGES:${NC}" >> "$TEMP_FILE"
grep -B 1 -A 1 "CRITICAL" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -B 1 -A 1 "❌" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -B 0 -A 2 "fatal error:" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
echo "" >> "$TEMP_FILE"

# Extract error messages (limited to first 50 to avoid overwhelming output)
echo -e "${RED}ERROR MESSAGES (first 50):${NC}" >> "$TEMP_FILE"
grep -B 1 -A 3 "error:" "$LOG_FILE" | grep -v "warning:" | head -50 >> "$TEMP_FILE" 2>/dev/null
grep -B 0 -A 2 "\[error\]" "$LOG_FILE" | head -20 >> "$TEMP_FILE" 2>/dev/null
echo "" >> "$TEMP_FILE"

# Extract specific failure patterns for iOS builds
echo -e "${BLUE}IOS BUILD FAILURES:${NC}" >> "$TEMP_FILE"
grep -B 0 -A 2 "ARCHIVE FAILED" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -B 0 -A 10 "Invalid format" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -B 1 -A 1 "PRODUCT_BUNDLE_IDENTIFIER" "$LOG_FILE" | grep -i error >> "$TEMP_FILE" 2>/dev/null
grep -B 1 -A 1 "Code Sign error:" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
echo "" >> "$TEMP_FILE"

# Extract RN and Expo specific errors
echo -e "${BLUE}REACT NATIVE & EXPO ERRORS:${NC}" >> "$TEMP_FILE"
grep -i -B 2 -A 2 "react-native.*error" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
grep -i -B 2 -A 2 "RNScreens.*error" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null 
grep -i -B 2 -A 2 "expo.*failed" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
echo "" >> "$TEMP_FILE"

# Extract compatibility issues (often cause of build failures)
echo -e "${YELLOW}COMPATIBILITY ISSUES:${NC}" >> "$TEMP_FILE"
grep -i -B 1 -A 1 "compatibility" "$LOG_FILE" | grep -i "error\|warning\|fail" >> "$TEMP_FILE" 2>/dev/null
grep -i -B 1 -A 1 "incompatible" "$LOG_FILE" | grep -i "error\|warning\|fail" >> "$TEMP_FILE" 2>/dev/null
grep -i -B 1 -A 1 "version mismatch" "$LOG_FILE" >> "$TEMP_FILE" 2>/dev/null
echo "" >> "$TEMP_FILE"

# Add summary statistics
echo -e "${GREEN}SUMMARY STATISTICS:${NC}" >> "$TEMP_FILE"
ERROR_COUNT=$(grep -c "error:" "$LOG_FILE")
WARNING_COUNT=$(grep -c "warning:" "$LOG_FILE")
FATAL_COUNT=$(grep -c "fatal error:" "$LOG_FILE")
ARCHIVE_FAIL_COUNT=$(grep -c "ARCHIVE FAILED" "$LOG_FILE")
BUILD_FAIL_COUNT=$(grep -c "BUILD FAILED" "$LOG_FILE")
REACT_NATIVE_ERROR_COUNT=$(grep -i -c "react-native.*error" "$LOG_FILE")

echo "Total errors: $ERROR_COUNT" >> "$TEMP_FILE"
echo "Total warnings: $WARNING_COUNT" >> "$TEMP_FILE"
echo "Fatal errors: $FATAL_COUNT" >> "$TEMP_FILE"
echo "Archive failures: $ARCHIVE_FAIL_COUNT" >> "$TEMP_FILE"
echo "Build failures: $BUILD_FAIL_COUNT" >> "$TEMP_FILE"
echo "React Native errors: $REACT_NATIVE_ERROR_COUNT" >> "$TEMP_FILE"

# Add recommendations based on errors found
echo -e "\n${GREEN}RECOMMENDATIONS:${NC}" >> "$TEMP_FILE"
if [ $ERROR_COUNT -gt 0 ]; then
  if grep -q "react-native-screens" "$LOG_FILE" && grep -q "error:" "$LOG_FILE"; then
    echo "• Check compatibility between React Native and react-native-screens versions" >> "$TEMP_FILE"
  fi
  
  if grep -q "PRODUCT_BUNDLE_IDENTIFIER" "$LOG_FILE" && grep -q "error:" "$LOG_FILE"; then
    echo "• Verify bundle identifier format in app.config.js and Info.plist" >> "$TEMP_FILE"
  fi
  
  if grep -q "Code Sign" "$LOG_FILE" && grep -q "error:" "$LOG_FILE"; then
    echo "• Check code signing identities and provisioning profiles" >> "$TEMP_FILE"
  fi
  
  if grep -q "compatibility" "$LOG_FILE" && grep -q "error:" "$LOG_FILE"; then
    echo "• Review library versions for compatibility issues" >> "$TEMP_FILE"
  fi
fi

# Add tip for reducing build log verbosity
echo "• Remove -verbose flags from xcodebuild commands to reduce log size" >> "$TEMP_FILE"
echo "Total warnings: $(grep -c "warning:" "$LOG_FILE")" >> "$TEMP_FILE"
echo "Failed commands: $(grep -c "failed" "$LOG_FILE")" >> "$TEMP_FILE"
echo "Critical issues: $(grep -c "CRITICAL\|❌" "$LOG_FILE")" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Output based on second argument
if [ -z "$OUTPUT_FILE" ] || [ "$OUTPUT_FILE" = "-" ]; then
  # Output to console
  cat "$TEMP_FILE"
  echo -e "${YELLOW}Done! Errors extracted to console.${NC}"
else
  # Output to specified file
  cat "$TEMP_FILE" > "$OUTPUT_FILE"
  echo -e "${YELLOW}Done! Errors extracted to $OUTPUT_FILE${NC}"
fi

exit 0
