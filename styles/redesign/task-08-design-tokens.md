# Task 08 - Redesign Design Tokens

Source:
- `JTradePilot Trading Journal Redesign/JTradePilot.dc.html`
- `JTradePilot Trading Journal Redesign/screenshots/dashboard.png`
- Existing frontend theme files: `tailwind.config.js`, `styles/globals.css`

Scope:
- Extract colors, spacing, type scale, layout constants, and motion tokens from the design comp.
- Translate the comp into a Tailwind-ready token plan for later implementation.
- This is a Phase 1 read-only artifact. No app code was changed.

## Executive Summary

The redesign uses a compact, dark, data-dense trading terminal system. It is built around IBM Plex Sans for interface text and IBM Plex Mono for numeric market/trade data. The visual identity depends on layered near-black surfaces, thin cool-gray borders, blue active states, green/red P&L semantics, and small-radius controls.

The current frontend theme is close in spirit but not in tokens. It uses Inter, JetBrains Mono, a darker `#08090A` base, grid background styling, generic Tailwind semantic colors, and brighter default profit/loss hues. Phase 4 should replace the current "future/photonic" theme language with this quieter prop-firm journal system.

## Token Principles

- Use dense app metrics as first-class tokens: 52px bars, 228px sidebar, 460-480px right drawers, 20px content gutters, 43px table rows.
- Use mono type for values, timestamps, balances, prices, R multiples, percentages, and badges.
- Keep borders visible but quiet. The comp uses 1px borders everywhere instead of shadows, except right drawers.
- Treat blue as interaction and selection, not decoration. Green, red, and amber are reserved for trading states.
- Avoid current global background grid in the redesigned app shell. The comp body is a flat `#0b0c0e`.

## Color Tokens

### Core Surfaces

| Token | Hex | Usage |
|---|---:|---|
| `jtp-bg` | `#0b0c0e` | Body/app background, brand-mark inner cutout, scrollbar border |
| `jtp-shell` | `#0e1013` | Sidebar, topbar, tab bar |
| `jtp-panel` | `#0f1216` | Cards, tables, dashboard panels, drawers |
| `jtp-panel-raised` | `#121519` | Summary rows, computed trade panel, screenshot stripe base |
| `jtp-control` | `#131619` | Toolbar filters, search, inactive segmented controls |
| `jtp-control-active` | `#15181d` | Account switcher, selected rows, form controls, drawer cards |
| `jtp-hover` | `#181c22` | Sidebar/nav hover |
| `jtp-hover-strong` | `#191d23` | Account switcher hover |
| `jtp-avatar` | `#222933` | User avatar fallback |
| `jtp-avatar-alt` | `#1d242e` | Account tag tile |

### Borders And Dividers

| Token | Hex | Usage |
|---|---:|---|
| `jtp-border-subtle` | `#16191e` | Table/recent activity row separators |
| `jtp-border` | `#1c2128` | Shell borders, panel borders, tab separators |
| `jtp-border-strong` | `#232931` | Inputs, buttons, segmented controls, drawer borders |
| `jtp-border-focus` | `#2a313a` | Form field border, secondary button border |
| `jtp-border-hover` | `#323942` | Secondary hover border, R zero line |
| `jtp-border-dashed` | `#2d343d` | Screenshot drop zone dashed border |
| `jtp-muted-rail` | `#252b33` | Toggle-off state, inactive confidence dots |
| `jtp-muted-line` | `#2a2f37` | Scrollbar thumb |

### Text

| Token | Hex | Usage |
|---|---:|---|
| `jtp-text` | `#e8eaed` | Primary text and selected nav text |
| `jtp-text-soft` | `#cdd2d9` | Secondary values, controls, table data |
| `jtp-text-note` | `#b8bec7` | Longer notes in drawer |
| `jtp-text-muted` | `#9aa1ab` | Default secondary labels and inactive nav text |
| `jtp-text-subtle` | `#8b929c` | Inactive tabs, low-emphasis row text |
| `jtp-text-dim` | `#6b7280` | Labels, headers, metadata |
| `jtp-text-faint` | `#5b6370` | Timestamps, helper copy, empty table marks |
| `jtp-text-disabled` | `#454d57` | Disabled/dropzone helper copy |
| `jtp-text-empty` | `#3d4651` | Empty chip dash |
| `jtp-white` | `#ffffff` | Primary button text |

### Brand And Interaction

