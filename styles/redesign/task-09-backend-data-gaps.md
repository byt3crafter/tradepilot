# Task 09 - Redesign Backend Data Gaps

Source:
- `JTradePilot Trading Journal Redesign/JTradePilot.dc.html`
- `styles/redesign/task-06-design-comp-catalogue.md`
- `styles/redesign/task-07-component-gap-analysis.md`
- Current frontend contract in `types.ts` and `services/api.ts`
- Read-only backend confirmation in `backend/prisma/schema.prisma`, trade DTOs, analytics, account, and playbook services

Scope:
- Flag redesign elements that do not have backend data, persisted fields, or API contract support today.
- Feed Claude's Phase 1 "add" column and Phase 2 contract planning.
- This is a Phase 1 read-only artifact. No app code was changed and no build was run.

## Executive Summary

The redesign assumes a richer trade-event model than the current backend exposes. The largest gaps are trade-level realised R, MAE/MFE excursion, confidence, manual mistake tags, per-trade checklist adherence, session labels, and backend-computed aggregate R/adherence/excursion analytics.

Some surfaces already have partial support: broker accounts, prop-firm objectives, smart limits, playbooks, playbook setups, screenshots, notes/journal text, asset specs, and dollar P&L all exist. However, many are not shaped the way the comp needs. The contract should make money-critical values authoritative server outputs rather than leaving Codex to recompute them differently in each screen.

## Highest Priority Contract Adds

| Priority | Design element | Needed backend support | Current state |
|---:|---|---|---|
| P0 | Realised R and net R totals | Persist or compute `realizedR` per closed trade, plus aggregate `netR`, `avgR`, R equity series, and R distribution. | `Trade.rr` exists but is planned R/R:R, not realised R. `Trade.profitLoss` is dollar P&L. |
| P0 | Money values after fees | Return gross P&L, fees, net P&L, and risk amount consistently for each trade. | Trade has `profitLoss`, `commission`, `swap`; no explicit gross/net split or risk-dollar field. |
| P0 | Prop firm rule statuses | Return target/drawdown/min-day rules in comp terms: `Passed`, `On track`, `In progress`, `Safe`, `Breached`, with progress/headroom and account context. | Objective progress exists with `Success`, `In Progress`, `Failed`, but not full comp status semantics. |
| P1 | MAE/MFE excursion | Add per-trade max adverse/favourable excursion in R, and optionally source data/price extrema. | No Prisma, DTO, or frontend type fields. |
| P1 | Mistake tags | Add trade-level mistake tags independent of AI analysis. | AI analysis stores mistakes JSON, but the comp uses first-class searchable chips on the trade. |
| P1 | Confidence | Add per-trade confidence rating, likely numeric 1-5. | No current trade or journal field. |
| P1 | Checklist adherence | Store per-trade checklist answers/snapshots for pre-trade and playbook checklist, plus adherence score. | Checklist definitions exist; per-trade responses do not. |
| P1 | Analytics dimensions | Return stats by playbook/setup, session, day of week, asset, direction, and time of day with avg R and net P&L. | Existing analytics cover asset/day/hour in dollars, not R, session, setup, direction, adherence, or excursion. |
| P2 | Saved views and columns | Persist user-specific journal view preferences if these become real features. | Comp shows controls only; no current backend need if kept local/visual. |
| P2 | Add to review | Define what review queue/cycle means for a trade. | Current app has journal notes and a separate analysis tracker, but no direct trade-review action. |

## Trade Detail And Journal Table Gaps

### Realised R vs planned R

The comp renders planned R and realised R as separate values in the history table and detail drawer. Evidence: `plannedRStr` and `realizedRStr` in the journal rows, plus a drawer headline for `Realised R`.

Current contract:
- `types.ts` exposes `Trade.rr` and `Trade.profitLoss`, but no `realizedR`.
- Prisma `Trade` has `rr` under risk/reward and `profitLoss` under outcome.
- `CreateTradeDto` does not accept `rr`; `UpdateTradeDto` accepts `rr`.

