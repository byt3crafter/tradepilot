# TradePilot — Overnight Bug-Hunt Report

_Run date: 2026-06-30. Worktrees: backend `/home/d0v1k/Projects/TradePilot-claude/backend`, frontend `/home/d0v1k/Projects/TradePilot`._

---

## 1. TL;DR

| Metric | Count |
|---|---|
| Unit tests run | 16 |
| Unit tests passed | 16 |
| Unit tests failed | 0 |
| Backend E2E suites | 1 (failed to run — empty/disabled spec, **0 runnable tests**) |
| Frontend `pnpm build` | PASS |
| Frontend `tsc --noEmit` | FAIL — 26 type errors |
| Endpoint health probes | All healthy (no 5xx, no timeouts) |

**Confirmed bugs: 26.**

By severity: **1 critical · 5 high · 13 medium · 7 low.**

Money-critical bugs: **18 of 26.**

Auto-fixed this run: **5** (all non-money-critical). Need human review: **21** (including all 18 money-critical).

> Headline risk: the autobot order/close paths (`autobot.service.ts`) have multiple non-atomic read-then-write money races that can breach hard caps, bypass the kill switch, and double-book P&L; and the backend paywall guard (`EntitlementGuard`) exists but is wired to **zero** routes — every authenticated user has full paid/AI access regardless of subscription, and toggling "free mode" off will not restore the paywall.

---

## 2. Test & Build Results

### Backend unit tests — PASS
Command: `./node_modules/.bin/jest --silent --runInBand`
Total 16 tests across 3 suites, all passing:
- `src/billing/billing.service.spec.ts` — PASS
- `src/auth/entitlement.spec.ts` — PASS
- `src/market-data/symbol-map.spec.ts` — PASS

Log lines in output are expected NestJS logger output from passing tests (Paddle config warnings), not failures.

### Backend E2E — FAIL (no runnable tests)
Command: `./node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand`

```
FAIL test/auth.e2e-spec.ts
  ● Test suite failed to run

    Your test suite must contain at least one test.

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        2.364 s
Ran all test suites.
```

Cause (not env/DB): the only e2e spec, `test/auth.e2e-spec.ts`, is entirely commented out (legacy bcrypt/local-login tests disabled after the Clerk migration). `testRegex` (`.e2e-spec.ts$`) matches only this file, which defines no tests, so Jest exits non-zero at suite collection. Jest never bootstrapped Nest or touched Postgres. **Net: there are effectively zero runnable backend E2E tests.** Not fixed.

### Frontend build — PASS
Command: `CI=true pnpm build`
```
✓ 921 modules transformed.
dist/index.html                     4.49 kB │ gzip:   1.91 kB
dist/assets/index-Ca7VtCnc.css     84.25 kB │ gzip:  14.85 kB
dist/assets/index-Di5nuusY.js   2,394.51 kB │ gzip: 654.27 kB
✓ built in 4.47s
```
Only non-fatal warnings (>500 kB chunk size; stale browserslist data).

### Frontend type-check — FAIL (26 errors)
Command: `npx tsc --noEmit` (config `/home/d0v1k/Projects/TradePilot/tsconfig.json`)

Vite build passes because it transpiles without type-checking; `tsc --noEmit` surfaces 26 errors. Verbatim:
```
App.tsx(196,36): error TS2304: Cannot find name 'AuthPage'.
components/brain/BrainDashboard.tsx(1210,17): error TS2322: Type '{ key: any; moduleData: any; learnEvents: any; }' is not assignable to type '{ moduleData: BrainScoreboardModule; learnEvents: BrainEvent[]; }'.
  Property 'key' does not exist on type '{ moduleData: BrainScoreboardModule; learnEvents: BrainEvent[]; }'.
context/AnalysisContext.tsx(31,43): error TS2339: Property 'getAnalyses' does not exist on type 'ApiService'.
context/AnalysisContext.tsx(51,15): error TS2339: Property 'createAnalysis' does not exist on type 'ApiService'.
context/AnalysisContext.tsx(57,15): error TS2339: Property 'updateAnalysis' does not exist on type 'ApiService'.
context/AnalysisContext.tsx(63,15): error TS2339: Property 'deleteAnalysis' does not exist on type 'ApiService'.
pages/CryptoPage.tsx(1596,35): error TS2339: Property 'configured' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1599,27): error TS2339: Property 'configured' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1602,35): error TS2339: Property 'testnet' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1605,27): error TS2339: Property 'testnet' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1608,23): error TS2339: Property 'keyMask' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1610,32): error TS2339: Property 'keyMask' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1619,26): error TS2339: Property 'configured' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1622,64): error TS2339: Property 'configured' does not exist on type 'unknown'.
pages/CryptoPage.tsx(1623,25): error TS2339: Property 'configured' does not exist on type 'unknown'.
pages/ForgotPasswordPage.tsx(2,10): error TS2614: Module '"../App"' has no exported member 'AuthPage'. Did you mean to use 'import AuthPage from "../App"' instead?
services/api.ts(175,68): error TS2552: Cannot find name 'AiOpportunity'. Did you mean 'ArbOpportunity'?
services/api.ts(176,46): error TS2304: Cannot find name 'AiStrategy'.
services/api.ts(438,12): error TS2347: Untyped function calls may not accept type arguments.
services/api.ts(507,68): error TS2552: Cannot find name 'AiOpportunity'. Did you mean 'ArbOpportunity'?
services/api.ts(508,46): error TS2304: Cannot find name 'AiStrategy'.
services/walletConnect.ts(20,18): error TS2749: 'EthereumProvider' refers to a value, but is being used as a type here. Did you mean 'typeof EthereumProvider'?
services/walletConnect.ts(24,25): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
services/walletConnect.ts(31,59): error TS2749: 'EthereumProvider' refers to a value, but is being used as a type here. Did you mean 'typeof EthereumProvider'?
services/walletConnect.ts(32,33): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
services/walletConnect.ts(68,12): error TS2749: 'EthereumProvider' refers to a value, but is being used as a type here. Did you mean 'typeof EthereumProvider'?
```
Not fixed (frontend lane; left for review).

