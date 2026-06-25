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
set -uo pipefail

# CI=true makes pnpm non-interactive (the repo currently has BOTH package-lock.json
# and pnpm-lock.yaml, so pnpm wants to purge/reinstall and otherwise blocks on a TTY
# prompt). Removed once the dual lockfile is resolved in Phase 6.
export CI=true

REPO="${REPO:-/home/d0v1k/Projects/TradePilot}"
CONTAINER="${COORD_CONTAINER:-tradepilot-coordination-mcp}"
DB="${COORD_DB:-/data/coordination.db}"
MAX_ITERS="${MAX_ITERS:-50}"

# How many open tasks does codex own right now?
codex_queue_count() {
  docker exec -i "$CONTAINER" sqlite3 "$DB" \
    "SELECT COUNT(*) FROM tasks WHERE owner='codex' AND status IN ('todo','in_progress');" 2>/dev/null || echo 0
}
codex_done_count() {
  docker exec -i "$CONTAINER" sqlite3 "$DB" \
    "SELECT COUNT(*) FROM tasks WHERE owner='codex' AND status='done';" 2>/dev/null || echo 0
}

read -r -d '' PROMPT <<'EOF' || true
You are Codex, the FRONTEND team building the JTradePilot redesign. Do EXACTLY ONE task, then stop.

1. Read /CLAUDE.md and docs/TASKS.md for full context, lane rules, and the golden rule.
2. Use the `tradepilot-coord` MCP tools: call board(), then list_tasks owner="codex".
   Pick the lowest-id task with status "todo", OR resume the one already "in_progress" for you.
   If there is none, post_message("codex","claude","queue empty") and STOP without changes.
3. claim_task(<id>, "codex"). Re-read the task. Do the work.
   - STAY IN YOUR LANE: only edit files Codex owns (docs/TASKS.md §1). Never touch backend/** or tools/**.
   - Phase-1 tasks (#6-9) are READ-ONLY ANALYSIS: produce a markdown artifact under styles/redesign/
     (e.g. styles/redesign/task-0N-*.md). Do NOT change app code and do NOT run a build for these.
   - Implement design work against "JTradePilot Trading Journal Redesign/" (read-only reference).
   - If you need a backend/contract change, do NOT cross the lane: post_message("codex","claude","<request>")
     and update_task(<id>, "blocked", "waiting on backend: <what>"), then STOP.
4. ONLY if you changed buildable frontend code (not for analysis/doc tasks): run `CI=true pnpm build`
   and fix what you broke. If pnpm fights you over node_modules, that's the known dual-lockfile issue —
   `CI=true` is the fix; do not delete lockfiles or pnpm-workspace files.
5. Stage and commit ONLY your task's files on the current branch (codex/work) with a conventional-commit
   message. Do NOT commit unrelated lockfile churn (`git checkout -- pnpm-lock.yaml` first if needed).
6. update_task(<id>, "done") and post_message("codex","claude","done #<id>: <one-line summary>").
7. STOP. Do not pick up another task.
EOF

echo "codex-runner: repo=$REPO  max_iters=$MAX_ITERS  (CI=true)"
i=0
stalled=0
while [ "$i" -lt "$MAX_ITERS" ]; do
  q="$(codex_queue_count)"
  if [ "$q" -eq 0 ]; then
    echo "codex-runner: queue empty — done after $i iteration(s)."
    break
  fi
  before_done="$(codex_done_count)"
  i=$((i+1))
  echo "── iteration $i ── ($q task(s) in codex queue)"

  # A single bad iteration must not kill the loop.
  codex exec \
    --dangerously-bypass-approvals-and-sandbox \
    --skip-git-repo-check \
    -C "$REPO" \
    "$PROMPT" || echo "codex-runner: iteration $i returned non-zero; continuing."

  # Stall guard: if an iteration completed no new 'done' task, don't spin forever.
  after_done="$(codex_done_count)"
  if [ "$after_done" -le "$before_done" ]; then
    echo "codex-runner: no task completed this iteration (done: $before_done -> $after_done)."
    if [ "$stalled" -eq 1 ]; then
      echo "codex-runner: stalled twice in a row; stopping for human review."
      break
    fi
    stalled=1
  else
    stalled=0
  fi
done

[ "$i" -ge "$MAX_ITERS" ] && echo "codex-runner: hit MAX_ITERS=$MAX_ITERS; stopping."
