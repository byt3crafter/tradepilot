# Phase 1 Audit — JTradePilot Redesign

**Date:** 2026-06-25 · **Author:** Claude (backend lane) · **Status:** read-only findings for the
⛔ Phase 1 checkpoint. No code changed. Companion: `docs/TASKS.md`, `/CLAUDE.md`, `ROADMAP.md`.

Scope: (1) inventory of every backend capability, (2) a keep/redesign/retire/add matrix vs the
new design (`JTradePilot Trading Journal Redesign/`), (3) a money/data correctness audit of kept
surfaces, (4) the data-model deltas the redesign requires.

---

## 0. Executive summary

The product is feature-complete and the redesign is mostly a **re-presentation + targeted
additions**, not a rebuild. The data model already supports ~80% of the new design (prop-firm
rules, trades, playbooks, analytics). The redesign adds a handful of per-trade fields
(confidence, MAE/MFE, mistake tags, realised R) and a dual-checklist log flow.

**BUT** the money-critical layer is **not currently correct** — the audit surfaced one CRITICAL
and several HIGH defects that mean *paying users may not be getting access and paid features are
ungated*. Per the golden rule, these are fixed in Phase 2/3 **before** new features ride on top.

| Bucket | Count |
|--------|-------|
| Features to **keep as-is** | 8 |
| Features to **redesign** | 7 |
| Features to **retire** | 3 |
| Net-new capabilities to **add** | 7 |
| **Money/correctness defects** (1 CRITICAL, 3 HIGH, 4 MED, rest low) | 11 |

---

## 1. Backend capability inventory (condensed)

19 modules. Full endpoint table lives in git history of this audit; the capability roll-up:

| Capability | Modules | Money-critical | State |
|-----------|---------|:---:|------|
| Auth (Clerk JWT + JIT) | auth, users | – | live |
| Subscription billing (Paddle) | billing, PricingPlan, PromoCode | ✅ | live, **buggy** |
| Trial / lifetime entitlements | invites, admin, User | ✅ | live, **buggy** |
| Trade tracking | trades, broker-accounts, playbooks, trade-journals | ✅ | live |
| AI analysis | ai, AiAnalysis, ApiUsage (Gemini) | cost | live, **ungated** |
| Performance analytics | analytics, AssetSpecification | – | live |
| Risk mgmt (objectives, smart limits) | SmartLimit, TradingObjective | ✅ | live |
| Prop-firm compliance (drawdown, templates) | PropFirmTemplate, broker-accounts | ✅ | live |
| Compliance PDF | pdf | – | live |
| Admin dashboard | admin | ✅ | live |
| Referral system | User, InviteCode | – | live, **buggy** |
| Notifications | notifications | – | minimal |
| Signal logging | signal-logs | – | **DEAD stub** |
| Email | mail | – | **DEPRECATED** (Clerk does email) |
| Scheduled tasks | tasks | – | stub (hourly no-op cron) |

---

## 2. Keep / redesign / retire / add matrix (vs the new design)

New IA / nav: **Journal · Dashboard · Analytics · Playbooks · Settings** + account selector + Log-a-trade.

### KEEP (works, fits the new design with light reshaping)
| Feature | New home | Notes |
|---------|----------|------|
| Clerk auth + JIT provisioning | (infra) | no change |
| Broker accounts + account selector | Dashboard header | comp's "FTMO $50K — Phase 1" selector maps straight to BrokerAccount |
| Trading objectives / smart limits | Dashboard "Prop Firm Rules" panel | already model the Passed/Safe badges; serve computed status |
| Drawdown calc (trailing/static) | Dashboard equity curve overlay | reuse |
| Asset specifications | Settings | needed for pip→R math |
| Compliance PDF export | Analytics / account menu | prop-firm traders rely on it |
| Admin panel + maintenance mode | (infra, separate) | out of trader redesign scope |
| Prop-firm templates | account creation | reuse |

### REDESIGN (keep the capability, rebuild the surface)
| Feature | New form | Notes |
|---------|----------|------|
| Trade CRUD | "Log a trade" modal | adds confidence, MAE/MFE, mistake tags, dual checklists, est-R vs realised-R, screenshot drop |
| Trades list | **Journal** section | richer per-trade rows; R/$ toggle |
| Analytics | **Analytics** section | AVG R, Green days, Month P&L calendar, drawdown; R/$ everywhere |
| Dashboard | new dashboard | stat cards (Trades/Win%/Net R/Net P&L), Prop Firm Rules, equity curve ($/R), Recent Activity |
| Playbooks + setups | **Playbooks** section | "All setups", per-setup checklists feed the log flow |
| Trade journals | trade detail tab | mindset/exit/lessons stay |
| Checklist rules | **Pre-trade checklist** in log flow | merge user rules into the pre-trade checklist concept |

