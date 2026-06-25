# Task 07 - Redesign Component Gap Analysis

Source:
- `styles/redesign/task-06-design-comp-catalogue.md`
- `JTradePilot Trading Journal Redesign/JTradePilot.dc.html`
- Existing frontend under `App.tsx`, `pages/**`, `components/**`, `context/**`, `hooks/**`, `utils/**`, and `styles/**`

Scope:
- Map the redesign comp's screens and components to the current frontend.
- Classify each area as reuse, rebuild, or new.
- This is a Phase 1 read-only artifact. No app code was changed.

Decision key:
- Reuse: existing component/domain logic can remain with targeted styling or composition changes.
- Rebuild: existing feature exists, but the component structure should be replaced to match the comp.
- New: no current frontend component covers the comp surface.

## Executive Summary

The current frontend already has most core trading functionality: authenticated app shell, account switching, trade journal tables, live/pending/history/calendar views, trade creation/editing, screenshots, AI analysis, playbooks, analytics, settings, accounts, checklists, asset specs, and prop-firm objective progress.

The redesign is not a simple restyle. The comp moves the product toward a compact app shell with a fixed topbar, a five-item trader-facing IA, right-side drawers, a prop-firm-first dashboard, R/$ presentation, dense tables, and tighter data surfaces. Most domain providers and API-facing logic should be reused, but the primary shell, dashboard composition, journal presentation, trade detail surface, and log-trade experience should be rebuilt.

## Current Frontend Baseline

App frame and routing:
- `App.tsx` handles Clerk, maintenance mode, public routes, and provider nesting.
- `pages/DashboardPage.tsx` hosts the authenticated app and switches views through `ViewContext`.
- `components/Sidebar.tsx` renders the app nav, account switcher, profile menu, referral/upgrade entry points, and collapsed/mobile behavior.

Domain providers and state to preserve:
- `context/TradeContext.tsx`
- `context/AccountContext.tsx`
- `context/PlaybookContext.tsx`
- `context/ChecklistContext.tsx`
- `context/SettingsContext.tsx`
- `context/AssetContext.tsx`
- `context/UIContext.tsx`

Existing trader-facing screens:
- `components/Dashboard/Dashboard.tsx`
- `components/TradeJournal.tsx`
- `pages/AnalyticsPage.tsx`
- `pages/PlaybooksPage.tsx`
- `pages/SettingsPage.tsx`

