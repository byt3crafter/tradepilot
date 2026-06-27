# JTradePilot — Pro Trading Terminal Design System

> **The UI Kit Rulebook.** Every page agent and component author must read this before writing a single class.
> The system is deliberately bold and unmistakable: a Bloomberg/trading-desk terminal, not a clean SaaS product.
> Every element earns its place. No decorative noise.

---

## 0. The Aesthetic

**Pro Trading Terminal.** Near-black layered backgrounds, amber/gold primary accent, terminal green/red for money, crisp 1px borders, high data density, bordered panels with uppercase mono header bars. Think Bloomberg, not a friendly SaaS dashboard.

The key discipline: **minimalism through density**. Pack real data tightly. Remove anything that doesn't serve the trader's workflow. Calm despite density — à la Hyperliquid.

---

## 1. Color Token Palette

All tokens live in `tailwind.config.js` under `theme.extend.colors.jtp`. Use `text-jtp-*`, `bg-jtp-*`, `border-jtp-*` classes.

### Backgrounds (darkest → lightest layer)

| Token | Value | Usage |
|-------|-------|-------|
| `jtp-bg` | `#08090b` | App / body background — the void |
| `jtp-shell` | `#0a0c0e` | Sidebar + topbar + statusbar frame |
| `jtp-statusbar` | `#090a0c` | Bottom status strip |
| `jtp-panel` | `#0d0f12` | Cards, panels, drawers |
| `jtp-raised` | `#121519` | Table sticky headers, summary rows |
| `jtp-control` | `#131619` | Toolbar inputs, search, inactive seg-controls |
| `jtp-active` | `#15181d` | Account switcher, selected rows, form controls |
| `jtp-hover` | `#171b20` | Nav hover, row hover |
| `jtp-avatar` | `#1d2229` | User avatar background |
| `jtp-accountTag` | `#1a2030` | Account tag tile |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `jtp-border` | `#1b2026` | Shell borders, panel borders, row separators |
| `jtp-borderSubtle` | `#14171c` | Table row dividers |
| `jtp-borderStrong` | `#262c34` | Inputs, buttons, seg-controls |
| `jtp-borderFocus` | `#e8a23d` | Form field focus, active hover — **this is amber** |
| `jtp-borderHover` | `#2e3540` | Secondary hover border |

### Text Scale

| Token | Value | Role |
|-------|-------|------|
| `jtp-text` | `#e6e9ee` | Primary text — high contrast (≥4.5:1 on jtp-panel) |
| `jtp-textSoft` | `#ccd1d8` | Secondary values |
| `jtp-textNote` | `#b5bbc4` | Drawer notes |
| `jtp-textMuted` | `#9aa3ad` | Default secondary labels |
| `jtp-textSubtle` | `#88909a` | Inactive tabs |
| `jtp-textDim` | `#69727c` | Labels, metadata — use `.jtp-label` class |
| `jtp-textFaint` | `#565d66` | Timestamps, helper copy |
| `jtp-textDisabled` | `#404850` | Disabled, dropzone helper |

**Contrast rule**: body content text must be `jtp-text` or `jtp-textSoft` (≥4.5:1). Never use `jtp-textFaint` or lower for content — only for true metadata/timestamps.

### Primary Accent — Amber

| Token | Value | Usage |
|-------|-------|-------|
| `jtp-blue` | `#e8a23d` | **AMBER** — primary action, active nav, panel accents. Named "blue" for legacy compatibility; value is amber. |
| `jtp-blueHover` | `#ffb838` | Amber hover / emphasis |
| `jtp-blueDeep` | `#c47e1e` | Amber deep, gradient end |
| `jtp-amber` | `#e8a23d` | Explicit amber alias |
| `jtp-amberBright` | `#ffb838` | Bright amber emphasis |
| `jtp-amberDim` | `#a06a1a` | Muted amber |
| `jtp-cyan` | `#4fd1e0` | Secondary accent — use sparingly for live markers, links |

**Palette discipline**: the palette is amber / near-black / profit-green / loss-red / cyan-link. Five colours total. Do not introduce purple, blue, or any other hue.

### Money Tokens (highest contrast — always bold mono — always CVD-safe)

