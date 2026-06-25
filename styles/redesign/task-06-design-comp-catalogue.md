# Task 06 - JTradePilot Design Comp Catalogue

Source:
- `JTradePilot Trading Journal Redesign/JTradePilot.dc.html`
- `JTradePilot Trading Journal Redesign/screenshots/dashboard.png`

Scope:
- Catalogue every screen, component, and state represented by the design comp.
- Treat the design folder as read-only reference.
- This is a Phase 1 intake artifact, not implementation code.

Source coverage notes:
- `JTradePilot.dc.html` contains the only rendered template source.
- `screenshots/dashboard.png` captures the Dashboard state at 924x540 and matches the rendered Dashboard structure.
- `support.js` is runtime support for the design comp; it does not define product screens.

## Top-Level App Shell

The comp is a dense dark-mode trading journal application with a fixed left sidebar, fixed topbar, scrollable content area, and right-side overlay drawers.

Shell components:
- Full-height application frame: `height:100vh`, background `#0b0c0e`, base font size `13px`.
- Sidebar: fixed width `228px`, background `#0e1013`, right border `#1c2128`.
- Brand block: small gradient square mark, `JTradePilot` wordmark, 52px height.
- Account switcher button: account tag, account name, balance, chevron. The current mocked account is `FTMO $50K - Phase 1`.
- Primary navigation: Journal, Dashboard, Analytics, Playbooks, Settings.
- Sidebar footer: low performance mode toggle and signed-in user block.
- Main topbar: page title, page subtitle, date range chip, primary `Log Trade` action.
- Overlay system: dim backdrop plus right-side drawer animation for detail and log-trade flows.

Global interaction states:
- Active navigation item uses blue-tinted background and light foreground.
- Hovered navigation and table rows use darker raised surfaces.
- Low performance mode is a boolean toggle with moving knob.
- Topbar `Log Trade` opens the log-trade drawer from any screen.
- Date range is displayed as a static chip: `Apr 20 - Jun 19, 2026`.
- Account switcher click is wired to `toggleAccts`, but the comp defines no expanded account menu state.
- Page title/subtitle pairs:
  - Journal: `Journal` / `Log, review, learn`.
  - Dashboard: `Dashboard` / `Account & rule status`.
  - Analytics: `Analytics` / `What your edge is made of`.
  - Playbooks: `Playbooks` / `Your setups, measured`.
  - Settings: `Settings` / `Profile & configuration`.

## Navigation Screens

### Journal

Status: visible template exists.

Purpose:
- Primary trade log and review workspace.

Sub-tabs:
- Live: count badge, shares the live/pending table.
- Pending: count badge, shares the live/pending table.
- History: count badge, default tab.
- Calendar: calendar heatmap and monthly summary.

History toolbar components:
- Search field with placeholder `Search asset, setup, mistake...`.
- Setup filter select: `All setups` plus playbook options.
- Result segmented filter: All, Wins, Losses.
- `Columns` button.
- `Saved views` button.

History table columns:
- Date: date and time, sortable.
- Asset: symbol and asset class, sortable.
- Dir: Long or Short with directional marker and color.
- Setup: playbook name, sortable.
- Entry -> Exit: formatted price pair.
- Size: position size.
- Plan R: planned R multiple, sortable.
- Real R: realized R multiple, sortable.
- Net P&L: net profit or loss, sortable.
- Adh: checklist adherence icon.
- Mistakes: mistake chips or empty mark.

History states:
- Default sorted by date descending.
- Sort toggles ascending/descending on sortable columns.
- Setup filter limits rows by playbook.
- Result filter limits rows to win/loss/all.
- Search matches asset, setup, and mistakes.
- Selected/opened row uses highlighted row background.
- Footer summary shows trade count, win rate, average R, and net P&L for filtered rows.

Calendar components:
- Month navigation: previous and next month buttons.
- Month label.
- Monthly stats: Month P&L, Trades, Green days.
- Day-of-week header.
- Calendar cells with:
  - Empty leading cells.
  - Blank trading days.
  - Active days showing net P&L, trade count, and average R.
  - Green/red intensity based on daily net P&L magnitude.

Live and Pending components:
- Shared compact table.
- Columns: Asset, Dir, Entry, Size, Plan R, Unrealised, Status.
- Mock rows include XAUUSD in profit and NQ at risk.
- Status chips use green/red tint.

Live and Pending states:
- Live and Pending are distinct tabs, but both render the same `openRows` data in the comp.
- Status examples are `In profit` and `At risk`.

### Dashboard

Status: visible template exists and screenshot is provided.

Purpose:
- Account and prop-firm rule overview.

Top KPI strip:
- Trades this week.
- Win rate.
- Net R.
- Net P&L.

Prop Firm Rules panel:
- Header: `Prop Firm Rules`.
- Context: `FTMO $50K - Phase 1 - balance ...`.
- Rule cards:
  - Profit Target: progress toward `$4,000`, status Passed or On track.
  - Min Trading Days: progress toward 4 days, status Passed or In progress.
  - Max Loss: drawdown against `-$5,000`, status Safe or Breached.
  - Max Daily Loss: worst day against `-$2,500`, status Safe or Breached.
