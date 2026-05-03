#!/usr/bin/env bash

# export_view.sh
# Runs export.sh with passed args, captures output, opens the generated GIF, waits for a keypress, then deletes with confirmation.

set -u

# Run export.sh and capture stdout
DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$(npx tsx "$DIR/tests/export.ts" "$@" 2>&1)"
EXIT_CODE=$?


# Show output for user
printf "%s\n" "$OUTPUT"

# Find first .gif filename in output
GIF=$(printf '%s\n' "$OUTPUT" | grep -oE '[^[:space:]]+\.gif' | head -n1 || true)

if [ -z "$GIF" ]; then
  # No GIF produced; output already printed. Exit with export's exit code.
  exit ${EXIT_CODE:-0}
fi


# Open the gif: prefer x11 image viewer when running under X11 (detected via xsel), otherwise fall back to termux-open/xdg-open/open.
OPENED=false

# Detect X11 via xsel: if xsel exists and doesn't error with "can't open display", assume X11 is available.
if command -v xsel >/dev/null 2>&1; then
  XSEL_ERR="$( { xsel -o >/dev/null; } 2>&1 || true )"
  if [ -z "$XSEL_ERR" ] || ! printf '%s' "$XSEL_ERR" | grep -qi "can't open display"; then
    if command -v ristretto >/dev/null 2>&1; then
      ristretto "$GIF" &
      OPENED=true
    fi
  fi
fi

if [ "$OPENED" = false ]; then
  if command -v termux-open >/dev/null 2>&1; then
    termux-open "$GIF"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$GIF" &
  elif command -v open >/dev/null 2>&1; then
    open "$GIF" &
  else
    printf "No opener found for %s.\n" "$GIF"
  fi
fi

# Wait for single keypress before deleting
read -n1 -s -r -p $'\nPress any key to delete...' 
printf "\n"

# Delete with interactive confirmation
rm -i -- "$GIF"