Add column/contract proposal:
- `plannedR?: number | null` or clarify that existing `rr` is the planned value.
- `realizedR?: number | null` computed from net P&L divided by initial risk, or from exit/stop distance when risk dollars are unavailable.
- Server should return display-safe values for closed and breakeven trades. This is money-adjacent and should not be recomputed inconsistently in the UI.

Evidence:
- Design: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:167`, `:169`, `:377`
- Current type: `types.ts:98`
- Current schema: `backend/prisma/schema.prisma:219`
- DTOs: `backend/src/trades/dtos/create-trade.dto.ts:5`, `backend/src/trades/dtos/update-trade.dto.ts:38`

### Gross, fees, net P&L, and risk dollars

The detail drawer shows net P&L with a gross/fees subtitle and a separate risk value. The design mock derives `gross`, `fees`, `netPL`, and `riskUSD`.

Current contract:
- `Trade.profitLoss`, `commission`, and `swap` exist.
- No explicit `grossProfitLoss`, `netProfitLoss`, or `riskAmount` exists.
- Bulk imports default `riskPercentage` to 0, so realised R cannot be reconstructed reliably for imported historical trades without later enrichment.

Add column/contract proposal:
- Normalize trade output to include:
  - `grossProfitLoss`
  - `fees`
  - `netProfitLoss`
  - `riskAmount`
  - `riskPercentage`
- Define whether existing `profitLoss` is gross or net. Today frontend code treats it inconsistently across surfaces.

Evidence:
- Design: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:382`, `:384`, `:412`, `:615`, `:617`, `:618`
- Current type: `types.ts:106`, `:108`, `:116`
- Current schema: `backend/prisma/schema.prisma:225`

### MAE/MFE excursion

The comp has an excursion rail in the trade detail drawer and an MAE/MFE scatter in Analytics.

Current contract:
- No `mae`, `mfe`, `maxAdverseExcursion`, or `maxFavorableExcursion` fields exist in frontend types, Prisma trade schema, or trade DTOs.

Add column/contract proposal:
- `maeR?: number | null`
- `mfeR?: number | null`
- Optional future fields if candle/backtest data is introduced: `maePrice`, `mfePrice`, `maeAt`, `mfeAt`.

Evidence:
- Design detail drawer: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:397`
- Design mock data: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:619`
- Design analytics scatter: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:938`
- Current schema absence: `backend/prisma/schema.prisma:204`

### Mistake tags

The comp supports mistake chips in the journal table, trade detail drawer, and search placeholder.

Current contract:
- `AiAnalysis.mistakes` exists as AI-generated JSON.
- There is no trade-level `mistakeTags` field, tag vocabulary, or manual edit contract.
- AI mistakes are not a substitute: they require screenshots/analysis and include reasoning objects, while the comp's chips are short user-facing tags.

Add column/contract proposal:
- `mistakeTags: string[]` on `Trade`, or a normalized `MistakeTag` relation if tags need reporting/management.
- Search/filter endpoints can remain client-side initially if `getTrades` returns tags.
- Decide whether AI mistakes can suggest tags without overwriting user tags.

Evidence:
- Design search/table/detail: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:118`, `:179`, `:435`
- Design mock tag pool: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:558`
- Current AI-only type: `types.ts:82`
- Current AI schema: `backend/prisma/schema.prisma:277`

### Confidence rating

The detail drawer displays confidence as five filled/unfilled bars. The design script names the underlying value `emotion`, but the charter and UI label call it confidence.

Current contract:
- No `confidence`, `emotion`, `mindsetScore`, or similar numeric field exists on `Trade` or `TradeJournal`.
- Existing `TradeJournal.mindsetBefore` is free text, not a sortable/reportable rating.

Add column/contract proposal:
- `confidence?: number | null` with range 1-5.
- Validate range in create/update DTOs.
- Decide whether confidence is captured pre-trade only or editable post-trade.

Evidence:
- Design label/dots: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:442`
- Design mock value: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:624`
- Current journal type: `types.ts:88`
- Current journal schema: `backend/prisma/schema.prisma:267`

### Checklist adherence and dual checklist model

The redesign separates:
- Pre-trade checklist in the log trade drawer.
- Playbook checklist adherence in the trade detail drawer.

Current contract:
- Playbook setup checklist definitions exist.
- User checklist rules exist.
- No per-trade checklist answers, no immutable snapshot of checklist labels at execution time, and no adherence score exist.

Add column/contract proposal:
- `preTradeChecklistSnapshot: { label: string; checked: boolean }[]`
- `playbookChecklistSnapshot: { label: string; checked: boolean; sourceRuleId?: string }[]`
- `checklistAdherenceScore?: number | null`
- `checklistAdherent?: boolean | null`
- Store snapshots, not only rule IDs, so historical trades remain accurate if a playbook/checklist changes later.

Evidence:
- Design pre-trade checklist: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:513`
- Design playbook checklist: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:419`
- Design adherence output: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:830`
- Current playbook checklist definitions: `types.ts:151`
- Current checklist rules: `types.ts:235`