| Token | Value | Usage |
|-------|-------|-------|
| `jtp-profit` | `#3ddc84` | Terminal green — positive P&L, wins, profit target, SYSTEM OK |
| `jtp-profitDot` | `#2dc574` | Live dot, clean execution |
| `jtp-loss` | `#ff5b52` | Terminal red — negative P&L, losses, limit breached |
| `jtp-lossSoft` | `#ff8078` | Softer loss — mistake chips, MAE labels |
| `jtp-warning` | `#e8a23d` | Amber — caution, approaching limit, headroom |

**CVD-safe money rule (mandatory)**: NEVER rely on red/green colour alone to convey P&L direction. Always pair with:
1. A directional glyph: `▲` for positive, `▼` for negative — placed before the value.
2. An explicit sign: `+` or `-` in the string itself (e.g. `+$4,320`, `-$820`).

`StatTile` applies the glyph automatically when `positive` prop is set. For custom money displays, add the glyph manually:
```tsx
// CVD-safe P&L display
<span className="font-mono font-bold text-jtp-profit tabular-nums">▲ +$4,320</span>
<span className="font-mono font-bold text-jtp-loss   tabular-nums">▼ -$820</span>
```

---

## 2. Typography

### The Rule: Mono for Data, Inter for Prose

JTradePilot follows Bloomberg's terminal typography discipline:

| Context | Font | Class |
|---------|------|-------|
| Numbers, prices, P&L, percentages | JetBrains Mono + tabular-nums | `font-mono tabular-nums` or `.jtp-num` |
| Nav labels, panel headers, status text | JetBrains Mono | `font-mono` or `.jtp-label` |
| Table data cells (all columns) | JetBrains Mono | `font-mono` (DataTable default) |
| Tickers, codes, badges, buttons | JetBrains Mono | `font-mono` |
| Modal body copy, explanatory text | Inter (body default) | (inherited) |
| Journal notes, long-form descriptions | Inter | (inherited) |
| Form hint text, helper paragraphs | Inter | (inherited) |
| Multi-sentence analytics commentary | Inter | (inherited) |

**The body default is Inter.** Any element that does NOT explicitly get `font-mono` will be proportional. This means: nav, buttons, and panel labels must carry `font-mono` explicitly (they all do in the component library). Page authors writing one-off prose should NOT add `font-mono`.

### Type Scale

| Class | Size | Font | Usage |
|-------|------|------|-------|
| `text-jtp-2xs` | 9.5px | Mono | Status bar, micro labels |
| `text-jtp-xs` | 10px | Mono | Tiny badges, timestamps |
| `text-jtp-xs-plus` | 10.5px | Mono | Section labels (UPPERCASE MONO) |
| `text-jtp-sm-minus` | 11px | Mono | Sub-labels |
| `text-jtp-sm` | 11.5px | Mono/Inter | Helper text |
| `text-jtp-base-minus` | 12px | Either | Compact row text |
| `text-jtp-base` | 12.5px | Either | Secondary values |
| `text-jtp-md` | 13px | Either | Standard row text — body floor |
| `text-jtp-md-plus` | 13.5px | Either | Slightly elevated |
| `text-jtp-lg` | 14px | Either | Nav labels, sub-headings |
| `text-jtp-xl` | 15px | Either | Section title (TopBar) |
| `text-jtp-2xl` | 17px | Either | Card headings |
| `text-jtp-3xl` | 22px | Mono | Stat values (medium) |
| `text-jtp-4xl` | 28px | Mono | Stat values (hero) |
| `text-jtp-5xl` | 36px | Mono | Large hero numbers |

### Section Labels

Use the `.jtp-label` utility class for all section headers inside panels:

```html
<span class="jtp-label">OPEN POSITIONS</span>
```

This renders: uppercase, 10.5px, JetBrains Mono, `#69727c` color, letter-spacing 0.08em. All Panel components prepend a `▸` glyph in amber automatically.

---

## 3. Component Reference

### Panel

```tsx
<Panel label="EQUITY CURVE" actions={<SegmentedControl .../>}>
  <Chart />
</Panel>

<Panel label="RECENT ACTIVITY" noPadding>
  <DataTable ... />
</Panel>
```