### Endpoint health — PASS
```
200  /api/billing/status
401  /api/quant/leaderboard      (auth required — OK)
401  /api/quant/learning/policy  (auth required — OK)
401  /api/quant/stats            (auth required — OK)
401  /api/autobot/status         (auth required — OK)
200  /                           (frontend root)
```
Response times ~1.7–2.8s, under timeout. All 401s are expected unauthenticated behavior. Note: `/api/quant/learning/policy` unauthenticated returns the Nest 401 JSON object `{"message":"Unauthorized","statusCode":401}`, not an array; the array shape on the authed path could not be confirmed without a token.

---

## 3. Confirmed Bugs (money-critical first, then by severity)

### MONEY-CRITICAL

#### M1. [CRITICAL · money] maxTotal / cash exposure TOCTOU — overspend past hard caps
- **File:** `backend/src/autobot/autobot.service.ts:303`
- **What breaks:** Total-exposure and cash guards are pure read-then-write with no lock. `manualTrade()` reads filled trades (l.301), sums exposure, checks `exposure >= w.maxTotalUsd` (l.303), computes `room = min(maxPerTradeUsd, maxTotalUsd-exposure, bal.usdce)` (l.304), then creates a pending trade + `placeOrder`. `runWallet()` does the identical sequence (l.681–683, 728–730). The only mutex is `this.executing` (l.632), which guards tick re-entry **only** — it does not cover HTTP-triggered `manualTrade()`/`closePosition()`, which interleave at every `await`. `bal.usdce` also comes from a 5s `collCache`, so concurrent callers see the same cash and each sizes against the full balance.
- **Scenario:** maxTotalUsd=$100, filled exposure=$90, cash=$10. Tick reads exposure=$90; before it writes, an HTTP `manualTrade()` also reads $90. Both compute room=$10 and both place ~$10. ~$110 committed (cap breached), ~$20 spent against a $10 cash balance. A double-click on the manual Buy reproduces it with two `manualTrade()` calls alone.
- **Fix:** Serialize all order-placing paths per wallet (in-process per-userId async mutex, or Postgres advisory lock / `SELECT … FOR UPDATE` on the wallet row in a tx). Recompute exposure+cash inside the critical section right before `placeOrder`, and atomically reserve the size (e.g. `exposureReservedUsd` incremented in the same tx).
- **Status:** NEEDS REVIEW (untouched).

#### M2. [HIGH · money] EntitlementGuard wired to no route — backend paywall not enforced at all
- **File:** `backend/src/auth/guards/entitlement.guard.ts:22`
- **What breaks:** `EntitlementGuard`/`resolveEntitlement()` were built to fix the documented hole that no endpoint enforced entitlement. But grep shows the guard is used in **no** controller and is **not** registered as an `APP_GUARD` (only `ThrottlerGuard` is). Paid/cost endpoints (`ai.controller.ts`, `chatgpt.controller.ts`, `quant.controller.ts`) are protected by `JwtAccessGuard` only. The fix is dead code: any authenticated user gets full paid/AI access. The "free mode" toggle is an illusion — turning it OFF will not restore the paywall, because the guard that reads the flag never runs.
- **Scenario:** A user with `subscriptionStatus=INACTIVE` (default for every new signup) and an expired trial calls the AI/chatgpt/quant endpoints. `JwtAccessGuard` passes; no entitlement check; they consume paid Gemini/AI cost endpoints for free.
- **Fix:** Attach `@UseGuards(JwtAccessGuard, EntitlementGuard)` to all paid controllers (or register route-scoped behind a metadata decorator), and add an e2e test asserting a non-entitled user gets 403 when free mode is off.
- **Status:** NEEDS REVIEW (untouched).