| Token | Hex | Usage |
|---|---:|---|
| `jtp-blue` | `#5b8def` | Primary action, active nav, active tabs, equity line, R/$ toggle |
| `jtp-blue-hover` | `#6f9bf2` | Primary action hover |
| `jtp-blue-deep` | `#3f6fd6` | Brand mark gradient end |
| `jtp-blue-bg` | `rgba(91,141,239,.12)` | Active nav/dimension subtle background |
| `jtp-blue-bg-soft` | `rgba(91,141,239,.10)` | Selected list row background |
| `jtp-blue-bg-badge` | `rgba(91,141,239,.14)` | On-track status badge |

### Trading Semantics

| Token | Hex/RGBA | Usage |
|---|---:|---|
| `jtp-profit` | `#4cc38a` | Positive P&L/R, long direction, profit target bars |
| `jtp-profit-soft` | `#5fc395` | MFE label |
| `jtp-profit-dot` | `#3fb37f` | Date-range live dot, clean execution |
| `jtp-profit-bg` | `rgba(76,195,138,.16)` | Passed/checklist-followed status |
| `jtp-profit-bg-soft` | `rgba(76,195,138,.14)` | Checklist and adherence badge background |
| `jtp-profit-track` | `rgba(63,179,127,.5)` | MFE excursion track |
| `jtp-loss` | `#e5635f` | Negative P&L/R, short direction, max loss lines |
| `jtp-loss-soft` | `#e5847f` | Mistake chips, MAE label |
| `jtp-loss-bg` | `rgba(229,99,95,.16)` | Breached/checklist-broken status |
| `jtp-loss-bg-soft` | `rgba(229,99,95,.14)` | At-risk status and failed checklist background |
| `jtp-loss-bg-faint` | `rgba(229,99,95,.10)` | Mistake chip background |
| `jtp-loss-area` | `rgba(229,99,95,.18)` | Drawdown legend/fill |
| `jtp-loss-track` | `rgba(229,99,95,.5)` | MAE excursion track |
| `jtp-warning` | `#d9a23b` | Safe/headroom and risk value |
| `jtp-warning-bg` | `rgba(217,162,59,.14)` | Safe/headroom status badge |

### Overlays And Effects

| Token | Value | Usage |
|---|---:|---|
| `jtp-backdrop` | `rgba(0,0,0,.45)` | Detail/log drawer backdrop |
| `jtp-drawer-shadow` | `-20px 0 50px rgba(0,0,0,.4)` | Right drawer shadow |
| `jtp-brand-mark` | `linear-gradient(135deg,#5b8def,#3f6fd6)` | Sidebar brand square |
| `jtp-dropzone-stripes` | `repeating-linear-gradient(135deg,#121519,#121519 9px,#14181d 9px,#14181d 18px)` | Screenshot drop zone |

## Typography Tokens

### Families

| Token | Stack | Usage |
|---|---|---|
| `font-sans` | `"IBM Plex Sans", system-ui, sans-serif` | All UI text |
| `font-mono` | `"IBM Plex Mono", monospace` | Balances, dates, prices, R multiples, chart legends, badges |

Implementation note: the comp imports IBM Plex Sans weights 400, 500, 600, 700 and IBM Plex Mono weights 400, 500, 600. Add the font import to the app entry path or self-host later if performance requires it.

### Type Scale

| Token | Size | Common weight | Usage |
|---|---:|---:|---|
| `text-jtp-2xs` | `9.5px` | 600 or 400 | Status badges, fact labels, chart/excursion annotations |
| `text-jtp-xs` | `10px` | 400 or 600 | Count badges, helper copy, table metadata |
| `text-jtp-xs-plus` | `10.5px` | 400 or 600 | Table headers, labels, legends, input labels |
| `text-jtp-sm-minus` | `11px` | 400 or 600 | Rule context, toggle labels, mono controls |
| `text-jtp-sm` | `11.5px` | 400 or 500 | Page subtitles, rule labels, date chip |
| `text-jtp-base-minus` | `12px` | 500 or 600 | Compact row labels, section headers, controls |
| `text-jtp-base` | `12.5px` | 400 to 600 | Table body, buttons, textarea copy |
| `text-jtp-md` | `13px` | 500 | App base, nav items, form fields |
| `text-jtp-md-plus` | `13.5px` | 500 | Prop-rule numeric values |
| `text-jtp-lg` | `14px` | 600 | Brand wordmark, icon close buttons |
| `text-jtp-xl` | `15px` | 600 | Page title, drawer title, monthly label |
| `text-jtp-2xl` | `17px` | 600 | Drawer asset title, computed trade values |
| `text-jtp-3xl` | `22px` | 600 | Dashboard KPI values |
| `text-jtp-4xl` | `26px` | 700 | Detail drawer headline R/P&L |