### Session and duration

The trade drawer header displays session, and Analytics includes a "By Session" dimension and average duration KPI.

Current contract:
- Duration can be derived from `entryDate` and `exitDate`.
- Session is not persisted. Current analytics only groups by hour/day, not named market sessions.

Add column/contract proposal:
- Either return `session` per trade as a server-derived value from entry time and user/account timezone, or add an editable session enum if users can classify it.
- If derived, define timezone. Otherwise "London/New York/Asian" will vary by client locale.
- Existing average duration can be returned, but redesign also needs per-trade duration for detail surfaces if shown later.

Evidence:
- Design drawer header: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:368`
- Design analytics dimension: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:922`
- Current analytics duration: `types.ts:357`

## Dashboard And Prop-Firm Gaps

### Weekly KPI strip

The dashboard top strip is "Trades this week", "Win rate", "Net R", and "Net P&L".

Current contract:
- Frontend can count weekly trades from `getTrades`.
- Net P&L can be derived if trade P&L semantics are settled.
- Net R is missing until realised R exists.

Add contract proposal:
- Add a dashboard/account summary endpoint or extend analytics to return current-period KPI cards with authoritative `netR` and `netProfitLoss`.

Evidence:
- Design KPI derivation: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:891`
- Current analytics type lacks R totals: `types.ts:338`

### Prop firm rule status cards

The comp wants trader-facing statuses such as Passed, On track, In progress, Safe, and Breached. It also displays account context and headroom/progress text.

Current contract:
- Broker account objectives exist.
- `ObjectiveProgress.status` is limited to `Success`, `In Progress`, and `Failed`.
- Max loss and max daily loss are technically failure/safety rules, but current status wording does not distinguish "safe" from "in progress".

Add contract proposal:
- Return `displayStatus` or a new prop-rule DTO:
  - `key`
  - `label`
  - `currentValue`
  - `targetValue`
  - `remaining` or `headroom`
  - `progressPercent`
  - `status: 'passed' | 'onTrack' | 'inProgress' | 'safe' | 'breached'`
  - `severity: 'success' | 'neutral' | 'warning' | 'danger'`
- Include account `balance`, `initialBalance`, and currency in the same response or document where the frontend should read it.

Evidence:
- Current objective type: `types.ts:271`
- Current objective schema: `types.ts:36`
- Backend objective statuses: `backend/src/broker-accounts/broker-accounts.service.ts:152`

### Equity chart dollar/R toggle

The comp toggles the equity chart between dollars and R. Dollar mode also includes profit target, max loss, and drawdown overlays.

Current contract:
- Playbook stats return dollar equity curves.
- Account analytics does not return an account-level equity series.
- No R-mode equity series exists.

Add contract proposal:
- `equitySeries: { date: string; equity: number; cumulativeR: number; drawdown: number }[]`
- `targetLine`, `maxLossLine`, and `startingBalance` for prop accounts.
- This should be account-scoped, not playbook-only.

Evidence:
- Design toggle/chart data: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:902`
- Existing playbook curve type: `types.ts:202`

## Analytics Gaps

