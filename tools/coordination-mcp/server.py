"""
Coordination MCP — shared task board + message bus for the Claude <-> Codex teams.

Transport: Streamable HTTP at http://<host>:<port>/mcp  (default 0.0.0.0:8765).
Storage:   SQLite at $COORD_DB (default /data/coordination.db) — persist to a Docker volume.

Tools:
  board()                                  -> human-readable snapshot of all tasks + recent msgs
  list_tasks(owner?, status?)              -> filtered task list
  get_task(task_id)                        -> one task
  add_task(title, description, owner)      -> create a task
  claim_task(task_id, owner)               -> assign + mark in_progress
  update_task(task_id, status)             -> todo|in_progress|blocked|done (+optional note)
  post_message(sender, recipient, body)    -> append to the bus
  get_messages(since_id, recipient)        -> messages after since_id for recipient (or 'all')
"""

import os
import sqlite3
from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

DB_PATH = os.environ.get("COORD_DB", "/data/coordination.db")
HOST = os.environ.get("COORD_HOST", "0.0.0.0")
PORT = int(os.environ.get("COORD_PORT", "8766"))

VALID_OWNERS = {"claude", "codex", "human", "unassigned"}
VALID_STATUS = {"todo", "in_progress", "blocked", "done"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _conn() -> sqlite3.Connection:
    # One connection per call keeps things thread-safe under the HTTP server.
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def _init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    with _conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                owner       TEXT NOT NULL DEFAULT 'unassigned',
                status      TEXT NOT NULL DEFAULT 'todo',
                note        TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                sender     TEXT NOT NULL,
                recipient  TEXT NOT NULL DEFAULT 'all',
                body       TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


mcp = FastMCP("coordination", host=HOST, port=PORT)


def _task_dict(row: sqlite3.Row) -> dict:
    return {k: row[k] for k in row.keys()}


@mcp.tool()
def board() -> str:
    """Human-readable snapshot: all tasks grouped by status, plus the 10 most recent messages."""
    with _conn() as conn:
        tasks = conn.execute(
            "SELECT * FROM tasks ORDER BY "
            "CASE status WHEN 'in_progress' THEN 0 WHEN 'blocked' THEN 1 "
            "WHEN 'todo' THEN 2 ELSE 3 END, id"
        ).fetchall()
        msgs = conn.execute(
            "SELECT * FROM messages ORDER BY id DESC LIMIT 10"
        ).fetchall()

    lines = ["# Coordination Board", ""]
    for status in ("in_progress", "blocked", "todo", "done"):
        group = [t for t in tasks if t["status"] == status]
        if not group:
            continue
        lines.append(f"## {status.upper()} ({len(group)})")
        for t in group:
            note = f"  — {t['note']}" if t["note"] else ""
            lines.append(f"  #{t['id']} [{t['owner']}] {t['title']}{note}")
        lines.append("")

    if not tasks:
        lines.append("_(no tasks yet)_\n")

    lines.append("## Recent messages")
    if msgs:
        for m in reversed(msgs):
            lines.append(f"  #{m['id']} {m['sender']} -> {m['recipient']}: {m['body']}")
    else:
        lines.append("  _(none)_")
    return "\n".join(lines)


@mcp.tool()
def list_tasks(owner: str = "", status: str = "") -> list[dict]:
    """List tasks, optionally filtered by owner (claude|codex|human|unassigned) and/or status."""
    q = "SELECT * FROM tasks"
    where, params = [], []
    if owner:
        where.append("owner = ?")
        params.append(owner)
    if status:
        where.append("status = ?")
        params.append(status)
    if where:
        q += " WHERE " + " AND ".join(where)
    q += " ORDER BY id"
    with _conn() as conn:
        return [_task_dict(r) for r in conn.execute(q, params).fetchall()]


@mcp.tool()
def get_task(task_id: int) -> dict:
    """Get a single task by id."""
    with _conn() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        return {"error": f"task {task_id} not found"}
    return _task_dict(row)


@mcp.tool()
def add_task(title: str, description: str = "", owner: str = "unassigned") -> dict:
    """Create a task. owner must be one of: claude, codex, human, unassigned."""
    if owner not in VALID_OWNERS:
        return {"error": f"invalid owner '{owner}'; must be one of {sorted(VALID_OWNERS)}"}
    ts = _now()
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (title, description, owner, status, created_at, updated_at) "
            "VALUES (?, ?, ?, 'todo', ?, ?)",
            (title, description, owner, ts, ts),
        )
        task_id = cur.lastrowid
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return _task_dict(row)


@mcp.tool()
def claim_task(task_id: int, owner: str) -> dict:
    """Claim a task: set its owner and move it to in_progress."""
    if owner not in VALID_OWNERS:
        return {"error": f"invalid owner '{owner}'; must be one of {sorted(VALID_OWNERS)}"}
    with _conn() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return {"error": f"task {task_id} not found"}
        if row["status"] in ("in_progress", "done") and row["owner"] not in (owner, "unassigned"):
            return {"error": f"task {task_id} already {row['status']} by {row['owner']}"}
        conn.execute(
            "UPDATE tasks SET owner = ?, status = 'in_progress', updated_at = ? WHERE id = ?",
            (owner, _now(), task_id),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return _task_dict(row)


@mcp.tool()
def update_task(task_id: int, status: str, note: str = "") -> dict:
    """Update a task's status: todo | in_progress | blocked | done. Optional note (e.g. blocked reason)."""
    if status not in VALID_STATUS:
        return {"error": f"invalid status '{status}'; must be one of {sorted(VALID_STATUS)}"}
    with _conn() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not row:
            return {"error": f"task {task_id} not found"}
        new_note = note if note else row["note"]
        conn.execute(
            "UPDATE tasks SET status = ?, note = ?, updated_at = ? WHERE id = ?",
            (status, new_note, _now(), task_id),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return _task_dict(row)


@mcp.tool()
def post_message(sender: str, body: str, recipient: str = "all") -> dict:
    """Post a message to the bus. recipient defaults to 'all' (broadcast)."""
    ts = _now()
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO messages (sender, recipient, body, created_at) VALUES (?, ?, ?, ?)",
            (sender, recipient, body, ts),
        )
        msg_id = cur.lastrowid
    return {"id": msg_id, "sender": sender, "recipient": recipient, "body": body, "created_at": ts}


@mcp.tool()
def get_messages(since_id: int = 0, recipient: str = "") -> list[dict]:
    """Get messages with id > since_id. If recipient is given, returns messages to that recipient OR 'all'."""
    q = "SELECT * FROM messages WHERE id > ?"
    params: list = [since_id]
    if recipient:
        q += " AND recipient IN (?, 'all')"
        params.append(recipient)
    q += " ORDER BY id"
    with _conn() as conn:
        return [
            {k: r[k] for k in r.keys()}
            for r in conn.execute(q, params).fetchall()
        ]


if __name__ == "__main__":
    _init_db()
    mcp.run(transport="streamable-http")