- Each rule has a status badge, mono value string, progress bar, and explanatory subtext.

Equity Curve panel:
- Header with `$` / `R` segmented toggle.
- Legend:
  - Equity.
  - Profit target +$4k.
  - Max loss -$5k.
  - Drawdown.
- SVG chart uses:
  - Equity line in dollar mode.
  - R path in R mode.
  - Profit target and max loss dashed lines in dollar mode.
  - Zero line in R mode.
  - Drawdown fill in dollar mode.

Recent Activity panel:
- List of seven recent trades.
- Each row opens the trade detail drawer.
- Row content: direction marker, asset, setup, date, net P&L, realized R.

Dashboard states:
- Dollar mode is default.
- R mode swaps chart path, hides dollar target/loss lines, and shows an R zero line.
- Recent activity row click opens the detail drawer.
- Rule status variants represented in data are Passed, On track, In progress, Safe, and Breached.
- Profit/loss KPI colors are derived from signed values; neutral values fall back to muted text.

### Analytics

Status: data model exists, but visible template markup is not present in `JTradePilot.dc.html`.

Represented state/data:
- KPI strip:
  - Net Profit.
  - Win Rate.
  - Profit Factor.
  - Expectancy.
  - Avg Win.
  - Avg Loss.
  - Streak.
  - Avg Duration.
- Dimension selector:
  - By Playbook.
  - By Session.
  - By Day of Week.
  - By Asset.
  - By Direction.
  - By Time of Day.
- Dimension rows include trades, win rate, average R, net P&L, positive/negative bars, and flagged non-positive average R.
- R distribution histogram bins from -1.5R to +3.5R in 0.5R increments.
- Checklist adherence comparison:
  - Checklist followed.
  - Checklist broken.
- MAE/MFE scatter data points colored by win/loss.

Template gap:
- The main template contains `<div id="otherPages"></div>`, but no visible Analytics markup is defined around the analytics state.

### Playbooks

Status: data model exists, but visible template markup is not present in `JTradePilot.dc.html`.

Represented state/data:
- Five playbooks:
  - London Reversal.
  - NY Breakout.
  - Trend Pullback.
  - Range Fade.
  - News Spike.
- Each playbook includes:
  - Core idea.
  - Entry rule.
  - Exit rule.
  - Invalidation rule.
  - Target R:R.
  - Tags.
  - Trade count.
  - Win rate.
  - Average R.
  - Net P&L.
  - Positive/negative average-R bar.
  - Flagged state when average R is non-positive.
- Selected playbook defaults to `London Reversal`.

Template gap:
- The main template exposes Playbooks in nav and creates `playbookList`, `pbSel`, and `pbSelTags`, but visible Playbooks markup is absent.

### Settings

Status: data model exists, but visible template markup is not present in `JTradePilot.dc.html`.

Represented tabs:
- Profile.
- Accounts.
- Checklist.
- Asset Specs.
- Billing.
- Security.

Represented state/data:
- Settings tab selector state, defaulting to Accounts.
- Asset Specs rows for supported instruments with symbol, class, tick size, tick value, contract size, and currency.
- Checklist editor rows with on/off state, toggle action, and remove action.

Template gap:
- The main template exposes Settings in nav and creates `st.settingsTabs`, `st.assetRows`, and `st.settingsChecklist`, but visible Settings markup is absent.

## Overlay Screens

### Trade Detail Drawer

Status: visible template exists.

Trigger:
- Click a Journal history row.
- Click a Dashboard recent activity row.

Layout:
- Fixed right drawer, width `480px`, max width `92vw`.
- Backdrop closes the drawer.
- Header shows asset, direction, setup chip, date, time, and session.
- Close button.
- Scrollable body.
- Footer actions: `Edit trade`, `Add to review`.

Components:
- Headline metric cards:
  - Realised R with planned R subtext.
  - Net P&L with gross and fees subtext.
- Chart screenshot drop area:
  - Dashed border.
  - Filename placeholder `chart_screenshot.png`.
  - Instruction text `drag a marked-up screenshot here`.
- Excursion visualization:
  - Horizontal track.
  - MAE segment in red.
  - MFE segment in green.
  - Entry marker.
  - MAE and MFE labels in R.
- Trade facts:
  - Entry -> Exit.
  - Stop / Target.
  - Risk.
- Playbook checklist:
  - Completion icons per checklist rule.
  - Adherence score.
- Mistake tags:
  - Red mistake chips.
  - Clean execution state.
- Confidence:
  - Five small horizontal dot/bars, filled based on confidence value.
- Notes block.

States:
- Clean execution when no mistake tags exist.
- Checklist pass/fail markers per item.
- Positive/negative R and P&L coloring.
- Footer `Edit trade` opens log-trade drawer.

