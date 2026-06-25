# TASKS.md — Division of Labor (Claude ⇄ Codex)

Companion to [`/CLAUDE.md`](../CLAUDE.md). CLAUDE.md is the *why/what*; this is the *who/where/how*.
Mission: **full redesign + feature overhaul of JTradePilot that preserves all solid functionality.**

---

## 1. Ownership map — NEVER edit the other team's files

### Claude owns (backend + coordination)
```
backend/**          NestJS modules, controllers, services, DTOs
backend/prisma/**   schema.prisma + migrations + seed
tools/**            coordination MCP, codex-runner, helper scripts
docs/AUDIT.md       the Phase-1 audit + keep/redesign/retire/add matrix (Claude authors)
```

### Codex owns (frontend)
```
App.tsx  index.tsx  index.html  constants.ts
pages/**  components/**  context/**  services/**  utils/**  hooks/**  styles/**  public/**
vite.config.ts  tailwind.config.js  postcss.config.js
```
Codex implements the new UI against the design comp in **`JTradePilot Trading Journal Redesign/`**
(`JTradePilot.dc.html` + `screenshots/`). That folder is **read-only reference** — never build inside it.

### Shared contract — change ONLY by mutual agreement, announced on the bus
```
types.ts            shared TS interfaces = the API shape contract
services/api.ts     frontend's view of backend endpoints (Codex edits; Claude specifies)
backend DTOs        Claude edits; any response-shape change is a contract change → announce it
package.json (root) mixed front/back deps — frozen until Phase 6 cleanup
```

**Boundary enforcement (added in the build phases):** import-linter (Python side) / ESLint
`no-restricted-imports` (frontend) so a cross-lane import fails CI from the first build commit.

---

## 2. Agreed interfaces

| Thing | Value |
|-------|-------|
| Backend base URL (dev) | `http://localhost:8080/api` (prefix only in dev; Nginx strips `/api` in prod) |
| Backend port | `PORT` env, default **8080** |
| Frontend dev server | Vite default (`5173`) |
| Coordination MCP | `http://localhost:8766/mcp` (TradePilot; PulaPoint owns 8765) |
| Auth | Clerk JWT in `Authorization: Bearer <token>` |
| Webhooks | Paddle → raw body required (`req.rawBody`) for signature verification |
| API client | all frontend calls go through `services/api.ts` (never `fetch` ad-hoc in components) |
| Type contract | all cross-boundary shapes live in root `types.ts` |

---

## 3. Two-way comms protocol (via coordination MCP / `bus.sh`)

- **Claim before you work:** `claim_task(id, "claude"|"codex")` → status `in_progress`.
- **Finish or block, never abandon:** `update_task(id, "done")` or `update_task(id, "blocked", "<reason>")`.
- **Contract change?** `post_message("claude", "codex", "Added field X to /trades response → update types.ts + api.ts")`.
  The other side updates its side, replies, then the change is safe to rely on.
- **Check `board()` before claiming** to avoid double-work.
- Senders/recipients are exactly: `claude`, `codex`, `human`, `all`.

---

## 4. Branch & worktree discipline

| Where | Branch | Who |
|-------|--------|-----|
| `/home/d0v1k/Projects/TradePilot` (main tree) | `main` | integration; **human merges here** |
| `/home/d0v1k/Projects/TradePilot` (main tree)  | `codex/work` | Codex (codex-runner runs here with `-C`) |
| `/home/d0v1k/Projects/TradePilot-claude` (worktree) | `claude/work` | Claude |

- Claude uses a **separate git worktree** so the two teams never share a working tree.
- Disjoint ownership (§1) means even on shared `main` history they edit non-overlapping paths,
  so merges to `main` are conflict-free by construction.
- The **bootstrap base** (charter, coordination MCP, this file, codex-runner, design folder)
  lives on `main` so both lanes inherit it. Phase/feature work happens on `claude/*` / `codex/*`.
- Neither AI pushes to the GitHub remote (`origin`) — the human controls publishing.

---

## 5. Seeded task list

Phase 1 (audit) tasks are seeded onto the board at bootstrap (see `tools/coordination-mcp` +
`bus.sh board`). High level:

**Claude (Phase 1 — audit, read-only):**
1. Inventory backend capabilities (every module/endpoint) → feature list.
2. Map current features vs the new design → **keep / redesign / retire / add** matrix.
3. Money/data correctness audit (Paddle webhooks, entitlement, P&L/R math) for kept features.
4. Draft the new data-model deltas (confidence, mistake tags, MAE/MFE, dual R/$, dual checklists).
5. Write `docs/AUDIT.md` + `ROADMAP.md`.

**Codex (Phase 1 — design intake, read-only):**
1. Catalogue the design comp: every screen, component, state in `JTradePilot.dc.html`.
2. Map design components → existing frontend components (reuse / rebuild / new).
3. Extract the design tokens (colors, spacing, type scale) for the Tailwind theme.
4. Flag any design element with no backend data behind it (→ feeds Claude's "add" column).

Both lanes stop at the **⛔ Phase 1 checkpoint** with their findings for human review before
any code changes (Phase 2+).