#### M3. [HIGH · money] Kill switch race — `kill()` during an in-flight tick still places a live order
- **File:** `backend/src/autobot/autobot.service.ts:635`
- **What breaks:** `tick()` snapshots the active wallet set once (`findMany({ mode:'auto', killSwitch:false })`, l.635) then loops `runWallet(w)` on the stale in-memory `w`. `runWallet` never re-reads the wallet or re-checks `killSwitch`/`mode` before `placeOrder` (l.750). A tick stays live for a long time (network round-trips + AI per wallet). `kill()` (l.583) and the daily/drawdown breakers write `killSwitch=true`/`mode='off'` to the DB, but that does not affect the already-captured object.
- **Scenario:** User clicks kill (`mode='off'`, `killSwitch=true` in DB). The current tick already loaded `w` with `killSwitch=false` mid-`runWallet`, so it proceeds to `createAndPostMarketOrder` and spends real USDC **after** the user halted the bot.
- **Fix:** Re-fetch the wallet (or at least `killSwitch`/`mode`) immediately before each `placeOrder` and abort if halted. Combine with the M1 per-wallet lock so `kill()` can take the lock / set a flag the executor checks each iteration.
- **Status:** NEEDS REVIEW (untouched).

#### M4. [HIGH · money] Daily-loss & max-drawdown breakers read a stale snapshot while losses book concurrently
- **File:** `backend/src/autobot/autobot.service.ts:656`
- **What breaks:** `runWallet` checks the daily-loss breaker `w.dailyPnlUsd <= -dailyLossLimitUsd` (l.656) and the drawdown breaker (l.665–669) using the `w` snapshot from l.635, **once** at the top — not before each order. The separate `@Interval('autobot-resolve', 10min)` `resolveTrades()` (l.783) increments `dailyPnlUsd` in the DB (l.799) when a position settles to a loss. The two intervals run independently on overlapping schedules.
- **Scenario:** dailyLossLimitUsd=$50, snapshot dailyPnlUsd=-$40 (passes). While the tick runs, `resolveTrades` books a loss and sets dailyPnlUsd=-$80 in the DB. The in-flight tick still holds -$40, so the breaker stays open and opens new positions $30 past the limit. Drawdown breaker has the same stale-`w` exposure.
- **Fix:** Re-read `dailyPnlUsd`/`netDeposits` and re-evaluate breakers immediately before each order; atomically halt (`mode='off'`) in the same tx that books a loss.
- **Status:** NEEDS REVIEW (untouched).

#### M5. [HIGH · money] closePosition / closeAll double-sell + double-book
- **File:** `backend/src/autobot/autobot.service.ts:264`
- **What breaks:** `closePosition()` fetches the live position (l.257–262), reads `shares`, places a SELL for the full `shares` (l.264), then `findFirst`s the matching filled trade (l.267) and updates it to `resolved` booking pnl (l.270). No lock, no idempotency guard. `closeAll()` iterates sequentially, but two concurrent HTTP calls race.
- **Scenario:** Two close requests for the same tokenId run concurrently; both read size=100 before either SELL settles, both SELL 100 → 200 shares sold against a 100-share position (oversold/short), or the second errors after partial fill. Both `findFirst` the same `filled` row and both mark it `resolved` + publish a learn neuron → realized P&L double-booked.
- **Fix:** Take the per-wallet lock around `closePosition`, re-read live size inside the lock, make resolution idempotent (`updateMany({ where: { id, status: 'filled' } })` and act on count).
- **Status:** NEEDS REVIEW (untouched).

#### M6. [MEDIUM · money] Webhook idempotency is check-then-insert — concurrent duplicates double-apply promo usedCount
- **File:** `backend/src/billing/billing.service.ts:315`
- **What breaks:** `handleWebhookEvent()` dedupes via `ProcessedWebhookEvent.findUnique(eventId)` at the top (l.314–323) but only inserts the dedup row at the very end (l.533–537) — non-atomic, no unique-claim around the body. The referral grant was hardened with an atomic `updateMany(… where hasRewardedReferrer:false)` (l.464–467), but the promo increment on `transaction.completed` (l.401–408, `promoCode.updateMany({ data: { usedCount: { increment: 1 } } })`) has no such guard. Two concurrent deliveries of the same event both pass the `findUnique` check and both increment.
- **Scenario:** Paddle delivers the same `transaction.completed` twice in a short window. `PromoCode.usedCount` increments by 2 for one redemption; a promo with maxUses=100 hits its cap early, denying the discount to later legitimate customers (`createCheckoutTransaction` skips the discount once `usedCount>=maxUses`, l.162–163).
- **Fix:** Make dedup a real claim — insert `ProcessedWebhookEvent(eventId)` FIRST inside a try, proceed only if the insert succeeded (P2002 → already processed → return). Or wrap the handler in a tx that creates the dedup row before non-idempotent effects.
- **Status:** NEEDS REVIEW (untouched).

#### M7. [MEDIUM · money] syncSubscription only downgrades ACTIVE — TRIALING/PAST_DUE stay entitled forever
- **File:** `backend/src/billing/billing.service.ts:232`
- **What breaks:** When Paddle returns no active/trialing/past_due subscription, the DB is updated to CANCELED **only if** `user.subscriptionStatus === ACTIVE`. A TRIALING/PAST_DUE user gets `{status: CANCELED}` returned but never written. `resolveEntitlement()` grants pro whenever `subscriptionStatus === 'TRIALING'` unconditionally (it does not re-check `trialEndsAt` in that branch), so a user stuck at TRIALING keeps paid access indefinitely. The manual `/billing/sync` reconciliation net fails to close this.
- **Scenario:** Trial sets DB=TRIALING; the trial subscription later expires in Paddle with no `subscription.canceled` webhook delivered. `/billing/sync` returns empty, returns CANCELED but leaves DB at TRIALING → pro forever.
- **Fix:** In the empty-subscription branch, persist CANCELED for any currently-entitled status (TRIALING/PAST_DUE/ACTIVE), not just ACTIVE, and sync Clerk metadata.
- **Status:** NEEDS REVIEW (untouched).

