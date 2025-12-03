/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        orbitron: ['Inter', 'sans-serif'],
        'tech-mono': ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [],
}
