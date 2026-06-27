/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Legacy tokens (kept so other pages compile) ──────────────────
        'void': '#08090A',
        'surface': 'rgba(255, 255, 255, 0.02)',
        'surface-highlight': 'rgba(255, 255, 255, 0.05)',
        'overlay': '#08090A',
        'primary': '#f5f5f5',
        'secondary': '#737373',
        'tertiary': '#262626',
        'profit': '#10b981',
        'loss': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6',
        'brand': '#FFFFFF',
        'photonic-blue': '#FFFFFF',
        'future-dark': '#08090A',
        'future-panel': '#0C0D0E',
        'future-gray': '#737373',
        'future-light': '#f5f5f5',
        'risk-high': '#ef4444',
        'risk-medium': '#f59e0b',
        'momentum-green': '#10b981',
        // ── JTradePilot Operator Console token system ──────────────────────
        jtp: {
          // ── Backgrounds / layers ──
          bg:            '#08090b',   // App / body background
          shell:         '#0a0c0e',   // Sidebar + topbar
          panel:         '#0d0f12',   // Cards, panels, drawers
          raised:        '#121519',   // Summary rows, computed panels
          control:       '#131619',   // Toolbar inputs, search, inactive seg-controls
          active:        '#15181d',   // Account switcher, selected rows, form controls
          hover:         '#171b20',   // Nav hover, row hover
          avatar:        '#1d2229',   // User avatar background
          accountTag:    '#1a2030',   // Account tag tile
          statusbar:     '#090a0c',   // Bottom status bar (slightly darker than shell)
          // ── Borders ──
          border:        '#1b2026',   // Shell borders, panel borders, row separators
          borderSubtle:  '#14171c',   // Table row dividers
          borderStrong:  '#262c34',   // Inputs, buttons, seg-controls
          borderFocus:   '#e8a23d',   // Form field focus — AMBER accent
          borderHover:   '#2e3540',   // Secondary hover border
          // ── Text scale (high-contrast, legible on dark) ──
          text:          '#e6e9ee',   // Primary text (≈ white-ish)
          textSoft:      '#ccd1d8',   // Secondary values
          textNote:      '#b5bbc4',   // Drawer notes
          textMuted:     '#9aa3ad',   // Default secondary labels
          textSubtle:    '#88909a',   // Inactive tabs
          textDim:       '#69727c',   // Labels, metadata
          textFaint:     '#565d66',   // Timestamps, helper copy
          textDisabled:  '#404850',   // Disabled, dropzone helper
          // ── Brand / interaction — AMBER replaces blue ──
          blue:          '#e8a23d',   // Primary action, active nav, equity line (AMBER)
          blueHover:     '#ffb838',   // Primary action hover (AMBER BRIGHT)
          blueDeep:      '#c47e1e',   // Brand gradient end (AMBER DEEP)
          // ── Amber aliases (explicit) ──
          amber:         '#e8a23d',   // Primary amber accent
          amberBright:   '#ffb838',   // Emphasis amber
          amberDim:      '#a06a1a',   // Dimmed amber
          // ── Secondary accent ──
          cyan:          '#4fd1e0',   // Secondary accent (sparingly)
          // ── Scanline overlay ──
          scanline:      'rgba(0,0,0,0.15)',
          // ── Trading semantics (money tokens — highest contrast) ──
          profit:        '#3ddc84',   // Positive P&L/R, long, profit target
          profitDot:     '#2dc574',   // Live dot, clean execution
          loss:          '#ff5b52',   // Negative P&L/R, short, max loss
          lossSoft:      '#ff8078',   // Mistake chips, MAE label
          warning:       '#e8a23d',   // Safe / headroom badges (amber)
        },
      },
      fontFamily: {
        // Inter is the BODY/DEFAULT font — proportional, for prose/descriptive text
        sans:        ['Inter', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        // JetBrains Mono — explicit for all DATA: numbers, tickers, labels, nav, table cells
        mono:        ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        // Semantic alias: font-data → same as font-mono; clarifies intent at call sites
        data:        ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        // inter kept as explicit alias for legacy call-sites that used font-inter
        inter:       ['Inter', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        orbitron:    ['"JetBrains Mono"', 'monospace'],
        'tech-mono': ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        // ── JTP Operator Console type scale ──────────────────────────────
        // Rule: body text ≥ 13px (mono), labels ≥ 10px, numbers use mono + bold + high contrast
        'jtp-2xs':        ['9.5px',  { lineHeight: '1.2' }],   // micro labels, status bar
        'jtp-xs':         ['10px',   { lineHeight: '1.2' }],   // tiny badges, timestamps
        'jtp-xs-plus':    ['10.5px', { lineHeight: '1.3' }],   // section labels (UPPERCASE MONO)
        'jtp-sm-minus':   ['11px',   { lineHeight: '1.4' }],   // sub-labels
        'jtp-sm':         ['11.5px', { lineHeight: '1.4' }],   // helper text
        'jtp-base-minus': ['12px',   { lineHeight: '1.4' }],   // compact row text
        'jtp-base':       ['12.5px', { lineHeight: '1.5' }],   // secondary values
        'jtp-md':         ['13px',   { lineHeight: '1.5' }],   // standard row text
        'jtp-md-plus':    ['13.5px', { lineHeight: '1.5' }],   // slightly elevated
        'jtp-lg':         ['14px',   { lineHeight: '1.5' }],   // body text minimum ← FLOOR
        'jtp-xl':         ['15px',   { lineHeight: '1.4' }],   // nav labels, sub-headings
        'jtp-2xl':        ['17px',   { lineHeight: '1.3' }],   // card headings
        'jtp-3xl':        ['22px',   { lineHeight: '1.2' }],   // stat values (medium)
        'jtp-4xl':        ['28px',   { lineHeight: '1.1' }],   // stat values (hero) — was 26px
        'jtp-5xl':        ['36px',   { lineHeight: '1.0' }],   // large hero numbers
      },
      spacing: {
        'sidebar':    '228px',
        'topbar':     '52px',
        'statusbar':  '28px',    // Bottom status bar height
        'drawer':     '480px',
        'log-drawer': '460px',
        'jtp-row':    '43px',
      },
      borderRadius: {
        'jtp-xs':    '1px',
        'jtp-sm':    '2px',
        'jtp-md':    '2px',
        'jtp-lg':    '3px',
        'jtp-xl':    '3px',
        'jtp-2xl':   '4px',
        'jtp-3xl':   '4px',
        'jtp-panel': '4px',
      },
      boxShadow: {
        'jtp-drawer': '-20px 0 50px rgba(0,0,0,.4)',
        'jtp-panel':  '0 2px 12px rgba(0,0,0,.25)',
        'jtp-float':  '0 8px 32px rgba(0,0,0,.5)',
      },
      animation: {
        'fade-in':        'fadeIn 0.5s ease-out forwards',
        'fade-in-up':     'fadeInUp 0.5s ease-out forwards',
        'slide-up':       'slideUp 0.5s ease-out forwards',
        'jtp-slide-in':   'jtpSlideIn 0.18s ease forwards',
        'jtp-fade-in':    'jtpFadeIn 0.12s ease forwards',
        'pulse-dot':      'pulseDot 2s ease-in-out infinite',
        'ticker-scroll':  'tickerScroll 30s linear infinite',
        'blink-cursor':   'blinkCursor 1s step-end infinite',
        'amber-pulse':    'amberPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        jtpSlideIn: {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        jtpFadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        tickerScroll: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blinkCursor: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        amberPulse: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 4px rgba(232,162,61,0.4)' },
          '50%':      { opacity: '0.6', boxShadow: '0 0 8px rgba(232,162,61,0.7)' },
        },
      },
    },
  },
  plugins: [],
}