#### M8. [MEDIUM · money] manualTrade per-trade / max-total limit bypassed by `Math.max(1, …)` floor
- **File:** `backend/src/autobot/autobot.service.ts:305`
- **What breaks:** `sizeUsd = Math.max(1, Math.floor(Math.min(body.sizeUsd || maxPerTradeUsd, room) * 100) / 100)`. Unlike `runWallet` (l.729 `if (room < 1) break;`), `manualTrade` has no `room<1` guard. When the binding cap is below $1, `Math.max(1,…)` overrides it and forces a $1 order over the user's limit. The downstream `sizeUsd < 1` guard (l.306) can never catch it.
- **Scenario:** maxPerTradeUsd=0.5, cash=100, exposure=0 → room=0.5 → sizeUsd=max(1,0.5)=1.00 → a $1 BUY (2× the per-trade limit). Likewise maxTotalUsd=10, exposure=9.6 → room=0.4 → sizeUsd=1 → total exposure 10.6 over cap.
- **Fix:** Add `if (room < 1) throw new BadRequestException(...)` before sizing and clamp `sizeUsd` to `room`; drop `Math.max(1,…)`.
- **Status:** NEEDS REVIEW (untouched).

#### M9. [MEDIUM · money] closePosition books realized P&L at full mark while selling at mark−5¢ floor
- **File:** `backend/src/autobot/autobot.service.ts:266`
- **What breaks:** SELL is placed at `mark − 0.05` (FAK, `placeOrder` l.867) but proceeds are computed as `shares * mark` (full mark, l.266); booked pnl (l.269–270) and the "Closed +$X" learn neuron (l.271) use that optimistic figure. Actual fill can be up to 5¢/share worse.
- **Scenario:** 1000 shares, mark=0.50, SELL cap 0.45, fills at 0.46. Real proceeds ~$460, code reports $500, overstating the gain by ~$40. The close response and recorded trade are wrong (headline status self-corrects from data-api next poll; the booked row does not).
- **Fix:** Re-read the actual fill (`resp.makingAmount`/price, or refetch positions) and book proceeds from the executed price.
- **Status:** NEEDS REVIEW (untouched).

#### M10. [MEDIUM · money] closePosition marks only ONE filled row resolved for the whole position
- **File:** `backend/src/autobot/autobot.service.ts:267`
- **What breaks:** It sells all `shares` but resolves only the single most-recent `findFirst` filled row (l.267) and books `pnl = proceeds(all shares) - that one row's sizeUsd` (l.269). If multiple filled rows exist for the same tokenId (manualTrade has no held-token check; auto+manual buys stack), the other rows stay `filled` forever.
- **Scenario:** User manually buys tokenX twice ($5+$5). closePosition sells the full ~$10; proceeds counted against only one $5 row (inflated pnl), the second $5 row stays `filled`. `status.exposureUsd` and the exposure sums in `runWallet`/`manualTrade` (l.302, 408, 682) keep counting the orphaned $5 as open, blocking capital and overstating exposure indefinitely.
- **Fix:** Resolve/aggregate ALL filled rows for the tokenId on close (sum their sizeUsd as cost basis), or mark every matching filled row resolved.
- **Status:** NEEDS REVIEW (untouched).

#### M11. [MEDIUM · money] Daily-loss breaker ignores manual closes and manual trades
- **File:** `backend/src/autobot/autobot.service.ts:656`
- **What breaks:** Breaker halts when `w.dailyPnlUsd <= -abs(dailyLossLimitUsd)` (l.656); `dailyPnlUsd` is incremented **only** in `resolveTrades` (l.799). `closePosition` (l.251–275) books a realized loss on the trade but never decrements `dailyPnlUsd`; `manualTrade` (l.296–324) never increments `dailySpentUsd`/`dailyPnlUsd`. Manual activity is invisible to the halt.
- **Scenario:** dailyLossLimitUsd=$20. User manually closes losers for −$80 in one day; `dailyPnlUsd` stays 0, the bot is never halted and keeps auto-trading on a blown day.
- **Fix:** On every realized event (`closePosition`, `closeAll`) increment `dailyPnlUsd` by booked pnl; increment `dailySpentUsd` in `manualTrade` on fill.
- **Status:** NEEDS REVIEW (untouched).

