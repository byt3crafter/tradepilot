# CLAUDE.md — TradePilot Charter

> **This file is the single source of truth.** Both AI teams (Claude + Codex) read it
> before every task. Keep it current. When reality and this file disagree, fix one of them.

---

## 0. Mission

**Full redesign + feature overhaul of JTradePilot — rebuild the product around the new
design, modernize and add features, retire what no longer makes sense, but keep every piece
of solid, working functionality intact.**

This is **not** a from-scratch rewrite and **not** a cosmetic reskin. The live app at
https://jtradepilot.com works and has paying users. We are reshaping it into the new vision:

- **Adopt the new design** as the target UX (clean dark-mode, prop-firm-first journal).
  Design source of truth: **`JTradePilot Trading Journal Redesign/JTradePilot.dc.html`** +
  **`JTradePilot Trading Journal Redesign/screenshots/`**.
- **Add / elevate features** the new design introduces (see §3): Confidence rating, Mistake
  tags, trade **Excursion (MAE/MFE)**, R/$ toggle everywhere, Pre-trade + Playbook checklists,
  prop-firm rules dashboard, Low-performance mode.
- **Retire features that no longer make sense** — but only after the audit (Phase 1) decides,
  with human sign-off. Never delete a working capability on a hunch.
- **Preserve all solid functionality** — existing trade logging, P&L/risk math, broker
  accounts, prop-firm objectives & smart limits, playbooks, billing, auth. Improve them; don't
  regress them.

The redesign covers the **trader-facing app**. Billing, auth, and admin are infrastructure
that must keep working through the change.

---

## 1. The Golden Rule (overrides everything)

> **Redesign without regressing what works — and money stays provably correct.**
>
> Every feature we keep must come out the other side at least as correct as it went in. In
> particular: Paddle webhooks stay **signature-verified and idempotent**; subscription →
> entitlement remains a tested state machine (**no paid access without a valid subscription, no
> accidental loss of access**); trade **P&L / risk / R-multiple** math stays unit-tested and
> correct (pips, lot size, commission, swap). Existing user **data is never lost or corrupted**
> by a migration or a rebuilt screen.
>
> **Priority order: don't break what works > correctness (money first) > the new design >
> new features > polish.** If a redesign step would regress a working capability or money
> correctness, it does not ship until that's solved.

---

## 2. Locked Tech Stack

Do **not** introduce new frameworks, languages, or swap core libraries without updating this
section and getting human sign-off. The redesign is delivered **within** this stack.

| Layer            | Choice (locked)                                                        |
|------------------|------------------------------------------------------------------------|
| Backend          | **NestJS 10** + TypeScript 5.4 (`backend/`)                            |
| ORM / DB         | **Prisma 5** + **PostgreSQL**                                          |
| Auth             | **Clerk** (JWT, JWKS via `jwks-rsa`), JIT user provisioning            |
| Billing          | **Paddle** (`@paddle/paddle-node-sdk`), webhook-driven                 |
| AI               | **Google GenAI (Gemini)** — trade analysis (keep/redesign — see §3)    |
| Email / PDF      | Nodemailer / Puppeteer                                                  |
| Frontend         | **Vite 6 + React 19 + TypeScript** (repo root)                         |
| Styling          | **Tailwind CSS 3** (dark-mode design system per the comp)              |
| Charts           | lightweight-charts + Recharts                                          |
| Package manager  | **pnpm** (primary). `package-lock.json` is legacy — see §7.            |
| Container        | Docker (Node 22-alpine, multi-stage, non-root)                         |

**Runtime facts** (verified, keep accurate):
- Backend listens on **`PORT` (default 8080)**. In **dev** the global prefix is `/api`; in
  **production** Nginx strips `/api`, so the app sets **no prefix**. (`backend/src/main.ts`)
- Backend is created with **`bodyParser: false`** + a custom `express.json({ verify })` that
  stashes **`req.rawBody`** — this exists for **Paddle webhook signature verification**. Do not
  remove it or move webhook routes behind the JSON parser without preserving raw body access.
- Global `ValidationPipe` is `whitelist + forbidNonWhitelisted + transform`. DTOs are mandatory.
- CORS is permissive on localhost in dev, allowlist-only (`FRONTEND_URL`) in prod.

