# JTradePilot Operator Console — Design System

This document is the canonical reference for Wave 2 agents redesigning every page
against the shell + Dashboard established in Wave 1. Follow it exactly to stay
visually cohesive.

---

## 1. The Visual Language

JTradePilot is a **trading Operator Console** — think Bloomberg terminal meets a
pro trading desk. The aesthetic is:

- **Dense** — pack information in; never waste vertical space
- **Dark** — deep charcoal backgrounds (`#0b0c0e`), not black
- **Data-forward** — numbers are the hero; text is support
- **Legible** — the owner's core requirement: readable with glasses on a dark monitor

Key rule: **if a user has to squint at a number, the design failed.**

---

## 2. Color Tokens

All tokens live under `jtp.*` in `tailwind.config.js`. Reference them with `bg-jtp-*`,
`text-jtp-*`, `border-jtp-*`.

### Background layers (darkest → lightest)

| Token              | Value     | Use                                          |
|--------------------|-----------|----------------------------------------------|
| `jtp-bg`           | `#0b0c0e` | Page body                                    |
| `jtp-shell`        | `#0e1013` | Sidebar, topbar                              |
| `jtp-panel`        | `#0f1216` | Cards, panels, drawers                       |
| `jtp-raised`       | `#121519` | Table headers, computed rows                 |
| `jtp-control`      | `#131619` | SegmentedControl backgrounds, inactive tabs  |
| `jtp-active`       | `#15181d` | Selected rows, focused inputs                |
| `jtp-hover`        | `#181c22` | Row hover states                             |
| `jtp-statusbar`    | `#0c0e11` | Bottom status bar (slightly darker than shell)|

### Borders

| Token                | Use                                          |
|----------------------|----------------------------------------------|
| `jtp-border`         | Panel borders, section dividers              |
| `jtp-borderSubtle`   | Table row dividers                           |
| `jtp-borderStrong`   | Input borders, buttons, seg-controls         |
| `jtp-borderFocus`    | Focus states                                 |
| `jtp-borderHover`    | Hover states for bordered elements           |

### Text (high contrast — never faint gray on body text)

| Token             | Value     | Use                                          |
|-------------------|-----------|----------------------------------------------|
| `jtp-text`        | `#e8eaed` | Primary body text, values                    |
| `jtp-textSoft`    | `#cdd2d9` | Secondary values                             |
| `jtp-textMuted`   | `#9aa1ab` | Labels, icon text                            |
| `jtp-textDim`     | `#6b7280` | Section labels (UPPERCASE), metadata         |
| `jtp-textFaint`   | `#5b6370` | Timestamps, help text                        |
| `jtp-textDisabled`| `#454d57` | Disabled states                              |

**Never use `jtp-textFaint` or below for body copy. Body text = `jtp-text` or `jtp-textMuted`.**

### Semantic / money tokens

| Token           | Value     | Use                                          |
|-----------------|-----------|----------------------------------------------|
| `jtp-profit`    | `#4cc38a` | Positive P&L, wins, passed objectives        |
| `jtp-loss`      | `#e5635f` | Negative P&L, losses, breached limits        |
| `jtp-warning`   | `#d9a23b` | Approaching limit, safe headroom, amber flags|
| `jtp-blue`      | `#5b8def` | Primary action, active nav, chart line       |
| `jtp-blueHover` | `#6f9bf2` | Primary button hover                         |

---

## 3. Typography

### Fonts

- **Inter** — body text, nav, all prose
- **JetBrains Mono** — ALL numbers, money values, codes, timestamps, section labels

**Rule: any number displayed to the user must be in JetBrains Mono, bold or semibold,
with `fontVariantNumeric: 'tabular-nums'` for column alignment.**

### Type scale (selected sizes)

