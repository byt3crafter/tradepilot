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
        // ── JTradePilot design system tokens ────────────────────────────
        jtp: {
          bg:            '#0b0c0e',   // App / body background
          shell:         '#0e1013',   // Sidebar + topbar
          panel:         '#0f1216',   // Cards, panels, drawers
          raised:        '#121519',   // Summary rows, computed panels
          control:       '#131619',   // Toolbar inputs, search, inactive seg-controls
          active:        '#15181d',   // Account switcher, selected rows, form controls
          hover:         '#181c22',   // Nav hover, row hover
          avatar:        '#222933',   // User avatar background
          accountTag:    '#1d242e',   // Account tag tile
          border:        '#1c2128',   // Shell borders, panel borders, row separators
          borderSubtle:  '#16191e',   // Table row dividers
          borderStrong:  '#232931',   // Inputs, buttons, seg-controls
          borderFocus:   '#2a313a',   // Form field focus, secondary button border
          borderHover:   '#323942',   // Secondary hover border
          // Text
          text:          '#e8eaed',   // Primary text
          textSoft:      '#cdd2d9',   // Secondary values
          textNote:      '#b8bec7',   // Drawer notes
          textMuted:     '#9aa1ab',   // Default secondary labels
          textSubtle:    '#8b929c',   // Inactive tabs
          textDim:       '#6b7280',   // Labels, metadata
          textFaint:     '#5b6370',   // Timestamps, helper copy
          textDisabled:  '#454d57',   // Disabled, dropzone helper
          // Brand / interaction
          blue:          '#5b8def',   // Primary action, active nav, equity line
          blueHover:     '#6f9bf2',   // Primary action hover
          blueDeep:      '#3f6fd6',   // Brand gradient end
          // Trading semantics
          profit:        '#4cc38a',   // Positive P&L/R, long, profit target
          profitDot:     '#3fb37f',   // Live dot, clean execution
          loss:          '#e5635f',   // Negative P&L/R, short, max loss
          lossSoft:      '#e5847f',   // Mistake chips, MAE label
          warning:       '#d9a23b',   // Safe / headroom badges
        },
      },
      fontFamily: {
        // New JTP fonts (IBM Plex takes priority)
        sans:        ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono:        ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
        // Aliases for legacy classes
        orbitron:    ['"IBM Plex Sans"', 'Inter', 'sans-serif'],
        'tech-mono': ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        // JTP type scale
        'jtp-2xs':        ['9.5px',  { lineHeight: '1.2' }],
        'jtp-xs':         ['10px',   { lineHeight: '1.2' }],
        'jtp-xs-plus':    ['10.5px', { lineHeight: '1.3' }],
        'jtp-sm-minus':   ['11px',   { lineHeight: '1.4' }],
        'jtp-sm':         ['11.5px', { lineHeight: '1.4' }],
        'jtp-base-minus': ['12px',   { lineHeight: '1.4' }],
        'jtp-base':       ['12.5px', { lineHeight: '1.5' }],
        'jtp-md':         ['13px',   { lineHeight: '1.5' }],
        'jtp-md-plus':    ['13.5px', { lineHeight: '1.5' }],
        'jtp-lg':         ['14px',   { lineHeight: '1.5' }],
        'jtp-xl':         ['15px',   { lineHeight: '1.4' }],
        'jtp-2xl':        ['17px',   { lineHeight: '1.3' }],
        'jtp-3xl':        ['22px',   { lineHeight: '1.2' }],
        'jtp-4xl':        ['26px',   { lineHeight: '1.1' }],
      },
      spacing: {
        'sidebar':    '228px',
        'topbar':     '52px',
        'drawer':     '480px',
        'log-drawer': '460px',
        'jtp-row':    '43px',
      },
      borderRadius: {
        'jtp-xs':    '3px',
        'jtp-sm':    '4px',
        'jtp-md':    '5px',
        'jtp-lg':    '6px',
        'jtp-xl':    '7px',
        'jtp-2xl':   '8px',
        'jtp-3xl':   '9px',
        'jtp-panel': '10px',
      },
      boxShadow: {
        'jtp-drawer': '-20px 0 50px rgba(0,0,0,.4)',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-up':   'slideUp 0.5s ease-out forwards',
        'jtp-slide-in': 'jtpSlideIn 0.18s ease forwards',
        'jtp-fade-in':  'jtpFadeIn 0.12s ease forwards',
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
      },
    },
  },
  plugins: [],
}