#### M12. [MEDIUM · money] Cross-market (NegRisk) arb scanner reports false riskless arbs when a leg is filtered out
- **File:** `backend/src/quant/quant.service.ts:98`
- **What breaks:** `scanArbs()` builds the NegRisk arb from `mks = (e.markets||[]).filter(m => m.enableOrderBook!==false && !m.closed)`. The riskless cross-market arb is valid only if ALL outcomes are bought, but any outcome whose market is closed/`enableOrderBook===false` is silently dropped, then `edge = 1 - sumYes` is computed over surviving legs only (l.110–112). A missing leg lowers `sumYes` and manufactures/inflates the edge. If the dropped outcome is the one that resolves Yes, buying the rest pays $0 — a guaranteed loss presented as a riskless arb on the manual Arbitrage desk (which has a Buy action).
- **Scenario:** 5-market NegRisk event, one already closed. The 4 remaining Yes sum to 0.85 → reported "+83% edge". User buys all 4; the excluded outcome resolves Yes; all 4 pay $0.
- **Fix:** Emit a cross-market arb only when surviving legs cover the complete mutually-exclusive set (compare `legs.length` to the event's full market count); otherwise skip or flag as non-riskless.
- **Status:** NEEDS REVIEW (untouched). _Confidence: medium._

#### M13. [MEDIUM · money] JWT access tokens accepted with no issuer/audience validation
- **File:** `backend/src/auth/strategies/jwt-access.strategy.ts:30`
- **What breaks:** The passport-jwt strategy uses `issuer: undefined` (issuer validation explicitly removed) and no `audience` option. The only checks are RS256 signature against the Clerk JWKS, expiry, and presence of `sub` (l.44). Nothing verifies the token was minted as a session token for THIS app. Clerk instances issue multiple token types/audiences signed by the same JWKS (session, OAuth `azp`, machine/JWT-template). Any such token validates and is turned into a full session via `validateClerkUser()` (which even JIT-provisions a User from `sub`).
- **Scenario:** A token signed by the same Clerk instance but for a different audience/origin (another frontend, an OAuth access token, a custom JWT-template token with a different `azp`) presented as `Authorization: Bearer …` is accepted; `validate()` provisions/loads the User and grants an authenticated (potentially ADMIN via `payload.role`/`public_metadata.role`) session.
- **Fix:** Restore `issuer: CLERK_ISSUER_URL`, add `audience` validation matching the Clerk frontend/JWT-template audience, and assert `payload.azp`/`payload.aud` against an allowlist in `validate()`. Keep `algorithms:['RS256']`.
- **Status:** NEEDS REVIEW (untouched). _Confidence: medium._

#### M14. [MEDIUM · money] Arb-config price thresholds: frontend treats them as cents, backend stores 0..1 fractions and clamps to 0.999
- **File:** `components/quant/QuantManualArbDesk.tsx:349`
- **What breaks:** Backend treats `safeMinPrice`/`immMinPrice` as probabilities 0..1 (status returns 0.95/0.90; `setArbConfig()` clamps with `num(v, 0.5, 0.999)`). The frontend labels these "Safe min price (¢)" / "Imminent min price (¢)" (l.349, 363), seeds cents-style fallbacks 70/85 (l.286, 292), and on save sends `Number(safeMinPrice)` raw (l.321). Opportunity rows display price as cents via `toCents()`, reinforcing the wrong mental model.
- **Scenario:** User sees "95¢" under a "¢" label showing 0.95, edits it to 90/95 (cents); backend runs `num(95,…)→0.999`, pinning thresholds to 99.9¢. The settlement-lag scan then requires a ~99.9¢ favorite, collapsing the Opportunities list and silently over-restricting the auto loop's arb filter. The saved value redisplays as 0.999, not the 95 typed, with no error.
- **Fix:** Pick one unit. Simplest: keep backend 0..1; frontend display/seed as cents (`*100`, defaults 95/90) and divide by 100 before POST (validate 50..99.9¢). Fix fallback defaults 70/85 → match backend 0.95/0.90. (Frontend lane.)
- **Status:** NEEDS REVIEW (untouched).

#### M15. [LOW · money] Missing PADDLE_WEBHOOK_SECRET_KEY → HTTP 400, so Paddle never retries and events are dropped forever
- **File:** `backend/src/billing/billing.controller.ts:86`
- **What breaks:** `unmarshalWebhook()` throws `InternalServerErrorException('Webhook secret is missing')` when the secret is unset (`billing.service.ts:291–293`). The controller's try/catch (l.86–91), intended only for forged signatures, translates ANY thrown error into `BadRequestException` (400). Paddle treats 4xx as permanent (no retry) and 5xx as retryable. A misconfig window (secret missing/rotated/not yet injected) answers every webhook 400 and drops it forever.
- **Scenario:** Backend redeployed with the secret temporarily missing; a paying customer's `transaction.completed`/`subscription.activated` arrives, gets 400, Paddle marks delivery failed and never retries. User paid but is never granted entitlement; no automatic recovery.
- **Fix:** Distinguish config/transient errors from genuine signature failures. Return 400 only for an invalid signature; let missing-secret/internal errors propagate as 5xx so Paddle retries.
- **Status:** NEEDS REVIEW (untouched).

#### M16. [LOW · money] mapPaddleStatus fail-open — unknown/missing status defaults to TRIALING (grants pro)
- **File:** `backend/src/billing/billing.service.ts:599`
- **What breaks:** `mapPaddleStatus()` returns `TRIALING` for any unrecognized status (default case). Since `resolveEntitlement` treats TRIALING as entitled, an unexpected/absent status on a `subscription.created/updated/resumed/activated` webhook is written as TRIALING and grants paid access — fail-open in a money-critical mapping.
- **Scenario:** A `subscription.*` webhook arrives with empty/null `data.status` or a future/malformed value that passes signature verification → `mapPaddleStatus(undefined) → TRIALING` → user row TRIALING → pro granted with no valid subscription.
- **Fix:** Default unknown/missing statuses to a non-entitling value (CANCELED/INACTIVE) and log loudly; never fail open.
- **Status:** NEEDS REVIEW (untouched). _Confidence: medium._

#### M17. [LOW · money] resolveTrades computes shares/P&L from signal price, not the actual capped fill price
- **File:** `backend/src/autobot/autobot.service.ts:797`
- **What breaks:** `pnlUsd = t.sizeUsd * (payoff/price - 1)` and `roiPct = (payoff-price)/price*100` use `t.price` (signal price at intent). But `placeOrder` fills BUYs at a cap of `price+0.02` (limit) / `price+0.03` (market) (l.866), so true shares = `sizeUsd/fillPrice < sizeUsd/price`. Wins are overstated, and the overstated `pnlUsd` is added to `dailyPnlUsd` (l.799), desensitizing the daily-loss breaker.
- **Scenario:** Signal 0.50, fills 0.52, sizeUsd=$10 → real shares 19.23, real win +$9.23; code computes `10*(1/0.50-1)=+$10.00`, +$0.77 too high per trade, inflating `dailyPnlUsd`.
- **Fix:** Persist the actual fill price/shares from the order response and resolve P&L against the executed price.
- **Status:** NEEDS REVIEW (untouched).

#### M18. [LOW · money] MINUTE_MARKET coin-flip filter applied only at display, not at paper-logging — pollutes learning/sim
- **File:** `backend/src/quant/quant.service.ts:519`
- **What breaks:** `QuantService.MINUTE_MARKET` excludes ultra-short minute markets but is applied only in `signals()` (l.866). `recordPaperSignals()` and `copySignals()` never apply it (their candidate filter is only side/price/conditionId + horizon), so minute markets are logged as `paper_copy` decisions, resolve, and flow into `getEvTable`/`learnedPolicy`/`simulate`/`learningStats`. The learned EV buckets and sim curve are trained on the exact coin-flips the system claims to exclude (train/serve mismatch).
- **Scenario:** A qualified wallet buys a "9:40–9:45AM ET Up or Down" market at 0.55; `recordPaperSignals` logs it, it resolves ~50/50, and folds into the Sports bucket EV and sim curve even though `signals()` would hide it — degrading the self-tuned "what works" policy.
- **Fix:** Apply `QuantService.MINUTE_MARKET.test(t.title)` as an exclusion in `recordPaperSignals()` and `copySignals()` candidate filters (and ideally `arbPaperTick`).
- **Status:** NEEDS REVIEW (untouched).

---

### NON-MONEY

#### N1. [HIGH] resolvePaperOutcomes head-of-line block — un-resolvable decisions permanently occupy the `take:300` oldest window
- **File:** `backend/src/quant/quant.service.ts:573`
- **What breaks:** `resolvePaperOutcomes()` fetches `{ kind:'paper_copy', outcome:null } take:300 orderBy:createdAt asc` — always the 300 oldest unresolved. A decision resolves only when `resolveMarkets()` returns `closed===true && winningIndex!=null` (l.582). Two classes never satisfy this and are never cleaned up: (a) markets that close without a decisive ≥0.99 price (`marketResolutions()` sets `closed=true, winningIndex=null`, then `resolveMarkets()` caches it and never re-fetches because `m.closed`); (b) delisted/disputed markets gamma stops returning (cached `closed=false,winningIndex=null`, re-fetched hourly forever, never resolve). These stuck decisions are the oldest with `outcome=null`, so they pile at the front. Once ≥300 accumulate, every tick re-reads the same 300 dead rows and resolves 0; all newer resolvable decisions are starved. The EV table, `learnedPolicy`, `learningStats` and `simulate` silently stop getting new data — the engine appears to run but stops learning.
- **Scenario:** Over weeks, decisions for markets that close 0.6/0.4 or get delisted accumulate; after ~300, `resolvePaperOutcomes` returns 0 every 10-min tick forever, pending climbs unbounded, no new outcomes are recorded.
- **Fix:** (1) When a market is closed but `winningIndex` is null, write a terminal outcome (`success=false`/void) so it leaves the `outcome:null` set; (2) order/select so resolvable work isn't starved (resolve markets first, then update only matching open decisions, or add `resolveAttempts`/`giveUpAt`); (3) age out decisions whose market hasn't resolved well past `meta.endsAt`.
- **Status:** NEEDS REVIEW (untouched). _Confidence: medium._

#### N2. [MEDIUM] Verbosity level is a global singleton shared across all users (multi-tenant leak)
- **File:** `backend/src/brain/brain.service.ts:37`
- **What breaks:** `BrainService` is a singleton; `level` is a single instance field. `setLevel()` (l.41) mutates it process-wide and `getLevel()` (l.42) reads it process-wide. `POST/GET /brain/level` therefore read/write one global value for every tenant; `trace()` (l.51) gates emission on this global level.
- **Scenario:** User A sets 'quiet' → User B's `brain.trace(...)` is suppressed though B never changed it; A setting 'debug' floods everyone; `GET /brain/level` returns A's choice to B.
- **Fix:** Per-user verbosity — `Map<userId, BrainLevel>` (or persist on User/SystemConfig) consulted by publish/trace/stream for the requesting user.
- **Status:** NEEDS REVIEW (untouched).

#### N3. [MEDIUM] Clerk JWT passed via `?token=` query string leaks into proxy/access logs and browser history
- **File:** `backend/src/brain/sse-jwt.guard.ts:12`
- **What breaks:** `SseJwtGuard` reads the full Clerk token from `req.query.token` and folds it into the Authorization header. Query strings are written to Nginx/proxy access logs and browser history (Nginx fronts the backend in prod). The strategy validates RS256 with 30s clock tolerance and does not pin issuer, so a captured-but-unexpired token replays against every authed endpoint.
- **Scenario:** Someone with read access to the Nginx access log greps `/api/brain/stream?token=…`, copies the JWT before expiry, and replays it as `Authorization: Bearer …`.
- **Fix:** Don't put long-lived bearers in the URL — issue a short-lived single-use SSE ticket exchanged from the real JWT, or move auth to a cookie. At minimum scrub the token query param from logs and keep TTL short.
- **Status:** NEEDS REVIEW (untouched).

#### N4. [MEDIUM] AgentDecision hot query filters on (subjectAddr, mode) with no supporting index — seq scan ×120 every 10 min on a 2.3M-row table — **AUTO-FIXED**
- **File:** `backend/src/quant/quant.service.ts:953`
- **What breaks:** `AgentDecision` had only `extKey @unique` and `@@index([kind, createdAt])`. The `paperTick` loop counts `agentDecision.count({ where: { subjectAddr, mode:'backfill' } })` per wallet (l.953); neither field was indexed → full seq scan per wallet, ~120 scans of a 2.3M-row table every 10 min, plus the same indexless count in `scanWallet` (l.370). Existence-only counts also shouldn't use `count(*)`.
- **Fix applied:** Added `@@index([subjectAddr, mode])` to `AgentDecision` (`schema.prisma:615`); replaced both indexless `count()` existence checks with `findFirst({ where, select: { id: true } })` (l.~370 `scanWallet`, l.~953 `paperTick`). **NOTE: the index needs a `prisma db push`/migration to take effect on the live DB — not run this session.**
- **Status:** AUTO-FIXED (validations pass; DB push pending).

#### N5. [MEDIUM] crossMarket opportunities render as garbage rows (NaN¢ / "ends in NaNh" / dead Buy) — **AUTO-FIXED**
- **File:** `components/quant/QuantManualArbDesk.tsx:448`
- **What breaks:** Frontend contract declares `GET /api/autobot/opportunities → { settlementLag: ArbOpportunity[]; crossMarket: ArbOpportunity[] }`. But backend `scanArbs()` builds cross items with a different shape `{ type:'cross', event, slug, nOutcomes, sumYes, edgePct, legs }` — no `title/outcome/price/tier/tokenId/conditionId/outcomeIndex/endsInH/endsAt`. The desk merged both arrays through `OppRow`, producing `toCents→NaN¢`, `fmtHours(undefined)→NaNh`, blank title, fallback SAFE tier, and a NaN sort comparator. Clicking Buy sent undefined tokenId/price → backend `manualTrade` throws `'Invalid order.'`, so cross-arbs were unactionable.
- **Fix applied:** `loadOpps` (l.447) now lists only `settlementLag` (the real `ArbOpportunity` shape); crossMarket items no longer flow through `OppRow`, eliminating NaN rows, the dead Buy, and the NaN comparator. Display-only change; no order/Buy logic touched.
- **Status:** AUTO-FIXED (frontend build passes).

#### N6. [LOW] scoreboard() loads all of a user's 7-day events into memory unbounded — **AUTO-FIXED**
- **File:** `backend/src/brain/brain.service.ts:80`
- **What breaks:** `scoreboard()` did a 7-day `findMany` with no `take` (unlike `recent()`'s 400 clamp). A module emitting a neuron per tick can produce tens of thousands of rows/user/week; every dashboard poll pulled them all into Node just to increment four counters.
- **Fix applied:** `scoreboard()` (l.78) now uses `prisma.brainEvent.groupBy({ by: ['module','kind'], where, _count: { _all: true } })` and sums in JS.
- **Status:** AUTO-FIXED.

#### N7. [LOW] publish() persist failures silently swallowed — events vanish from recent()/scoreboard with no signal — **AUTO-FIXED**
- **File:** `backend/src/brain/brain.service.ts:60`
- **What breaks:** `publish()` did `prisma.brainEvent.create(...).catch(() => {})`. Any failure (DB down, oversized/invalid JSON, constraint error) was discarded with no log; the event streamed live but was never persisted, so it disappeared from `recent()`/`scoreboard()` — including 'error' neurons.
- **Fix applied:** The persist `.catch` now logs via a new `Logger` (`this.logger.warn(...)`) instead of swallowing.
- **Status:** AUTO-FIXED.

#### N8. [LOW] Full JWT payload (PII + metadata) logged at info level on every authenticated request — **AUTO-FIXED**
- **File:** `backend/src/auth/strategies/jwt-access.strategy.ts:42`
- **What breaks:** `validate()` ran `logger.log('🔍 JWT PAYLOAD RECEIVED: ' + JSON.stringify(payload))` (info, always on) per request, plus logs of `public_metadata` (l.51) and the resolved user incl. email/role (l.68). `AuthService` also logged emails and a `console.log('[DEBUG] Clerk User Response …')` of the full Clerk user (`auth.service.ts:151`). Standing PII/credential-context disclosure to anyone with log access.
- **Fix applied:** The three `logger.log` PII dumps dropped to `logger.debug` with no `JSON.stringify` of token contents; removed the `console.log('[DEBUG] Clerk User Response …')` in `auth.service.ts:151`.
- **Status:** AUTO-FIXED.

---

## 4. Auto-Fixed This Run

All five fixes applied; both validations pass — frontend `CI=true pnpm build` PASS (4.27s), backend `npx tsc -p tsconfig.build.json --noEmit` PASS (exit 0). No commits, no `db push`, no deploy. None touched money/billing/order/P&L logic.

1. **N4 [prisma-schema]** — `@@index([subjectAddr, mode])` on `AgentDecision` (`schema.prisma:615`); both indexless existence `count()`s → `findFirst({ select:{id:true} })` in `quant.service.ts` (`scanWallet` ~l.370, `paperTick` ~l.953). _Requires `prisma db push`/migration to take effect on the live DB._
2. **N5 [contract-drift]** — `QuantManualArbDesk.tsx:447` `loadOpps` lists only `settlementLag`; crossMarket no longer renders NaN rows / dead Buy. Display-only.
3. **N6 [brain-sse]** — `brain.service.ts:78` `scoreboard()` uses `groupBy` + JS sum instead of loading all 7-day rows.
4. **N7 [brain-sse]** — `brain.service.ts` `publish()` persist `.catch` now logs via `Logger.warn`.
5. **N8 [auth-clerk]** — `jwt-access.strategy.ts` PII dumps → `logger.debug` (no token stringify); removed `[DEBUG]` console.log in `auth.service.ts:151`.

---

## 5. Needs-Review — Money-Critical (left untouched for morning)

All 18 money-critical bugs were left untouched. Recommended triage order:

1. **M1 (CRITICAL)** autobot exposure/cash TOCTOU overspend — `autobot.service.ts:303`
2. **M2 (HIGH)** EntitlementGuard wired to zero routes — paywall not enforced — `entitlement.guard.ts:22`
3. **M3 (HIGH)** kill switch race — in-flight tick still trades after stop — `autobot.service.ts:635`
4. **M4 (HIGH)** daily-loss/drawdown breaker reads stale snapshot — `autobot.service.ts:656`
5. **M5 (HIGH)** closePosition/closeAll double-sell + double-book — `autobot.service.ts:264`
6. **M6 (MED)** webhook idempotency check-then-insert → double promo increment — `billing.service.ts:315`
7. **M7 (MED)** syncSubscription leaves TRIALING/PAST_DUE entitled forever — `billing.service.ts:232`
8. **M8 (MED)** manualTrade `Math.max(1,…)` floor bypasses limits — `autobot.service.ts:305`
9. **M9 (MED)** closePosition books at full mark vs mark−5¢ fill — `autobot.service.ts:266`
10. **M10 (MED)** closePosition resolves only one filled row → orphaned exposure — `autobot.service.ts:267`
11. **M11 (MED)** daily-loss breaker ignores manual closes/trades — `autobot.service.ts:656`
12. **M12 (MED)** false riskless cross-market arb when a leg is filtered — `quant.service.ts:98`
13. **M13 (MED)** JWT accepted with no iss/aud validation — `jwt-access.strategy.ts:30`
14. **M14 (MED)** arb-config cents/fraction unit drift → thresholds pinned to 0.999 — `QuantManualArbDesk.tsx:349` _(frontend lane)_
15. **M15 (LOW)** missing Paddle secret → 400, webhooks dropped forever — `billing.controller.ts:86`
16. **M16 (LOW)** mapPaddleStatus fail-open → unknown status grants pro — `billing.service.ts:599`
17. **M17 (LOW)** resolveTrades uses signal price not fill price — `autobot.service.ts:797`
18. **M18 (LOW)** MINUTE_MARKET filter not applied to paper-logging — `quant.service.ts:519`

**Lane note:** M14 is in the Codex (frontend) lane; the rest are Claude (backend) lane. M2, M6, M7, M15, M16 are billing/entitlement (Golden-Rule money surfaces) and should not ship without accompanying tests. The autobot cluster (M1, M3, M4, M5, M8–M11) shares a single root cause — no per-wallet serialization and stale in-memory snapshots — and is best fixed together behind a per-wallet lock plus recompute-before-place.