**Anatomy:**
- Outer: `bg-jtp-panel border border-jtp-border rounded-[2px]` — 2px radius, terminal sharp
- Header: `border-top: 2px solid rgba(232,162,61,0.55)` — amber accent line at the very top
- Label: `▸ SECTION NAME` — amber arrow-head glyph + uppercase mono label
- Body: `p-4` default, `noPadding` for flush tables

### StatTile

```tsx
<StatTile label="NET P&L" value="+$4,320" valueColor="text-jtp-profit" positive />
<StatTile label="WIN RATE" value="63%" delta="+4%" positive />
<StatTile label="MAX DD" value="-$1,200" valueColor="text-jtp-loss" delta="-0.8%" positive={false} />
```

**Anatomy:**
- Left accent: `border-left: 2px solid rgba(232,162,61,0.6)` — amber terminal readout feel
- Label: `.jtp-label` (uppercase mono, dimmed)
- Value: `font-mono font-bold text-jtp-4xl` — 28px, JetBrains Mono, high contrast
- Delta: `font-mono text-jtp-xs` colored by `positive` prop (profit/loss) + **CVD glyph** `▲`/`▼` prepended automatically when `positive` is defined

**Important**: always pass `positive` when showing a directional delta. The component prepends `▲`/`▼` automatically.

### Button

| Variant | Look | Usage |
|---------|------|-------|
| `primary` | Amber fill `#e8a23d`, dark text `#08090b`, uppercase mono | Primary CTA |
| `secondary` | Dark fill, strong border, light text | Secondary action |
| `danger` | Red tinted bg + border + text | Destructive |
| `link` | No bg, muted text, underline hover | Text link |

Primary buttons: `font-mono tracking-wider uppercase text-[11px]` — terminal command-bar feel.

### Badge

Square corners (`rounded-none`), mono, with colored borders:

```tsx
<Badge variant="profit">PASSED</Badge>   // Green border + fill
<Badge variant="loss">BREACH</Badge>     // Red border + fill
<Badge variant="warning">SAFE</Badge>    // Amber border + fill
<Badge variant="info">TRACKING</Badge>   // Amber border + fill
<Badge variant="neutral">IDLE</Badge>    // Gray border + fill
```

All badges have a thin variant-colored border at 35% opacity. No rounding.

### DataTable

Dense terminal data grid:
- Sticky header: `bg-jtp-raised`, amber bottom border at 30% opacity
- Header cells: `jtp-label font-mono tracking-[0.1em]`
- **All data cells**: `font-mono` by default — every column in a trading table is data, not prose
- `col.mono = true`: additionally applies `tabular-nums` for numeric/money column alignment
- Row separators: `border-jtp-borderSubtle`
- Row hover: `hover:bg-jtp-hover`

Always wrap in `<Panel noPadding>`:
```tsx
<Panel label="TRADE LOG" noPadding>
  <DataTable columns={...} data={...} keyFn={...} maxHeight="400px" />
</Panel>
```

### Ticker

Horizontally scrolling live-data tape:

```tsx
import { Ticker } from '../ui';

<Ticker items={[
  { symbol: 'EUR/USD', price: '1.0842', change: '+0.12%', positive: true },
  { symbol: 'GBP/USD', price: '1.2714', change: '-0.08%', positive: false },
]} />
```

26px tall, auto-scrolls continuously left. Left-anchored `LIVE` label in amber. `speed` prop: `'slow'` (45s) | `'normal'` (30s) | `'fast'` (15s).

### Tabs

Uppercase mono labels, amber active underline:
```tsx
<Tabs
  tabs={[{ id: 'all', label: 'All' }, { id: 'wins', label: 'Wins', badge: 47 }]}
  active={tab}
  onChange={setTab}
/>
```

Active: `text-jtp-text brightness-110`, amber 2px bottom bar. All labels are uppercase mono.

### SegmentedControl

Terminal toggle, amber active fill:
```tsx
<SegmentedControl
  segments={[{ value: '$', label: '$' }, { value: 'R', label: 'R' }]}
  value={mode}
  onChange={setMode}
/>
```

Active: amber bg (`jtp-blue` = amber now), dark text `#08090b`. Inactive: low-opacity dim.

### Input / Field