### Letter Spacing And Case

| Token | Value | Usage |
|---|---:|---|
| `tracking-jtp-tight` | `-0.2px` | Brand and page title only |
| `tracking-jtp-label` | `0.4px` | Uppercase table/form labels |
| `tracking-jtp-label-wide` | `0.5px` | Dashboard KPI labels and drawer section labels |

Use uppercase only for compact labels and table headers. Body copy and button text stay sentence case.

## Spacing Tokens

The comp is denser than the current frontend. Tailwind's default 4px scale can represent most values, but several exact tokens should be named because they define the app rhythm.

### Global Layout

| Token | Value | Usage |
|---|---:|---|
| `jtp-sidebar-w` | `228px` | Fixed desktop sidebar |
| `jtp-topbar-h` | `52px` | Sidebar brand row and main topbar |
| `jtp-page-x` | `20px` | Main content horizontal gutter |
| `jtp-page-y` | `18px` | Dashboard/content vertical gutter |
| `jtp-drawer-w` | `480px` | Trade detail drawer |
| `jtp-log-drawer-w` | `460px` | Log trade drawer |
| `jtp-drawer-max-w` | `92vw` | Drawer mobile constraint |
| `jtp-table-min-w` | `920px` | Journal history table minimum width |
| `jtp-chart-h` | `240px` | Equity chart SVG height |
| `jtp-dropzone-h` | `170px` | Detail drawer chart drop zone |
| `jtp-row-h` | `43px` | Compact table row height |

### Component Padding

| Token | Value | Usage |
|---|---:|---|
| `jtp-pad-nav` | `8px 10px` | Sidebar nav item |
| `jtp-pad-account` | `9px 10px` | Account switcher |
| `jtp-pad-chip` | `6px 11px` | Date range chip |
| `jtp-pad-button-sm` | `7px 11px` | Toolbar buttons |
| `jtp-pad-button` | `8px 14px` | Primary topbar action |
| `jtp-pad-control` | `9px 10px` | Inputs/selects |
| `jtp-pad-panel` | `15px 18px` | Dashboard panels |
| `jtp-pad-card` | `13px 16px` | KPI cards and recent header |
| `jtp-pad-drawer` | `18px 20px` | Drawer body |
| `jtp-pad-drawer-header` | `16px 20px` | Drawer header |
| `jtp-pad-drawer-footer` | `13px 20px` | Drawer footer |
| `jtp-pad-table-cell` | `0 12px` | Journal table body cells |
| `jtp-pad-table-head` | `10px 12px` | Journal table headers |

### Gaps

| Token | Value | Usage |
|---|---:|---|
| `jtp-gap-xxs` | `2px` | Sidebar nav vertical gap |
| `jtp-gap-xs` | `4px` | Confidence dots, small chip clusters |
| `jtp-gap-sm` | `6px` | Checklist rows, chip groups |
| `jtp-gap-md` | `10px` | Toolbar, drawer facts, rows |
| `jtp-gap-lg` | `12px` | KPI card grid, headline cards |
| `jtp-gap-xl` | `16px` | Topbar, dashboard sections, equity/recent grid |
| `jtp-gap-2xl` | `18px` | Drawer sections |
| `jtp-gap-rules` | `22px` | Prop rule columns |

## Radius Tokens

The comp uses small radii. Do not carry over large rounded-card treatments into the redesigned app.

| Token | Value | Usage |
|---|---:|---|
| `radius-jtp-2xs` | `2px` | Brand mark inner cutout |
| `radius-jtp-xs` | `3px` | Progress rails, confidence dots |
| `radius-jtp-sm` | `4px` | Checklist icons |
| `radius-jtp-md` | `5px` | Brand mark, status badges, adherence square, mistake chips |
| `radius-jtp-lg` | `6px` | Avatar/account tag, drawer close button |
| `radius-jtp-xl` | `7px` | Buttons, form fields, segmented controls, nav items |
| `radius-jtp-2xl` | `8px` | Account switcher, calendar cells, fact cards |
| `radius-jtp-3xl` | `9px` | Drawer metric cards, computed panels, screenshot drop zone |
| `radius-jtp-panel` | `10px` | Dashboard panels and table containers |
| `radius-full` | `9999px` | Avatars, toggle knobs, live date dot |