### RETIRE (with human sign-off)
| Feature | Why | Action |
|---------|-----|------|
| signal-logs module | dead stub, no endpoints | delete module |
| mail module | deprecated; Clerk sends email | delete module + deps |
| Hard-coded `beta2025` referral perk | security/abuse (see #5 below) | remove |

> Candidates **reviewed but KEPT**: AI analysis (keep, but gate + rate-limit), referral system
> (keep, but fix self-referral), notifications (keep, minimal), promo/invite codes (keep, fix).

### ADD (introduced by the new design)
| New capability | Backend work |
|----------------|--------------|
| Per-trade **Confidence** | `Trade.confidence` |
| **Mistake tags** | tag model + per-trade relation; analytics aggregation |
| **MAE / MFE excursion** | `Trade.mae`, `Trade.mfe` |
| **Realised R** (+ est R/P&L at entry) | compute/store from P&L ÷ initial risk |
| **Dual checklists** in log flow | wire ChecklistRule (pre-trade) + ChecklistItem (playbook) + capture per-trade state |
| **R/$ toggle** | analytics + activity endpoints return R alongside $ |
| **Green days / Month P&L calendar** | analytics aggregation grouped by day |

---

## 3. Money / data correctness audit (the golden-rule layer)

Severity-sorted. These gate Phase 2/3. Full detail with `file:line` in the commit that adds this file.

| # | Sev | Area | Finding | Fix phase |
|---|-----|------|---------|:--:|
| 1 | **CRITICAL** | webhook | `handleWebhookEvent` reads `snake_case` (`data.customer_id`, `next_billed_at`…) off the SDK's **camelCase** `EventEntity` → `customerId` is `undefined`, early-returns, so **every** Paddle event no-ops. Paid users are never granted access via webhook (only via manual `POST /billing/sync`). | 2 |
| 2 | HIGH | entitlement | **No backend entitlement guard exists.** Every paid + AI-cost endpoint is gated only by `JwtAccessGuard` (auth), not subscription. Any logged-in user (expired/free) can call AI + all pro features and burn LLM spend. | 2 |
| 3 | HIGH | promo | `incrementUsage()` is **never called** → `usedCount` stays 0 → `maxUses` unenforceable; discount codes infinitely reusable. | 2 |
| 4 | HIGH | invites | `claimInvite(code, req.user.id)` but the JWT strategy returns `sub`, not `id` → `userId` undefined → grant fails / code burned with `usedByUserId=undefined`; Clerk metadata never synced. | 2 |
| 5 | MED | webhook | No idempotency/replay protection; referral reward is read-modify-write (double `+30d` race); `transaction.completed` **and** `.paid` both sync (double-process); controller swallows all errors and returns **200** so Paddle never retries. | 2 |
| 6 | MED | entitlement | No single source of truth; `proAccessExpiresAt`/`trialEndsAt` expiry never enforced server-side; admin grant sets `proAccessExpiresAt` but `subscriptionStatus=CANCELED` and nothing reconciles. | 2 |
| 7 | MED | P&L | Balance + analytics sum only `profitLoss`; `commission`/`swap` ignored and the manual `CreateTradeDto` can't even capture them; gross-vs-net of `profitLoss` is undefined and differs by import source. | 4 |
| 8 | LOW | abuse | Hard-coded `beta2025` → permanent `isEarlySupporter`; self-referral allowed (`referredByUserId = self`) → self-reward; invite codes use non-crypto `Math.random`. | 3 |
| 9 | LOW | math | `calculateRR` overloads `0` for {invalid, zero-risk, wrong-side}; **no realised R-multiple computed anywhere**; analytics `pipSize` default inconsistent (1 vs skip); `riskOfRuin` computed then overwritten to 0 (dead); breakeven defined two ways. | 4 |
| 10 | LOW | infra | Webhook/JWT logging leaks full payloads; dev CORS allows all origins. | 6 |
| 11 | INFO | tests | **Zero functioning tests** on any money path (`auth.e2e-spec.ts` fully commented; 0 `*.spec.ts`). | 2–4 |

**Verified OK:** Paddle webhook *signature verification* is correct (`main.ts` rawBody →
`paddle.webhooks.unmarshal` in `billing.service.ts`). The bug is in *reading* the verified payload.

---

## 4. Data-model deltas required by the redesign

Designed in Phase 2; migrations must be **additive & data-preserving** (golden rule).

```prisma
model Trade {
  // ... existing ...
  confidence   Int?         // 1–5 confidence captured at log time
  mae          Float?       // max adverse excursion
  mfe          Float?       // max favourable excursion
  realisedR    Float?       // realised P&L ÷ initial risk (compute on close; store for query)
  commission   Float?       // already in schema — surface in manual DTO + parsers (#7)
  swap         Float?
  mistakes     TradeMistake[]
  preTradeChecklistState Json?  // captured pre-trade checklist answers
}

model MistakeTag {            // NEW — user-defined mistake taxonomy
  id     String @id @default(cuid())
  label  String
  userId String
  trades TradeMistake[]
  @@unique([userId, label])
}
model TradeMistake {          // NEW — join
  tradeId  String
  tagId    String
  @@id([tradeId, tagId])
}

model ProcessedWebhookEvent { // NEW — idempotency (#5)
  eventId    String   @id     // Paddle event/notification id
  type       String
  processedAt DateTime @default(now())
}
```
Non-schema: a single `resolveEntitlement(user)` resolver + `EntitlementGuard` (#2/#6); analytics
endpoints return `{ value, valueR }` pairs for the R/$ toggle; a daily cron (existing `tasks`
module) to enforce trial/grant expiry.

---

## 5. Recommended sequencing → see `ROADMAP.md`

Phase 2 leads with the **money correctness fixes (#1–#6)** + their tests, *then* the additive
schema deltas, because every new feature depends on a correct entitlement + billing base.
