#!/usr/bin/env bash
# run.sh — drive ChatGPT Codex autonomously through its task queue.
#
# Loops: each iteration launches a fresh `codex exec` that pulls ONE task it owns
# off the coordination board, does exactly that task (staying in the frontend lane),
# marks it done + posts a message, and stops. The loop repeats until Codex's queue
# is empty (no todo/in_progress tasks owned by codex), then exits.
#
# Usage:
#   tools/codex-runner/run.sh                 # run until codex queue empty
#   MAX_ITERS=5 tools/codex-runner/run.sh     # cap iterations
#
# Requires: codex CLI on PATH, the coordination MCP container running (port 8766).
set -euo pipefail

REPO="${REPO:-/home/d0v1k/Projects/TradePilot}"
CONTAINER="${COORD_CONTAINER:-tradepilot-coordination-mcp}"
DB="${COORD_DB:-/data/coordination.db}"
MAX_ITERS="${MAX_ITERS:-50}"

# How many open tasks does codex own right now?
codex_queue_count() {
  docker exec -i "$CONTAINER" sqlite3 "$DB" \
    "SELECT COUNT(*) FROM tasks WHERE owner='codex' AND status IN ('todo','in_progress');" 2>/dev/null || echo 0
}

read -r -d '' PROMPT <<'EOF' || true
You are Codex, the FRONTEND team building the JTradePilot redesign. Do EXACTLY ONE task, then stop.

1. Read /CLAUDE.md and docs/TASKS.md for full context, lane rules, and the golden rule.
2. Use the `tradepilot-coord` MCP tools to read the board: call board(), then list_tasks owner="codex".
   Pick the highest-priority task with status "todo" (or resume one already "in_progress" for you).
   If there is none, post a message ("codex" -> "claude": "queue empty") and STOP without changes.
3. claim_task(<id>, "codex"). Re-read the task. Do the work.
   - STAY IN YOUR LANE: only edit files Codex owns (see docs/TASKS.md §1). Never touch backend/** or tools/**.
   - Implement against the design comp in "JTradePilot Trading Journal Redesign/" (read-only reference).
   - If you need a backend change or a contract change, do NOT cross the lane: post_message("codex","claude", "<request>")
     and update_task(<id>, "blocked", "waiting on backend: <what>"), then STOP.
4. Verify your work builds: run `pnpm build` at the repo root. Fix what you broke.
5. Commit on the codex/work branch with a conventional-commit message.
6. update_task(<id>, "done") and post_message("codex","claude","done #<id>: <one-line summary>").
7. STOP. Do not pick up another task.
EOF

echo "codex-runner: repo=$REPO  max_iters=$MAX_ITERS"
i=0
while [ "$i" -lt "$MAX_ITERS" ]; do
  q="$(codex_queue_count)"
  if [ "$q" -eq 0 ]; then
    echo "codex-runner: queue empty — done after $i iteration(s)."
    break
  fi
  i=$((i+1))
  echo "── iteration $i ── ($q task(s) in codex queue)"
  codex exec \
    --dangerously-bypass-approvals-and-sandbox \
    --skip-git-repo-check \
    -C "$REPO" \
    "$PROMPT" || { echo "codex exec failed on iteration $i; stopping."; exit 1; }
done

[ "$i" -ge "$MAX_ITERS" ] && echo "codex-runner: hit MAX_ITERS=$MAX_ITERS; stopping."