Mono input, amber focus ring:
```tsx
<Field label="STOP LOSS" hint="In pips">
  <Input id="sl" type="number" placeholder="0.0" />
</Field>
```

Label: uppercase mono, tracked. Input: `font-mono`, `rounded-[2px]`, amber focus ring via `focus:ring-jtp-blue`.
Hint text below the input is Inter by default (body font) — it is explanatory prose.

---

## 4. Shell Components

### Sidebar

- Brand block: amber gradient mark (`#e8a23d → #c47e1e` gradient, amber glow shadow), "PRO TRADING TERMINAL" subtitle
- Nav items: active = amber 3px left inset rail + amber text + 8% amber bg (all via inline style). Labels: `font-mono`.
- Account switcher: dark bg, strong border, account initials tag
- Width: 228px expanded, 64px (`w-16`) collapsed

### AppTopBar (52px)

Header bar above main content:
- Section title: `▸ SECTION NAME` — amber glyph + bold mono
- Search trigger: `> SEARCH OR JUMP TO...` in 11px mono + `⌘K` badge
- Log Trade button: amber fill, dark text `#08090b`, uppercase mono, 2px radius

### StatusBar (28px)

Always-visible bottom strip. Full width. Mono, 9.5px, tracked.

Layout (left → right):
```
[SYS]  ● SYSTEM OK  │  ● AGENT IDLE  │  TRADES 47  │  ● LONDON SESSION    UTC  14:32:08
```

- `[SYS]` in amber, 9px, 0.2em tracking
- Separators: `│` pipe char, muted
- UTC clock right-aligned — `UTC` prefix in `text-jtp-textDim`, time in `text-jtp-text`

---

## 5. Layout Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `sidebar` | `228px` | Sidebar width (expanded) |
| `topbar` | `52px` | Top command bar height |
| `statusbar` | `28px` | Bottom status strip |
| `drawer` | `480px` | Right-side drawer |
| `jtp-row` | `43px` | Standard table row height |

### Spacing Scale

Use Tailwind's standard scale (multiples of 4px). Common values in this system:
- `gap-2` (8px) — within stat tile rows, between panel header items
- `gap-3` (12px) — between panels in a row
- `gap-4` (16px) — outer grid gutters
- `p-4` (16px) — standard panel body padding
- `px-3 py-[9px]` — table cell padding
- `py-[15px]` — StatTile padding (slightly generous for readability)

---

## 6. Page Layout Patterns

This section is the primary guide for page agents implementing or refactoring individual pages.

### 6a. Overall Shell

All pages share this outer frame:
```
┌──────────────────────────────────────────────────────┐
│  Ticker tape (26px, optional, market data pages)     │
├─────────────┬────────────────────────────────────────┤
│             │  AppTopBar (52px)                      │
│  Sidebar    ├────────────────────────────────────────┤
│  (228px)    │  <page content — scrolls independently>│
│             │                                        │
├─────────────┴────────────────────────────────────────┤
│  StatusBar (28px, always visible)                    │
└──────────────────────────────────────────────────────┘
```

Main content area: `flex-1 overflow-y-auto p-4` inside a `flex flex-col` that fills remaining height. Use `gap-4` between major sections.

### 6b. Dashboard / Overview Page

**Goal**: Instant orientation — account health at a glance. Data flows top-to-bottom in order of urgency.

```
┌── KPI StatTile Grid ─────────────────────────────────────────┐
│  [NET P&L]  [WIN RATE]  [NET R]  [DAILY P&L]  [MAX DD]       │  ← top third
│  4-6 tiles, equal-width, single row (grid-cols-4 or 6)       │
└──────────────────────────────────────────────────────────────┘
┌── Primary Row ──────────────────────────────────────────────┐
│  [Equity Curve Panel (flex-1)]  │  [Prop Firm Rules (fixed)] │  ← main data
│  ApexCharts area chart, $/R     │  Progress bars, badges     │
│  toggle in panel header         │  TradingObjective status   │
└──────────────────────────────────────────────────────────────┘
┌── Secondary Row ────────────────────────────────────────────┐
│  [Recent Activity — DataTable (full width)]                  │  ← discovery
└──────────────────────────────────────────────────────────────┘
```

