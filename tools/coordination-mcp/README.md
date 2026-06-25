# Coordination MCP

Shared **task board + message bus** for the Claude ⇄ Codex teams building TradePilot.

- **Server:** Python [FastMCP], Streamable HTTP, SQLite persisted to a Docker volume.
- **Endpoint:** `http://localhost:8766/mcp`
- **DB:** SQLite inside the `coord-data` Docker volume (`/data/coordination.db`).

## Tools exposed

| Tool | Purpose |
|------|---------|
| `board()` | Human-readable snapshot: tasks by status + last 10 messages |
| `list_tasks(owner?, status?)` | Filtered task list |
| `get_task(task_id)` | One task |
| `add_task(title, description, owner)` | Create a task (`owner`: claude\|codex\|human\|unassigned) |
| `claim_task(task_id, owner)` | Assign + mark `in_progress` |
| `update_task(task_id, status, note?)` | `todo\|in_progress\|blocked\|done` |
| `post_message(sender, body, recipient?)` | Append to the bus (`recipient` default `all`) |
| `get_messages(since_id, recipient?)` | Messages after `since_id` for a recipient (or `all`) |

## Run it

```bash
cd tools/coordination-mcp
docker compose up -d --build
# health: curl is not meaningful on /mcp (it's a streaming endpoint); check the container:
docker compose logs -f coordination-mcp
```

Stop / reset:

```bash
docker compose down            # stop, keep the board
docker compose down -v         # stop AND wipe the board (deletes the volume)
```

## Wire it into the two CLIs

### Claude Code (this repo)
Already done — see `../../.mcp.json` (project-scoped, `type: http`). Claude picks it up
automatically when launched from the repo root. Approve the server when prompted.

### ChatGPT Codex (`~/.codex/config.toml`)
Codex reaches the same HTTP server through the `mcp-remote` bridge (works regardless of
native HTTP-MCP support). Add this block to `~/.codex/config.toml`:

```toml
[mcp_servers.tradepilot-coord]
command = "npx"
args = ["-y", "mcp-remote", "http://localhost:8766/mcp"]
```

> **Port note:** TradePilot uses **8766**. PulaPoint (another project on this machine)
> uses 8765 for its own coordination MCP — keeping them on separate ports lets both run
> at once. The compose project name is `tradepilot-coord` so the two never clobber each
> other's containers.

(Helper script `./install-codex.sh` will append it for you if the block isn't already there.)

## Direct access (humans / scripts)

`bus.sh` talks to the SQLite DB directly inside the container — no MCP round-trip:

```bash
./bus.sh board
./bus.sh add "Audit Paddle webhook idempotency" "Phase 1" claude
./bus.sh claim 1 claude
./bus.sh status 1 done "verified + tested"
./bus.sh msg claude codex "Changed /billing/status response shape — update services/api.ts"
./bus.sh inbox codex
```

`watch_done.sh` rings the bell whenever a task flips to `done`/`blocked`:

```bash
./watch_done.sh        # poll every 10s
```