Existing shared UI primitives:
- `components/Card.tsx`
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/SelectInput.tsx`
- `components/ui/Textarea.tsx`
- `components/ui/Checkbox.tsx`
- `components/ui/Modal.tsx`
- `components/ui/DropdownMenu.tsx`
- `components/ui/Tooltip.tsx`
- `components/ui/FileDropzone.tsx`

## Component Mapping

| Redesign surface | Existing frontend candidate | Decision | Notes |
|---|---|---:|---|
| Authenticated app shell | `pages/DashboardPage.tsx`, `components/Sidebar.tsx` | Rebuild | Current shell has a 256px collapsible sidebar, no persistent desktop topbar, large page padding, and extra nav entries. Keep provider/routing logic; replace layout composition to match the comp's 228px fixed sidebar, 52px topbar, dense scroll area, date chip, and global `Log Trade` action. |
| Brand block | `components/Sidebar.tsx`, `components/auth/AuthLogo.tsx`, `components/auth/AuthMark.tsx`, `public/JTP_logo.png` | Rebuild | Current logo/BETA treatment differs from the comp's small mark plus `JTradePilot` wordmark. Reuse asset only if brand direction requires it. |
| Account switcher | `components/Sidebar.tsx`, `context/AccountContext.tsx` | Reuse | Existing switcher already lists accounts and supports switching/creation. Restyle and simplify the visual treatment; keep account state/actions. |
| Primary nav | `components/Sidebar.tsx`, `context/ViewContext.tsx`, icon components | Rebuild | Existing nav covers Dashboard, Journal, Playbooks, Analytics, Settings but order and styling differ, and it includes Refer/Upgrade flows. Target IA is Journal, Dashboard, Analytics, Playbooks, Settings. Billing/referral can remain reachable elsewhere until retirement is decided. |
| Low-performance mode toggle | `context/UIContext.tsx` likely extension point | New | The comp requires a persistent sidebar toggle. No visible current control exists. Add UI state in the frontend lane later; do not assume backend support. |
| User footer/profile menu | `components/Sidebar.tsx`, Clerk `useClerk` | Reuse | Current profile menu, avatar fallback, and logout/manage actions are solid. Restyle into the compact footer format. |
| Desktop topbar | none; mobile header in `pages/DashboardPage.tsx` | New | The comp's page title/subtitle, date range chip, and global `Log Trade` button are not represented as a desktop component. |
| Drawer/backdrop system | `components/ui/Modal.tsx`, trade modals | New | Current app uses centered modals and expandable rows. The comp uses right-side drawers for trade detail and log trade. Create a drawer primitive rather than stretching existing modal semantics. |
| Dashboard KPI strip | `components/Dashboard/Bento/StatGrid.tsx`, `hooks/useAnalytics.ts` | Rebuild | Existing stats are win rate, profit factor, and streak. The comp wants weekly Trades, Win rate, Net R, Net P&L. Reuse analytics calculations where possible, but the card set and time window change. |
| Prop Firm Rules panel | `components/Dashboard/TradingObjectivesCard.tsx`, `components/Dashboard/ObjectiveItem.tsx`, `context/AccountContext.tsx` | Rebuild | Objective progress exists, but the comp is one consolidated panel with statuses like Passed/Safe/Breached, mono value strings, bars, and account context. Reuse objective data, but rebuild presentation. |
| Equity curve with $/R toggle | `components/Dashboard/Bento/EquityHero.tsx`, `components/charts/EquityCurveChart.tsx`, `hooks/useAnalytics.ts` | Rebuild | Existing chart is dollar-focused and Recharts-based. The comp models `$` and `R` modes, target/max-loss/drawdown overlays, and a compact panel. Reuse chart library if suitable; implement new chart data shape and toggle presentation. |
| Recent activity | `components/Dashboard/Bento/RecentActivity.tsx` | Rebuild | Existing list shows asset/date/P&L/result. Comp needs direction marker, setup, date, net P&L, realized R, and click-to-detail drawer. |
| Journal shell | `components/TradeJournal.tsx` | Rebuild | Current journal is wrapped in a card with page-local heading/actions. Comp expects this to live under the global shell with compact sub-tabs and toolbar. Preserve state concepts and trade actions. |
| Journal sub-tabs | `components/TradeJournal.tsx` | Reuse | Live, Pending, History, and Calendar already exist. Restyle labels/counts and default to History per comp. |
| History toolbar search/setup/result filters | `components/TradeJournal.tsx`, `SelectInput` | Rebuild | Current history filter is date-based. Comp requires search across asset/setup/mistake, setup select, All/Wins/Losses segmented filter, Columns, and Saved views. Columns/Saved views are visual-only in comp and should stay non-destructive until specified. |
| History table | `components/TradeJournal.tsx`, `components/TradeRow.tsx` | Rebuild | Existing row supports expansion, selection, edit/delete, pips, result, screenshots, journal, and AI sections. Comp wants dense click-to-drawer rows with Date, Asset, Dir, Setup, Entry -> Exit, Size, Plan R, Real R, Net P&L, Adherence, and Mistake chips. Reuse row utilities and trade data; replace the presentation. |
| Bulk selection/delete | `components/TradeJournal.tsx`, `components/TradeRow.tsx` | Reuse outside comp | Current working capability should not be removed without Phase 1 retirement sign-off. It is not visible in the comp, so retain access through a secondary action or later decision. |
| Import trades | `components/accounts/ImportTradesModal.tsx`, `components/TradeJournal.tsx` | Reuse outside comp | Current import capability is not visible in the comp. Preserve until retirement decision; likely move behind a secondary toolbar/menu. |
| Calendar view | `components/TradeJournal.tsx` | Rebuild | Existing calendar renders days and day P&L. Comp needs month stats, Monday-first labels, green-day count, daily average R, and intensity coloring. Reuse closed-trade grouping logic. |
| Live/Pending tables | `components/trades/LiveTradeRow.tsx`, `components/trades/PendingOrderRow.tsx`, `components/TradeJournal.tsx` | Rebuild | Data exists. Comp's shared table columns differ and include Plan R, Unrealised, and status chips. |
| Trade detail drawer | `components/TradeRow.tsx`, `components/journal/JournalEntry.tsx`, `components/trades/AiAnalysisDisplay.tsx` | New | Existing expanded row contains many detail sections, screenshots, journal, and AI analysis. The comp requires a right drawer with headline R/P&L cards, screenshot drop placeholder, MAE/MFE excursion track, trade facts, checklist adherence, mistake chips, confidence, notes, and footer actions. Reuse detail data/renderers where practical, but create a drawer surface. |
| Log trade drawer | `components/trades/TradeFormModal.tsx`, `components/trades/AddTradeForm.tsx`, `components/trades/PreFlightChecklistModal.tsx`, `components/trades/ImageUploader.tsx` | Rebuild | Existing add/edit flow is modal-based, includes screenshot upload, AI autofill, AI sanity check, pending-order support, and hard-limit blocking. Comp wants a right drawer with asset, direction segmented control, entry/stop/target/size/exit, setup, computed planned R:R/risk/est R/P&L, pre-trade checklist, and notes. Preserve existing AI/limit/pending capabilities unless explicitly retired. |
| Pre-trade checklist | `components/trades/PreFlightChecklistModal.tsx`, `components/checklist/ChecklistManager.tsx`, `context/ChecklistContext.tsx` | Rebuild | Current pre-flight checklist is a separate modal gate. Comp embeds checklist toggles inside the log drawer. Keep checklist rules and enforcement behavior; redesign the interaction. |
| Playbook checklist adherence | `components/checklist/ChecklistManager.tsx`, `components/playbooks/**`, `TradeRow` detail sections | New | The comp distinguishes pre-trade checklist from playbook checklist and shows per-trade adherence. Current frontend has checklist rules, but not the same per-trade adherence visualization in the target detail drawer. |
| Screenshot upload/drop | `components/trades/ImageUploader.tsx`, `components/ui/FileDropzone.tsx` | Reuse | Existing upload pieces can be restyled for the comp's dashed drop zones and detail drawer placeholders. |
| Confidence input/display | none in current `Trade` contract | New | No current frontend field or type exists. Requires contract coordination before dynamic implementation. |
| Mistake tag input/display | `AiAnalysis.mistakes` in `types.ts`, AI display components | New | AI analysis has mistake objects, but the comp models trade-level mistake chips and search/filter by mistake. Needs a trade-level representation before implementation. |
| Excursion MAE/MFE display/input | none in current `Trade` contract | New | No current trade fields exist for MAE/MFE. The drawer visualization and log inputs need contract work. |
| R multiple display everywhere | `Trade.rr`, `utils/calculations.ts`, analytics hooks | Rebuild | Current app has planned risk/reward (`rr`) and dollar P&L, but not realized R or dual $/R outputs across dashboard, activity, tables, and analytics. Reuse calculation utilities only after the contract defines authoritative values. |
| Analytics page | `pages/AnalyticsPage.tsx`, `components/analytics/**`, `hooks/useAnalyticsData.ts` | Rebuild | Existing analytics has summary/by-asset/by-time tabs. Comp defines KPI strip, dimension selector, R distribution, adherence comparison, and MAE/MFE scatter, but visible template markup is absent. Reuse data hooks where possible; likely needs new frontend components and backend fields for R/adherence/excursion. |
| Playbooks page | `pages/PlaybooksPage.tsx`, `components/playbooks/**`, `context/PlaybookContext.tsx` | Rebuild | Existing playbooks management is functional and includes community playbooks, builder, detail modal, copy/delete/edit. Comp's target is measured playbook performance with selected playbook details, tags, avg R bars, win rate, net P&L, and flagged weak setups. Keep management actions; redesign primary view around measured setup performance. |
| Settings page | `pages/SettingsPage.tsx`, `components/accounts/AccountManager.tsx`, `components/checklist/ChecklistManager.tsx`, `components/assets/AssetManager.tsx`, `components/settings/**` | Rebuild | Existing settings tabs match the comp closely: Profile, Accounts, Checklist, Assets, Billing, Security. Presentation differs; data/actions are reusable. |
| Account management | `components/accounts/**`, `context/AccountContext.tsx` | Reuse | Existing account manager, account rows/cards/forms, objectives, smart limits, import flow should be preserved. Comp settings/accounts visible markup is incomplete. |
| Asset specs | `components/assets/AssetManager.tsx`, `components/assets/AssetForm.tsx`, `context/AssetContext.tsx` | Reuse | Current asset-spec management maps directly to comp state data for instrument specs. Restyle table only. |
| Billing/profile/security settings | `components/settings/BillingSettings.tsx`, `components/settings/ProfileSettings.tsx`, `pages/SettingsPage.tsx` | Reuse | Infrastructure screens are out of the redesign's trader-facing focus but must keep working. Restyle carefully without changing entitlement or auth behavior. |
| Public marketing/auth/admin screens | `pages/LandingPage.tsx`, auth pages, `pages/AdminPage.tsx`, public pages | Reuse unchanged | The comp targets trader-facing app. Do not churn billing/auth/admin/marketing unless a later task explicitly covers them. |

## Proposed Target Component Boundaries

New shell/layout components:
- `components/redesign/AppShell.tsx`
- `components/redesign/Topbar.tsx`
- `components/redesign/SidebarNav.tsx`
- `components/redesign/RightDrawer.tsx`
- `components/redesign/DateRangeChip.tsx`

Dashboard components:
- `components/redesign/dashboard/KpiStrip.tsx`
- `components/redesign/dashboard/PropFirmRulesPanel.tsx`
- `components/redesign/dashboard/EquityCurvePanel.tsx`
- `components/redesign/dashboard/RecentActivityPanel.tsx`

Journal components:
- `components/redesign/journal/JournalTabs.tsx`
- `components/redesign/journal/HistoryToolbar.tsx`
- `components/redesign/journal/HistoryTable.tsx`
- `components/redesign/journal/CalendarHeatmap.tsx`
- `components/redesign/journal/OpenTradesTable.tsx`
- `components/redesign/journal/TradeDetailDrawer.tsx`
- `components/redesign/journal/LogTradeDrawer.tsx`

Shared trading primitives:
- `components/redesign/trading/RValue.tsx`
- `components/redesign/trading/MoneyValue.tsx`
- `components/redesign/trading/DirectionPill.tsx`
- `components/redesign/trading/StatusBadge.tsx`
- `components/redesign/trading/ExcursionTrack.tsx`
- `components/redesign/trading/MistakeChips.tsx`
- `components/redesign/trading/ConfidenceDots.tsx`
- `components/redesign/trading/ChecklistAdherence.tsx`

Analytics/playbooks/settings:
- `components/redesign/analytics/AnalyticsKpiStrip.tsx`
- `components/redesign/analytics/DimensionBreakdown.tsx`
- `components/redesign/analytics/RDistribution.tsx`
- `components/redesign/analytics/AdherenceComparison.tsx`
- `components/redesign/analytics/ExcursionScatter.tsx`
- `components/redesign/playbooks/PlaybookPerformanceList.tsx`
- `components/redesign/playbooks/PlaybookPerformanceDetail.tsx`
- `components/redesign/settings/SettingsTabs.tsx`

The exact paths can change during implementation, but the boundaries should keep the redesign presentation separate from current domain providers and avoid rewriting working API/state code.

## Reuse Priorities

Reuse first:
- Provider stack and domain state from `context/**`.
- API client pattern in `services/api.ts`.
- Trade creation/update/delete/import/analyze actions from `TradeContext` and existing trade components.
- Account switching, objective progress, smart-limit progress, and active account state from `AccountContext`.
- Playbook CRUD and checklist rule state.
- Asset specs and price formatting utilities.
- Existing shared UI primitives where they can be restyled without fighting the comp.

Rebuild first:
- Authenticated shell layout.
- Dashboard presentation.
- Journal table, toolbar, calendar, and open-trade presentation.
- Trade detail and log-trade interaction surfaces.
- Analytics/playbook/settings page layouts.

Create new:
- Drawer primitive.
- Topbar.
- Low-performance mode control.
- R/$ toggle surfaces.
- MAE/MFE excursion track.
- Confidence indicator/input.
- Trade-level mistake chip UI.
- Checklist adherence visualization.

## Risks and Coordination Notes

- Do not remove current working capabilities just because the comp omits them. Import trades, AI autofill/sanity check, AI post-trade analysis, bulk delete, referral, billing, and account/security management should be preserved or explicitly retired after Phase 1 sign-off.
- Dynamic confidence, mistake tags, MAE/MFE, realized R, and dual R/$ values need backend contract work before implementation. Codex should request the contract on the message bus instead of editing backend files.
- Existing `types.ts` lacks trade-level confidence, MAE/MFE, realized R, mistake tags, and checklist adherence fields. Any change there is shared contract work and must be coordinated.
- Existing dashboard objective statuses use `Success`, `In Progress`, and `Failed`; the comp shows `Passed`, `On track`, `In progress`, `Safe`, and `Breached`. Mapping should be explicit and preferably API-backed before implementation.
- Current app uses large page padding and card-heavy sections. The redesign requires denser full-height app surfaces with fewer nested cards.

## Suggested Implementation Order After Phase 1

1. Establish redesign shell and tokens without changing domain behavior.
2. Rebuild Dashboard using existing account/trade analytics data, leaving missing R/$ fields as clearly typed placeholders until contract arrives.
3. Rebuild Journal history/calendar/live/pending presentation while preserving trade CRUD/import/AI actions.
4. Introduce drawer primitive, then move trade detail and log-trade flows into drawers.
5. Rework Analytics and Playbooks around the measured-performance model once R/adherence/excursion fields exist.
6. Restyle Settings tabs using current account/checklist/asset/billing/profile/security components.