### Log Trade Drawer

Status: visible template exists.

Trigger:
- Topbar `Log Trade`.
- Detail drawer `Edit trade`.

Layout:
- Fixed right drawer, width `460px`, max width `92vw`.
- Backdrop closes the drawer.
- Header with title and close button.
- Scrollable form body.
- Footer actions: Cancel and Save trade.

Fields and controls:
- Asset select with asset spec hint.
- Direction segmented control: Long, Short.
- Entry input.
- Stop input.
- Target input.
- Size input.
- Exit input.
- Setup select.
- Live computed panel:
  - Planned R:R.
  - Risk.
  - Est. R / P&L.
- Pre-trade checklist toggle list.
- Notes textarea with placeholder `What did you see? What did you feel?`.

States:
- Direction selected state changes green/red tint.
- Computed panel updates from entry, stop, target, and exit.
- Estimated R/P&L shows target estimate when exit is empty, realized estimate when exit is filled.
- Checklist item toggles between checked and unchecked.
- Save trade appends a manual trade, recomputes equity, closes drawer, resets form, and returns to Journal History.

Missing from visible log-trade form:
- No dedicated mistake tag entry.
- No dedicated confidence input.
- No dedicated MAE/MFE input.
- No screenshot upload/drop in the log form, only in the detail drawer.

## Data Model and Mock Domain

Assets:
- EURUSD, GBPUSD, USDJPY.
- XAUUSD.
- NAS100, US30.
- ES, NQ.
- BTCUSD.

Playbooks:
- London Reversal.
- NY Breakout.
- Trend Pullback.
- Range Fade.
- News Spike.

Sessions:
- London.
- New York.
- Asian is generated as a fallback/mock session.

Mistake tags:
- Moved stop.
- No setup.
- Revenge trade.
- Oversized.
- Early exit.
- Chased entry.

Checklist items:
- Setup matches playbook.
- Risk <= 0.5%.
- Stop at structure.
- R:R >= 1.5.
- No high-impact news.
- Within session.

Core computed trade fields represented:
- Entry, exit, stop, target.
- Planned R and realized R.
- Gross P&L, fees, net P&L.
- Risk in dollars.
- MAE and MFE in R.
- Adherence boolean and checklist booleans.
- Confidence/emotion value from 1 to 5.
- Duration, win/loss, equity after trade.

## Design Tokens Observed

Typography:
- Primary: IBM Plex Sans.
- Data/mono: IBM Plex Mono.
- Base app font size: 13px.
- Most UI labels: 10px to 12px, uppercase labels use 0.4px to 0.5px letter spacing.
- KPI values and drawer headline metrics use larger mono type, roughly 17px to 26px.

Color tokens:
- App background: `#0b0c0e`.
- Sidebar/topbar background: `#0e1013`.
- Card background: `#0f1216`.
- Raised/control background: `#15181d`.
- Input/toolbar background: `#131619`.
- Border strong: `#232931`.
- Border subtle: `#1c2128`.
- Text primary: `#e8eaed`.
- Text secondary: `#cdd2d9`.
- Text muted: `#9aa1ab`.
- Text dim: `#6b7280`.
- Blue action/accent: `#5b8def`.
- Blue hover: `#6f9bf2`.
- Green success/profit: `#4cc38a`.
- Green alternate: `#3fb37f`.
- Red loss/error: `#e5635f`.
- Red soft text: `#e5847f`.
- Amber warning: `#d9a23b`.

Spacing and radius:
- Sidebar width: 228px.
- Topbar height: 52px.
- Main content padding: 18px 20px to 30px.
- Common card radius: 10px.
- Control radius: 7px to 8px.
- Small chip radius: 5px to 6px.
- Main dashboard gap: 16px.
- Grid card gap: 12px to 22px.

Motion:
- Drawer slide-in: `slideIn` from 24px right offset over 0.18s.
- Backdrop fade-in over 0.12s.
- Toggle knob transitions over 0.15s.

## Implementation Notes for Later Tasks

Must preserve:
- The app-first shell, not a landing page.
- Trader-facing IA: Journal, Dashboard, Analytics, Playbooks, Settings.
- Prop-firm-first dashboard with rule progress and dollar/R toggles.
- Dense tables and compact cards with restrained dark surfaces.
- Right-side drawers for details and trade logging.
- R multiple and dollar values shown together where the comp models them.
- MAE/MFE excursion visualization.
- Low performance mode toggle in persistent sidebar.

Known gaps to resolve before implementation:
- Analytics, Playbooks, and Settings have state/data definitions but no visible template markup in the comp.
- Log trade drawer models pre-trade checklist and estimated R/P&L, but not visible inputs for mistake tags, confidence, MAE/MFE, or screenshot upload.
- Account switcher has a click handler stub but no dropdown state or menu.
- Columns and Saved views buttons are visual only.
- Date range chip is static.
- The detail drawer's `Edit trade` action opens a blank/new log form rather than an edit-populated state in the comp.