---

## 3. Domain Model (the nouns) + redesign deltas

JTradePilot is a SaaS trade journal / playbook / prop-firm tool for forex & CFD traders.

**Identity & billing** (keep)
- `User` (Clerk id), role, subscription status, trial window, Paddle ids, referral tracking.
- `PricingPlan`, `PromoCode`, `InviteCode`, `SystemConfig` (maintenance mode).

**Trading core** (keep + extend)
- `BrokerAccount` — DEMO / LIVE / PROP_FIRM; balance, leverage, fee model, consistency score.
  - `TradingObjective` — profit target, min trading days, max loss, max daily loss
    → **the new Dashboard "Prop Firm Rules" panel renders directly off these** (Passed/Safe
    badges + progress bars). Make sure the API serves the computed status, not just raw numbers.
  - `SmartLimit` — risk/trade, max trades/day, max losses/day; SOFT or HARD severity.
- `Trade` — entry/exit, direction, risk %, SL/TP, P&L, commission, swap, result, screenshots.
  - `TradeJournal` — mindset, exit reasoning, lessons.
  - `AiAnalysis` — Gemini summary, mistakes, good points.
- `Playbook` → `PlaybookSetup` → checklist items; `ChecklistRule`; `AssetSpecification`.

**New / elevated concepts introduced by the redesign** (design these in Phase 2; confirm
exact data model before building):
- **Confidence** — a per-trade confidence rating captured at log time.
- **Mistake tags** — taggable mistakes per trade (drives analytics).
- **Excursion (MAE / MFE)** — max adverse / favourable excursion per trade.
- **R/$ toggle** — every money figure must also be expressible in **R multiples**; equity curve,
  stats cards, and activity feed all switch between `$` and `R`.
- **Pre-trade checklist** vs **Playbook checklist** — two distinct checklists in the log-trade flow.
- **Est. R / P&L** at entry vs **Realised R** at close.
- **Low performance mode** — a UI/runtime toggle to reduce chart/animation cost.

**Information architecture (target nav):** Journal · Dashboard · Analytics · Playbooks · Settings.

**Money-critical surfaces** (the things the Golden Rule protects):
`backend/src/billing/**`, the Paddle webhook handler, `User` subscription/entitlement fields,
any paid-feature guard, and the P&L/R/risk math in `Trade` + `utils/calculations.ts`.

---

## 4. Lanes — who owns what (NEVER edit the other team's files)