## Motion Tokens

| Token | Value | Usage |
|---|---:|---|
| `jtp-motion-fast` | `120ms ease` | Backdrop fade |
| `jtp-motion-drawer` | `180ms ease` | Right drawer slide-in |
| `jtp-motion-toggle` | `150ms` | Low-performance toggle background and knob |

Keyframes:

```css
@keyframes jtp-slide-in {
  from { transform: translateX(24px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes jtp-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Respect reduced motion in implementation. Low-performance mode should be able to suppress nonessential chart and transition work later.

## Tailwind Theme Plan

Suggested shape for a later implementation task:

```js
theme: {
  extend: {
    colors: {
      jtp: {
        bg: '#0b0c0e',
        shell: '#0e1013',
        panel: '#0f1216',
        raised: '#121519',
        control: '#131619',
        active: '#15181d',
        border: '#1c2128',
        borderStrong: '#232931',
        borderFocus: '#2a313a',
        text: '#e8eaed',
        textSoft: '#cdd2d9',
        textMuted: '#9aa1ab',
        textDim: '#6b7280',
        textFaint: '#5b6370',
        blue: '#5b8def',
        blueHover: '#6f9bf2',
        profit: '#4cc38a',
        loss: '#e5635f',
        warning: '#d9a23b'
      }
    },
    fontFamily: {
      sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'monospace']
    },
    fontSize: {
      'jtp-2xs': '9.5px',
      'jtp-xs': '10px',
      'jtp-xs-plus': '10.5px',
      'jtp-sm-minus': '11px',
      'jtp-sm': '11.5px',
      'jtp-base-minus': '12px',
      'jtp-base': '12.5px',
      'jtp-md': '13px',
      'jtp-md-plus': '13.5px',
      'jtp-lg': '14px',
      'jtp-xl': '15px',
      'jtp-2xl': '17px',
      'jtp-3xl': '22px',
      'jtp-4xl': '26px'
    },
    spacing: {
      'sidebar': '228px',
      'topbar': '52px',
      'drawer': '480px',
      'log-drawer': '460px',
      'row': '43px'
    },
    borderRadius: {
      'jtp-xs': '3px',
      'jtp-sm': '4px',
      'jtp-md': '5px',
      'jtp-lg': '6px',
      'jtp-xl': '7px',
      'jtp-2xl': '8px',
      'jtp-3xl': '9px',
      'jtp-panel': '10px'
    },
    boxShadow: {
      'jtp-drawer': '-20px 0 50px rgba(0,0,0,.4)'
    }
  }
}
```

## Current Theme Delta

The current frontend theme should not be treated as the redesign target:

| Area | Current frontend | Redesign target |
|---|---|---|
| Body background | `#08090A` plus grid image | Flat `#0b0c0e` |
| Font | Inter | IBM Plex Sans |
| Mono font | JetBrains Mono | IBM Plex Mono |
| Surface naming | `void`, `future-panel`, `surface` | Shell/panel/control/active surfaces |
| Profit | `#10b981` | `#4cc38a` |
| Loss | `#ef4444` | `#e5635f` |
| Warning | `#f59e0b` | `#d9a23b` |
| Info/brand | `#3b82f6` plus white aliases | `#5b8def` and `#3f6fd6` |
| App density | Large glass/grid styling | Compact terminal-style panels |
| Motion | 500ms fade/slide-up | 120-180ms fade/slide-in |

## Implementation Notes For Phase 4

- Add the `styles/redesign` artifacts to the implementation checklist before changing `tailwind.config.js`.
- Migrate the app shell first so global body, font, scrollbar, and grid-background decisions are visible before page rebuilds.
- Keep token names semantic to the trading UI, not decorative names like `photonic-blue`.
- Use the tokenized `profit`, `loss`, and `warning` colors consistently across table values, prop-firm rules, calendar heatmap, chart overlays, checklist status, and mistake/excursion components.
- Keep form controls, buttons, tabs, and segmented toggles at 7px radius unless a local comp element shows otherwise.
- Do not introduce a card-inside-card visual system. The comp relies on full app sections and thin panels, not nested glass cards.

## Verification Notes

- This task was read-only analysis plus this markdown artifact.
- No build was run because Phase 1 tasks #6-9 explicitly do not run builds.
- No backend, tools, shared contract, or app runtime files were edited.