The redesign analytics data model includes:
- KPI strip with expectancy in R.
- Dimension selector by playbook, session, day of week, asset, direction, and time of day.
- R distribution histogram.
- Checklist followed vs broken comparison.
- MAE/MFE scatter.

Current contract:
- `AccountAnalytics` returns dollars/pips and groupings by asset, day, and hour.
- It does not return R-based aggregates, session grouping, playbook/setup grouping, direction grouping, checklist adherence comparison, R distribution, or excursion points.

Add contract proposal:
- Extend account analytics with:
  - `summary.netR`, `summary.expectancyR`, `summary.avgWinR`, `summary.avgLossR`
  - `dimensions: { key, label, trades, winRate, avgR, netProfitLoss }[]` by requested dimension
  - `rDistribution: { bucketStartR, bucketEndR, count }[]`
  - `checklistAdherence: { label, trades, winRate, avgR, netProfitLoss }[]`
  - `excursionPoints: { tradeId, maeR, mfeR, result }[]`

Evidence:
- Design analytics model: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:911`
- Current analytics type: `types.ts:338`
- Current analytics service returns asset/day/hour only: `backend/src/analytics/analytics.service.ts:13`

## Playbook Performance Gaps

The redesign playbooks page is performance-led: each playbook row needs trade count, win rate, average R, net P&L, positive/negative bars, and a flagged state when average R is non-positive.

Current contract:
- Playbook stats endpoint returns total trades, win rate, net P&L, and per-setup stats.
- It does not return average R or R bars.
- The `Playbook` list itself does not include performance stats, so the redesigned page would need one stats call per playbook unless a summary endpoint is added.

Add contract proposal:
- Add list-level playbook performance summaries:
  - `playbookId`
  - `tradeCount`
  - `winRate`
  - `avgR`
  - `netProfitLoss`
  - `flagged`
- Include setup-level `avgR` in `PlaybookStats.setups`.

Evidence:
- Design playbook stats: `JTradePilot Trading Journal Redesign/JTradePilot.dc.html:949`
- Current playbook stats type: `types.ts:207`
- Backend playbook setup stats: `backend/src/playbooks/playbooks.service.ts:388`

## Settings And Shell Elements With Existing Data

These redesign elements appear sufficiently backed today and should not be added to Claude's "missing backend data" list unless the implementation scope changes:

- Account switcher: `BrokerAccount` has name, type, balances, currency, objectives, and smart limits.
- Settings tabs: profile, accounts, checklist, asset specs, billing, and security all have existing frontend/backend surfaces.
- Asset specs: symbol, name, pip size, lot size, and value per point exist.
- Screenshot drop/upload: before/after screenshot URLs exist.
- Notes: `TradeJournal` can hold mindset, exit reasoning, and lessons learned, though the comp's single notes block may need frontend mapping.
- Low performance mode: frontend-only preference unless the product wants cross-device persistence.
- Columns and saved views: frontend-only initially unless the product wants saved cross-device view preferences.

## Suggested Phase 2 Contract Checklist

Before Codex builds dynamic redesign screens, Claude should publish a contract covering:

1. Trade output fields for planned R, realised R, gross P&L, fees, net P&L, risk dollars, MAE/MFE, confidence, mistake tags, session, and checklist adherence.
2. Trade create/update DTO fields for the same user-captured values, with validation ranges.
3. Prop-firm rule response with comp-native statuses and progress/headroom values.
4. Account dashboard summary with weekly KPIs and account-level equity series in both dollars and R.
5. Account analytics response with R distribution, adherence comparison, MAE/MFE scatter, and all comp dimensions.
6. Playbook performance summaries that avoid N+1 stats calls from the Playbooks page.

## Coordination Notes For Claude

- Treat realised R, risk dollars, net P&L, and prop-rule status as money-critical. Prefer server-side computation and tests.
- Preserve current trade data. New fields should be nullable/backfilled where possible because existing trades and imports lack risk/excursion/checklist data.
- Keep AI mistakes separate from user mistake tags unless a migration/UX rule explicitly maps one to the other.
- Store checklist snapshots per trade so historical adherence does not change when checklist definitions are edited later.