- **StatTile grid**: always the first visual block. Use `grid grid-cols-4 xl:grid-cols-6 gap-3`.
- **Equity curve**: `flex-1` to fill remaining horizontal space. Panel header holds the $/R SegmentedControl.
- **Prop Firm Rules**: fixed right column (~320px). Shows objective progress bars + Passed/Safe/Breach badges. Computed server-side status, not raw numbers.
- **Recent Activity**: always last, full-width DataTable (noPadding Panel), max-height scroll.

### 6c. Trading / Quant Pages (Three-Column Canvas)

For pages that combine a list/market selection, a detail/chart view, and actions/positions, use a three-column layout:

```
┌── Left column ──┬──── Center column ─────┬── Right column ──┐
│  Market list /  │  Primary chart or       │  Positions /      │
│  Trade list /   │  Trade detail view      │  Order panel /    │
│  Filter sidebar │  (flex-1, most space)   │  Action buttons   │
│  (~220px)       │                         │  (~280px)         │
└─────────────────┴─────────────────────────┴──────────────────┘
```

- Left: `w-[220px] flex-shrink-0 overflow-y-auto` — selectable list of trades, assets, or strategy groups
- Center: `flex-1 min-w-0` — chart, trade detail, or analytics visualization
- Right: `w-[280px] flex-shrink-0` — context-sensitive panel (open positions, quick-log form, entry checklist)
- Use `gap-3` between columns, `h-full` on the row container

This canvas is used for: the Journal detail view, the Bot/cTrader page, and the Quant leaderboard + position view.

### 6d. Tables / Journal List Page

Dense, filterable data grid with summary stats above.

```
┌── Summary Strip ────────────────────────────────────────────┐
│  [StatTile row] — period stats above the table              │
├── Filter Bar ───────────────────────────────────────────────┤
│  Date range  │  Account  │  Direction  │  Search   [EXPORT] │
├── DataTable ────────────────────────────────────────────────┤
│  Sticky header row                                          │
│  Trade rows (dense, hover, click → Drawer detail)           │
│  Pagination or infinite scroll footer                       │
└──────────────────────────────────────────────────────────────┘
```

- Summary StatTiles: 3-4 tiles in a `grid grid-cols-3 gap-3 mb-4`. Keep them slim (reduce vertical padding vs. Dashboard tiles).
- Filter bar: `bg-jtp-control border border-jtp-border rounded-[2px] px-3 py-2 flex items-center gap-3 mb-3`. All inputs mono.
- DataTable: fill remaining height (`flex-1 overflow-hidden`), inside `<Panel noPadding>`.

### 6e. Analytics Page

Split into a primary chart zone and a secondary breakdown section:

```
┌── Primary Chart ────────────────────────────────────────────┐
│  Full-width large chart (e.g. equity curve, P&L by week)    │
│  Period selector Tabs in Panel header                       │
├── Breakdown Grid ───────────────────────────────────────────┤
│  [By Day-of-week] │ [By Session] │ [By Asset] │ [By Setup]  │
│  2×2 or 4-across mini-chart panels                         │
├── Mistake Tags / Confidence Breakdown ──────────────────────┤
│  Tag frequency table (left) │ Confidence vs P&L scatter (right) │
└──────────────────────────────────────────────────────────────┘
```

### 6f. Settings / Forms Pages

Single-column, centered, form-heavy:

