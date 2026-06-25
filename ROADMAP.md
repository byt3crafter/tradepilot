# ROADMAP — JTradePilot Redesign

Living doc. Source of truth for *what's next*; `CLAUDE.md` is the rules, `docs/AUDIT.md` the findings,
the coordination board the live task state. Updated each phase.

## Status
- ✅ **Phase 0** — Charter + coordination MCP + lanes + codex-runner. (committed to `main`)
- ✅ **Phase 1** — Audit + keep/redesign/retire/add matrix + money-correctness findings. (`docs/AUDIT.md`)
- ⛔ **Checkpoint** — awaiting human go-ahead before any code changes.

## Phase 2 — Money correctness + additive data model  (Claude lane)
*Golden rule first: fix the billing/entitlement base before features ride on it.*
1. **Fix CRITICAL webhook bug** (#1) — read camelCase SDK fields; integration test with a real Paddle fixture.
2. **EntitlementGuard + `resolveEntitlement`** (#2/#6) — one source of truth; gate AI + pro endpoints; enforce trial/grant expiry (daily cron).
3. **Webhook idempotency** (#5) — `ProcessedWebhookEvent` dedupe; atomic referral reward; stop returning 200 on failure; collapse double-process.
4. **Fix promo `incrementUsage`** (#3) and **invite `req.user.sub`** (#4) + Clerk metadata sync; atomic redemption.
5. **Additive Prisma migration** — `confidence`, `mae`, `mfe`, `realisedR`, `MistakeTag`/`TradeMistake`, `preTradeChecklistState` (data-preserving).
6. Publish the new `types.ts` / `services/api.ts` contract on the bus for Codex.
7. Money-path unit/integration tests (was zero). ⛔

## Phase 3 — Backend build (Claude lane)
- Endpoints for new fields (confidence, MAE/MFE, mistake tags, realised R, dual checklists).
- Analytics returns `{ value, valueR }` for the R/$ toggle; Green-days / Month-P&L aggregation.
- Prop-firm rule status + drawdown served computed for the Dashboard panel.
- **Retire** signal-logs + mail modules; remove `beta2025`/self-referral. Tests alongside. ⛔

## Phase 4 — Frontend redesign (Codex lane)
- Dark-mode design system from the comp; 5-section nav.
- Dashboard, Log-a-trade flow, Journal, Analytics, Playbooks, Settings.
- R/$ toggle, Low-performance mode, no-cross-import lint gate. ⛔

## Phase 5 — Parity, migration & retirement
- Prove no working capability lost; migrate existing trades into new shapes; remove retired screens/endpoints; data-migration tests. ⛔

## Phase 6 — Hardening & infra
- Full money-correctness suite; security (#10), secrets, CORS, rate limits; resolve dual-lockfile + mixed root `package.json`; CI runs tests + lint gates. Deploy verify. ⛔
- **Re-baseline the drifted migration history.** A fresh `prisma migrate deploy` does NOT
  reproduce the real schema (e.g. `User.isEarlySupporter` and other billing/referral columns
  were added to the old Supabase DB out-of-band and never captured as migrations). Local dev is
  currently synced via `prisma db push`. Squash/baseline migrations so `migrate deploy` == schema.

## Infra note — local Postgres (Supabase retired)
- DB now runs in `backend/docker-compose.yml` (`tradepilot-postgres`, host port 5544).
- `backend/.env` `DATABASE_URL`/`DIRECT_URL` point at it. Bring up: `cd backend && docker compose up -d`.
- Schema applied via `prisma db push` (see drift note above); seed via `pnpm seed`.

## Parallelism note
Phase 2/3 (Claude/backend) and Phase 4 (Codex/frontend design-system + static screens) can run
concurrently once the Phase 2 contract is published — Codex builds against the agreed `types.ts`
while Claude wires the backend.
