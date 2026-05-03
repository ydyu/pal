#!/bin/bash
# Monitor an RPG save file and refresh the pickup report at a fixed interval.
#
# Usage:
#   ./watch_pickups.sh SAVE.RPG                     # refresh every 30s
#   ./watch_pickups.sh SAVE.RPG 15                  # refresh every 15s
#   ./watch_pickups.sh SAVE.RPG 30 --all            # pass flags through to pickup_report.py
#   ./watch_pickups.sh SAVE.RPG 30 --map --no-plot
#
# The save is copied to a tmp file before each report so we never read a
# half-written file while the game is saving.

set -eu

if [ $# -lt 1 ]; then
  sed -n '2,12p' "$0" >&2
  exit 1
fi

SAVE="$1"; shift

INTERVAL=30
if [ $# -gt 0 ] && [[ "$1" =~ ^[0-9]+$ ]]; then
  INTERVAL="$1"; shift
fi

DIR="$(cd "$(dirname "$0")" && pwd)/python-tools"
TMP="${TMPDIR:-/tmp}/pickup_watch.$$.rpg"
trap 'rm -f "$TMP"' EXIT

# Quote the save path and any extra args for the subshell that `watch` spawns.
# `%q` produces a shell-safe rendering for each arg.
printf -v Q_SAVE '%q' "$SAVE"
EXTRA=""
for arg in "$@"; do
  printf -v Q '%q' "$arg"
  EXTRA="$EXTRA $Q"
done

exec watch -n "$INTERVAL" "cp $Q_SAVE $TMP && python3 $DIR/pickup_report.py $TMP$EXTRA"