| Team       | Owns (sole editor)                                                                 |
|------------|------------------------------------------------------------------------------------|
| **Claude** | `backend/**` — NestJS modules, Prisma schema & migrations, Paddle, Clerk auth, AI, backend tests. Also `tools/**` (coordination infra). |
| **Codex**  | Frontend at repo root — `App.tsx`, `index.tsx`, `index.html`, `pages/**`, `components/**`, `context/**`, `services/**`, `utils/**`, `hooks/**`, `styles/**`, `public/**`, `constants.ts`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`. Frontend infra/CI. **Owns implementing the new design** from `JTradePilot Trading Journal Redesign/`. |

The design folder `JTradePilot Trading Journal Redesign/` is **read-only reference** — do not
build the app inside it; it is the spec Codex implements against in the real frontend tree.

**The contract / shared no-man's-land** (change only by mutual agreement via the message bus,
never unilaterally):
- `types.ts` (root) — shared TypeScript interfaces; the API shape contract. The new concepts in
  §3 will extend this — coordinate every change on the bus.
- `services/api.ts` (root) — the frontend's view of backend endpoints. Backend route/response
  changes → Claude **posts a message** with the new contract; Codex updates `services/api.ts` + `types.ts`.
- Backend DTOs / response shapes — Claude owns them, but a change is a contract change: announce it.
- Root `package.json` is currently **mixed** (frontend + stray backend deps); treat frontend
  sections as Codex's, avoid backend churn there until the §7 cleanup.

**Branch & worktree discipline**
- Claude works on `claude/*` branches in a **separate git worktree**; Codex on `codex/*`.
- The **human merges to `main`.** Neither AI pushes to `main`.
- Boundaries enforced by lint gates (no cross-imports) from the first build phase.

---

## 5. Coordination protocol

Both teams share a task board + message bus via the **coordination MCP**
(`tools/coordination-mcp/`, **`http://localhost:8766/mcp`** — TradePilot uses 8766; PulaPoint
owns 8765). See `docs/TASKS.md` (created in Step 2) for the seeded task list.

- Pull work with `claim_task`; flip status with `update_task` (`todo → in_progress → done`, or
  `blocked` with a reason). Never silently abandon a claimed task.
- Cross-team requests go through `post_message(sender, recipient, body)`; poll with
  `get_messages`. **Any contract change (§4) MUST be announced on the bus.**
- `board()` is the at-a-glance status. Check it before claiming.

---

## 6. Phased build plan — STOP at every ⛔ checkpoint

At each ⛔: **stop, summarize what changed, show the key design + test results, and wait for the
human's go-ahead.** Do not roll into the next phase unprompted.

- **Phase 0 — Charter & coordination infra.** This file + the coordination MCP + bus tooling.
  ⛔ *(done — awaiting go-ahead.)*
- **Phase 1 — Audit & redesign mapping.** Read-only. (a) Inventory every current feature &
  backend capability. (b) Map each against the new design → a **keep / redesign / retire / add**
  matrix. (c) Audit money/data correctness (billing, webhooks, P&L) for anything we keep.
  Output: `docs/AUDIT.md` + the matrix + a seeded backlog on the board. No code changes. ⛔
- **Phase 2 — Data model & API contract.** Extend the Prisma schema + DTOs for the new concepts
  (confidence, mistake tags, MAE/MFE, dual R/$ outputs, dual checklists) **without losing
  existing data**; write safe migrations; publish the new `types.ts`/`api.ts` contract on the
  bus. ⛔
- **Phase 3 — Backend build (Claude lane).** Implement/refactor endpoints for the redesigned &
  new features; compute prop-firm rule statuses and R-values server-side; retire dead endpoints
  per the matrix. Tests alongside. ⛔
- **Phase 4 — Frontend redesign (Codex lane).** Rebuild the UI to match the comp: dark-mode
  design system, the 5-section nav, Dashboard (stat cards, Prop Firm Rules, equity curve with
  $/R toggle, recent activity), the Log-a-trade flow (checklists, confidence, MAE/MFE, mistake
  tags, screenshot drop), Analytics, Playbooks, Settings. Enforce no-cross-imports. ⛔
- **Phase 5 — Parity, migration & retirement.** Prove no solid functionality was lost; migrate
  existing user data into new shapes; remove retired screens/endpoints; data-migration tests. ⛔
- **Phase 6 — Hardening & infra.** Money-correctness test suite, security pass (auth, CORS,
  secrets, rate limiting), resolve §7 debt (single package manager, split root package.json,
  CI running tests + lint gates on PRs), deploy verification. ⛔

---

## 7. Explicitly deferred / decided later

- **What to retire is decided in Phase 1**, not now — don't pre-emptively delete features
  (referrals, promo/invite codes, AI analysis, PDF export, signal logs, notifications, admin
  panel, maintenance mode are all candidates *for review*, not for deletion on sight).
- **Dual lockfiles / mixed root `package.json`** — `package-lock.json` + stray NestJS deps in
  the root `package.json` are known debt; scheduled for **Phase 6**.
- **No new external integrations** (e.g. TradingView MCP) during the redesign.
- **Mobile app.**
- **Reorganizing the frontend into a `frontend/` subdir** — would churn every path; revisit only
  if the human asks.
- The ad-hoc docs under `docs/` — leave them; `AUDIT.md` becomes the new source of truth.

---

## 8. Working rules for both teams

- **Always re-run the tests/build yourself** before trusting a sub-agent's report.
  Backend: `cd backend && pnpm test` / `pnpm test:e2e` / `pnpm build`.
  Frontend: `pnpm build` at root.
- Conventional commits (`fix:`, `feat:`, `test:`, `chore:`, `refactor:`). Commit per logical unit.
- Keep `ROADMAP.md` (created in Phase 1) and this file current.
- Never commit secrets. `.env` stays untracked.
- When unsure whether a change is money-critical or risks a regression, treat it as if it is.
