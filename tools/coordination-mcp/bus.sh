#!/usr/bin/env bash
# bus.sh — talk to the coordination board directly via SQLite (no MCP needed).
# Useful for humans and shell scripts. The DB lives inside the Docker volume,
# so we exec sqlite3 *inside* the running container.
#
# Usage:
#   ./bus.sh board                          # show the board
#   ./bus.sh tasks [owner] [status]         # list tasks (optionally filtered)
#   ./bus.sh add "title" "description" owner # add a task (owner: claude|codex|human|unassigned)
#   ./bus.sh claim <id> <owner>             # claim a task
#   ./bus.sh status <id> <status> [note]    # set status: todo|in_progress|blocked|done
#   ./bus.sh msg <sender> <recipient> "body"# post a message
#   ./bus.sh inbox [recipient] [since_id]   # read messages
set -euo pipefail

CONTAINER="${COORD_CONTAINER:-tradepilot-coordination-mcp}"
DB="${COORD_DB:-/data/coordination.db}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%S+00:00)"

sq() { docker exec -i "$CONTAINER" sqlite3 "$DB" "$@"; }
# escape single quotes for SQL literals
esc() { printf "%s" "$1" | sed "s/'/''/g"; }

cmd="${1:-board}"; shift || true

case "$cmd" in
  board)
    echo "== IN PROGRESS / BLOCKED / TODO / DONE =="
    sq -header -column "SELECT id, owner, status, title, note FROM tasks
      ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'blocked' THEN 1
      WHEN 'todo' THEN 2 ELSE 3 END, id;"
    echo
    echo "== RECENT MESSAGES =="
    sq -header -column "SELECT id, sender, recipient, body FROM messages ORDER BY id DESC LIMIT 10;"
    ;;
  tasks)
    owner="${1:-}"; status="${2:-}"
    where=""
    [ -n "$owner" ]  && where="WHERE owner='$(esc "$owner")'"
    [ -n "$status" ] && { [ -n "$where" ] && where="$where AND status='$(esc "$status")'" || where="WHERE status='$(esc "$status")'"; }
    sq -header -column "SELECT id, owner, status, title FROM tasks $where ORDER BY id;"
    ;;
  add)
    title="$(esc "${1:?title required}")"; desc="$(esc "${2:-}")"; owner="$(esc "${3:-unassigned}")"
    sq "INSERT INTO tasks (title, description, owner, status, created_at, updated_at)
        VALUES ('$title', '$desc', '$owner', 'todo', '$NOW', '$NOW');
        SELECT 'added task #' || last_insert_rowid();"
    ;;
  claim)
    id="${1:?id required}"; owner="$(esc "${2:?owner required}")"
    sq "UPDATE tasks SET owner='$owner', status='in_progress', updated_at='$NOW' WHERE id=$id;
        SELECT 'task #' || $id || ' claimed by $owner';"
    ;;
  status)
    id="${1:?id required}"; st="$(esc "${2:?status required}")"; note="$(esc "${3:-}")"
    sq "UPDATE tasks SET status='$st',
        note=CASE WHEN '$note'='' THEN note ELSE '$note' END,
        updated_at='$NOW' WHERE id=$id;
        SELECT 'task #' || $id || ' -> $st';"
    ;;
  msg)
    sender="$(esc "${1:?sender required}")"; recip="$(esc "${2:?recipient required}")"; body="$(esc "${3:?body required}")"
    sq "INSERT INTO messages (sender, recipient, body, created_at)
        VALUES ('$sender', '$recip', '$body', '$NOW');
        SELECT 'posted message #' || last_insert_rowid();"
    ;;
  inbox)
    recip="${1:-}"; since="${2:-0}"
    where="WHERE id > $since"
    [ -n "$recip" ] && where="$where AND recipient IN ('$(esc "$recip")','all')"
    sq -header -column "SELECT id, sender, recipient, body FROM messages $where ORDER BY id;"
    ;;
  *)
    echo "unknown command: $cmd" >&2
    sed -n '2,20p' "$0"
    exit 1
    ;;
esac
