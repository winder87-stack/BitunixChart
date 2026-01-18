#!/bin/bash
LOG_FILE="$HOME/bitunix-charts-debug.log"
echo "==========================================" >> "$LOG_FILE"
echo "Starting Bitunix Charts at $(date)" >> "$LOG_FILE"
echo "User: $(whoami)" >> "$LOG_FILE"
echo "Display: $DISPLAY" >> "$LOG_FILE"
echo "Wayland: $XDG_SESSION_TYPE" >> "$LOG_FILE"

# The real binary location
APP_DIR="/opt/BitunixCharts"
BINARY="$APP_DIR/bitunix-charts"

if [ ! -f "$BINARY" ]; then
  echo "ERROR: Binary not found at $BINARY" >> "$LOG_FILE"
  # Try to find it nearby
  BINARY="$(dirname "$0")/bitunix-charts"
  echo "Trying relative path: $BINARY" >> "$LOG_FILE"
fi

echo "Launching binary: $BINARY" >> "$LOG_FILE"
echo "Flags: --no-sandbox --disable-gpu --enable-logging" >> "$LOG_FILE"

# Export debug vars
export ELECTRON_ENABLE_LOGGING=true
export ELECTRON_ENABLE_STACK_DUMPING=true

# Launch
"$BINARY" --no-sandbox --disable-gpu --enable-logging >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "Process exited with code: $EXIT_CODE" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"