| Class            | Size     | Use                                               |
|------------------|----------|---------------------------------------------------|
| `text-jtp-4xl`   | 28px     | Hero stat tile values (Net P&L, Win Rate)         |
| `text-jtp-3xl`   | 22px     | Secondary stat values                             |
| `text-jtp-2xl`   | 17px     | Card headings                                     |
| `text-jtp-xl`    | 15px     | Nav labels, topbar title                          |
| `text-jtp-lg`    | 14px     | **Body text floor** — never go below this         |
| `text-jtp-md`    | 13px     | Standard row text, table cells, panel body        |
| `text-jtp-xs-plus`| 10.5px  | Section labels (UPPERCASE MONO)                   |
| `text-jtp-xs`    | 10px     | Badges, timestamps, status bar                    |
| `text-jtp-2xs`   | 9.5px    | Status bar items, micro labels                    |

### The `.jtp-label` utility class

Panel section headers use `.jtp-label` (defined in globals.css):
- 10.5px JetBrains Mono
- Uppercase, letter-spacing 0.08em
- Color: `jtp-textDim` (#6b7280)

Apply it with `className="jtp-label"` or `font-mono text-jtp-xs-plus uppercase tracking-[0.08em] text-jtp-textDim`.

---

## 4. UI Kit Components

Import everything from `components/ui/` (use the barrel `index.ts`):

```ts
import { Panel, StatTile, DataTable, Badge, SegmentedControl, Tabs, EmptyState, Skeleton } from '../components/ui';
```

### Panel — the fundamental layout unit

Every major data section goes in a `Panel`. It provides the uppercase label header,
optional actions slot, and consistent border/background.

```tsx
<Panel label="EQUITY CURVE" actions={<SegmentedControl .../>}>
  {/* chart here */}
</Panel>

<Panel label="TRADE LOG" noPadding>
  <DataTable .../>
</Panel>
```

- `label`: always UPPERCASE, brief (1-3 words)
- `actions`: put SegmentedControl, Badge, or icon buttons here
- `noPadding`: use when the body is a DataTable or a full-bleed component

### StatTile — hero metric

```tsx
<StatTile
  label="NET P&L"          // UPPERCASE label
  value="+$4,320"          // bold 28px mono value
  valueColor="text-jtp-profit"
  delta="+$890 today"
  positive
/>
```

Values must be formatted as: `+$X,XXX` or `-$X.XXXk` or `+12.4R`.

### DataTable — dense data table

```tsx
const cols: TableColumn<Trade>[] = [
  { key: 'asset',      header: 'ASSET' },
  { key: 'direction',  header: 'DIR', width: '60px' },
  { key: 'profitLoss', header: 'P&L', align: 'right', mono: true,
    render: (v, row) => <span className={v >= 0 ? 'text-jtp-profit' : 'text-jtp-loss'}>
      {formatPL(v)}
    </span> },
];

<Panel label="TRADE LOG" noPadding>
  <DataTable columns={cols} data={trades} keyFn={(t) => t.id} maxHeight="400px" />
</Panel>
```

- Numeric columns: `align: 'right'` + `mono: true`
- Currency cells: `text-jtp-profit` or `text-jtp-loss` based on sign
- Wrap in `<Panel noPadding>` for the canonical usage

### Badge — status chips

```tsx
<Badge variant="profit">PASSED</Badge>
<Badge variant="warning" size="xs">SAFE</Badge>
<Badge variant="loss">BREACHED</Badge>
<Badge variant="info">ON TRACK</Badge>
```

Variants: `profit | loss | warning | info | neutral`

### SegmentedControl — inline toggle

```tsx
<SegmentedControl
  segments={[{ value: '$', label: '$' }, { value: 'R', label: 'R' }]}
  value={mode}
  onChange={setMode}
/>
```

Use for $/R toggle, timeframe selectors, mode switches. Always monospace.

### Tabs — section-level navigation

```tsx
<Tabs
  tabs={[{ id: 'overview', label: 'Overview' }, { id: 'trades', label: 'Trades', badge: 47 }]}
  active={tab}
  onChange={setTab}
/>
```

### EmptyState — no-data placeholder

```tsx
<EmptyState
  title="No trades yet"
  description="Log your first trade to see this section."
  action={<Button onClick={logTrade}>Log First Trade</Button>}
/>
```

### Skeleton — loading state

```tsx
<Skeleton variant="stat" />         // stat tile shape
<Skeleton variant="panel" className="h-48" />  // full panel
<Skeleton variant="text" lines={4} />
```

---

## 5. Layout Rules

### App shell structure

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (fixed, 228px / 64px collapsed)  │ TopBar (52px)    │
│                                          ├──────────────────│
│ [Mark + "JTradePilot / Operator Console"]│ Content area     │
│                                          │ (overflow-y-auto)│
│ AccountSwitcher                          │                  │
│                                          │                  │
│ NavItems                                 │                  │
│  ● Dashboard ← active (left rail accent) │                  │
│    Journal                               │                  │
│    ...                                   │                  │
│                                          │                  │
│ User footer                              │                  │
├──────────────────────────────────────────┴──────────────────│
│ StatusBar (28px) — full width, always visible               │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard layout (reference implementation)

```
Row 1: grid grid-cols-2 xl:grid-cols-4 gap-3   ← StatTiles
Row 2: full-width Panel                          ← Trading Health
Row 3: full-width Panel (conditional)            ← Prop Firm Rules
Row 4: grid grid-cols-1 xl:grid-cols-3 gap-4    ← Equity (2/3) + Activity (1/3)
```

Gap between rows: `gap-4` (16px). Between columns: `gap-3` (12px) for stat tiles, `gap-4` for panels.

### Content padding

Main content area: `px-5 py-[18px] pb-10`
Panel body: `p-4` (default), 0 for flush content (use `noPadding`)

---

## 6. Legibility Rules (non-negotiable)

1. **Body text ≥ 14px** — use `text-jtp-lg` or larger for all readable prose
2. **Numbers in mono** — every currency, R-value, percentage, timestamp = JetBrains Mono
3. **Money = colored** — positive always `text-jtp-profit`, negative always `text-jtp-loss`
4. **Tabular nums** — money columns use `fontVariantNumeric: 'tabular-nums'` for alignment
5. **Section labels are NOT body text** — `.jtp-label` (10.5px uppercase mono) is a label, not content
6. **No faint gray on data** — `jtp-textFaint` and `jtp-textDisabled` are for timestamps and disabled states only; never for primary data values
7. **Contrast floor** — any text the user reads = at least `jtp-textMuted` (#9aa1ab) on `jtp-panel` (#0f1216)

---

## 7. Status Bar

The StatusBar component is mounted once in `DashboardPage.tsx` at the root level
(below the sidebar+main row). It renders full-width at `h-statusbar` (28px).

It uses `status-dot-live` / `status-dot-idle` / `status-dot-warn` CSS classes
(defined in `globals.css`) for animated pulse dots.

Wave 2 agents: **do not** re-render or duplicate the StatusBar. It is already mounted.

---

## 8. Active Nav State

The active nav item in `Sidebar.tsx` uses:
- `bg-[rgba(91,141,239,0.10)]` — subtle blue fill
- `text-jtp-blue` — text color
- `boxShadow: 'inset 2px 0 0 #5b8def'` — left rail accent (console feel)
- `aria-current="page"` — accessibility

---

## 9. Do / Don't

| Do                                             | Don't                                           |
|------------------------------------------------|-------------------------------------------------|
| Use `Panel` for every data section             | Build sections with raw `div` and no header     |
| Mono + bold for all numbers                    | Use sans-serif for P&L values                   |
| `jtp-profit` / `jtp-loss` for signed money     | Use green/red not in the token system           |
| `SegmentedControl` for $/R toggle              | Build custom toggle buttons                     |
| `Badge` for status indicators                  | Use colored text alone without a background     |
| `EmptyState` when a section has no data        | Let sections collapse to 0 height               |
| `Skeleton` during loading                      | Show nothing while data loads                   |
| `noPadding` + `DataTable` for tabular data     | Build tables from `<div>` rows                  |
| Import from `components/ui/index.ts`           | Import directly from individual component files |
