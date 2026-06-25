#!/usr/bin/env bash
# watch_done.sh — poll the board and shout when a task hits done/blocked.
# Run this in a spare terminal; it wakes you (bell + line) on every transition
# into 'done' or 'blocked' so you don't have to babysit the board.
#
#   ./watch_done.sh [interval_seconds]   # default 10s
set -euo pipefail

CONTAINER="${COORD_CONTAINER:-tradepilot-coordination-mcp}"
DB="${COORD_DB:-/data/coordination.db}"
INTERVAL="${1:-10}"
SEEN_FILE="$(mktemp)"
trap 'rm -f "$SEEN_FILE"' EXIT

sq() { docker exec -i "$CONTAINER" sqlite3 "$DB" "$@"; }

echo "watching $CONTAINER for done/blocked tasks every ${INTERVAL}s (Ctrl-C to stop)..."
while true; do
  # id|owner|status|title for every finished/blocked task
  current="$(sq -separator '|' \
    "SELECT id, owner, status, title FROM tasks WHERE status IN ('done','blocked') ORDER BY id;" 2>/dev/null || true)"
  while IFS='|' read -r id owner status title; do
    [ -z "${id:-}" ] && continue
    key="$id:$status"
    if ! grep -qxF "$key" "$SEEN_FILE" 2>/dev/null; then
      echo "$key" >> "$SEEN_FILE"
      printf '\a'   # terminal bell
      printf '\n>>> [%s] task #%s (%s): %s\n' "$status" "$id" "$owner" "$title"
    fi
  done <<< "$current"
  sleep "$INTERVAL"
done
