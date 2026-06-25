# codex-runner

Drives ChatGPT Codex autonomously through the **frontend** task queue on the coordination board.

Each loop iteration launches one `codex exec` that:
1. reads `CLAUDE.md` + `docs/TASKS.md`,
2. pulls the next `codex`-owned task off the board (`tradepilot-coord` MCP),
3. does **exactly one** task, staying in the frontend lane,
4. builds (`pnpm build`), commits on `codex/work`, marks the task `done`, posts a message,
5. stops — and the loop pulls the next, until Codex's queue is empty.

## Prerequisites
- `codex` CLI on PATH, signed in.
- Coordination MCP running: `cd tools/coordination-mcp && docker compose up -d`.
- Codex MCP wired (already done): `[mcp_servers.tradepilot-coord]` in `~/.codex/config.toml`.

## Run it
```bash
tools/codex-runner/run.sh            # loop until the codex queue is empty
MAX_ITERS=3 tools/codex-runner/run.sh # cap iterations (good for a first smoke test)
```

Watch progress from another terminal:
```bash
tools/coordination-mcp/watch_done.sh        # bell on each done/blocked
tools/coordination-mcp/bus.sh board         # snapshot
```

## Safety
- Uses `--dangerously-bypass-approvals-and-sandbox` so Codex can edit/commit unattended —
  the lane rules in `docs/TASKS.md` + the per-iteration prompt are what keep it in the
  frontend tree. Review `codex/work` before merging to `main`.
- Codex never touches `backend/**` or `tools/**`; if it needs a backend/contract change it
  posts a message to `claude` and blocks the task instead of crossing the lane.
