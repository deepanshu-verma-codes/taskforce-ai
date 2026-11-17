/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md Tokens: Canvas & Surfaces
        'canvas-dark': '#0b0e11',
        'canvas-light': '#ffffff',
        'surface-card-dark': '#1e2329',
        'surface-elevated-dark': '#2b3139',
        'surface-soft-light': '#fafafa',
        'surface-strong-light': '#f5f5f5',

        // Brand & Accent
        primary: {
          DEFAULT: '#FCD535',       // Binance Yellow
          active: '#f0b90b',        // Primary Active / Pressed
          disabled: '#3a3a1f',      // Desaturated Dark Yellow
        },
        'accent-turquoise': '#2dbdb6',

        // Trading Semantics
        'trading-up': '#0ecb81',     // Green (price up / verified)
        'trading-down': '#f6465d',   // Red (price down / error)

        // Hairlines & Borders
        'hairline-dark': '#2b3139',
        'hairline-light': '#eaecef',
        'border-strong': '#cdd1d6',

        // Text Tokens
        ink: '#181a20',
        body: {
          dark: '#eaecef',
          light: '#181a20',
        },
        muted: {
          DEFAULT: '#707a8a',
          strong: '#929aa5',
        },
        'on-primary': '#181a20',
        'on-dark': '#ffffff',
        info: '#3b82f6',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Sans', 'monospace'],
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