```
┌── Page header ──────────────────────────────────────────────┐
│  ▸ ACCOUNT SETTINGS  (Panel style, no inner padding)        │
├── Form sections ────────────────────────────────────────────┤
│  Grouped by topic, each group in its own Panel              │
│  Field labels: uppercase mono (.jtp-label)                  │
│  Hint text: Inter, jtp-textFaint                            │
│  Max width: max-w-2xl centered                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Motion & Animation

- **Micro-interactions**: 150–200ms `transition-colors` or `transition-all duration-200`
- **Slide-in**: `animate-jtp-slide-in` (180ms ease) for drawers, dropdowns
- **Ticker scroll**: `animate-ticker-scroll` (30s linear infinite) — the live tape
- **Amber pulse**: `animate-amber-pulse` for critical alerts
- **Status dot**: `status-dot-live` pulses at 2.4s (CSS keyframes in globals.css)
- Respect `prefers-reduced-motion` for decorative animations

---

## 8. Anti-Patterns

| Anti-pattern | Correct approach |
|-------------|-----------------|
| Proportional font for table cells | All DataTable cells are `font-mono` by default |
| Monospace for modal body / journal notes | Body default is Inter — do not add `font-mono` to prose |
| Red/green P&L with no directional glyph | Always prefix `▲`/`▼`. StatTile does this automatically when `positive` is set |
| Pure-white `#fff` text | Use `jtp-text` (#e6e9ee) — slightly off-white, easier on the eyes |
| Faint gray (`jtp-textFaint` or lower) for content text | Reserve for timestamps/metadata only. Content must be ≥ `jtp-textMuted` |
| Blue for any accent | `jtp-blue` is amber (`#e8a23d`) — never apply blue tints |
| Large border-radius on panels/badges | Max 4px — terminals are sharp, not pillowed |
| White or light panel backgrounds | The void is `#08090b` — no white panels |
| Soft/pastel money colors | Money is always `#3ddc84` (green) or `#ff5b52` (red) |
| `rounded-jtp-panel` on new components | Use `rounded-[2px]` |
| Hardcoded `#5b8def` (old blue) | Extinct. Use `jtp-blue` / `#e8a23d` |
| CRT scanlines or decorative overlays | Removed. Every visual element must serve the trader's workflow |
| Introducing purple, teal, or other hues | Palette is amber / black / green / red / cyan. Five colours only |
| Six-column stat grids with tiny tiles | Use 4-column on default viewports; 6-column on xl only |
| Page-level full-height sidebars with duplicate nav | Only one sidebar (the shell). In-page column navigation uses Tabs |

---

## 9. Quick Reference — Copy-Paste Patterns

**CVD-safe money value (profit):**
```tsx
<span className="font-mono font-bold text-jtp-profit tabular-nums">▲ +$4,320</span>
```

**CVD-safe money value (loss):**
```tsx
<span className="font-mono font-bold text-jtp-loss tabular-nums">▼ -$820</span>
```

**Money value in Inter (prose context — rare):**
```tsx
// Only when money appears inside a sentence, not a stat tile
<p>Your net P&L for the week is <span className="font-mono font-bold text-jtp-profit">▲ +$4,320</span>.</p>
```

**Panel header on a custom component:**
```tsx
<div className="flex items-center gap-2 px-4 py-[9px] border-b border-jtp-border"
  style={{ borderTop: '2px solid rgba(232,162,61,0.55)' }}>
  <span className="jtp-label tracking-[0.12em]">
    <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>
    OPEN POSITIONS
  </span>
</div>
```

**Active nav/list item:**
```tsx
style={isActive
  ? { boxShadow: 'inset 3px 0 0 #e8a23d', backgroundColor: 'rgba(232,162,61,0.08)' }
  : undefined}
```

**Amber focus ring (inputs):**
```tsx
className="focus:ring-1 focus:ring-jtp-blue focus:border-jtp-blue"
// jtp-blue = amber — this is correct.
```

**Live status dots:**
```tsx
<span className="status-dot-live" />  // green, pulsing (#3ddc84)
<span className="status-dot-warn" />  // amber (#e8a23d)
<span className="status-dot-dead" />  // red (#ff5b52)
<span className="status-dot-idle" />  // gray (#404850)
```

**StatTile left accent (for custom stat-like widgets):**
```tsx
<div style={{ borderLeft: '2px solid rgba(232,162,61,0.6)' }}>
```

**Three-column canvas page shell:**
```tsx
<div className="flex gap-3 h-full overflow-hidden">
  <aside className="w-[220px] flex-shrink-0 overflow-y-auto flex flex-col gap-3">
    {/* Left: list / filter */}
  </aside>
  <main className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-3">
    {/* Center: chart / detail */}
  </main>
  <aside className="w-[280px] flex-shrink-0 overflow-y-auto flex flex-col gap-3">
    {/* Right: positions / actions */}
  </aside>
</div>
```

**Dashboard KPI grid:**
```tsx
<div className="grid grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
  <StatTile label="NET P&L" value="+$4,320" valueColor="text-jtp-profit" positive delta="+12%" />
  {/* ... */}
</div>
```
