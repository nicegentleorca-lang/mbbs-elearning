import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2A4A',
        paper: '#EEF2F1',
        paperDim: '#E2E8E6',
        vital: '#C1442D',
        vitalDark: '#9C3623',
        venous: '#3C6E71',
        venousDark: '#2C5254',
        gold: '#C99A3C',
        slate: {
          DEFAULT: '#5B6672',
          light: '#8A93A0'
        }
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      borderRadius: {
        card: '1.5rem', // 24px iOS smooth pill container curve
        pill: '9999px'
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(27, 42, 74, 0.05), 0 2px 6px -1px rgba(27, 42, 74, 0.03)',
        hover: '0 12px 30px -4px rgba(27, 42, 74, 0.12), 0 6px 12px -3px rgba(60, 110, 113, 0.08)',
        glass: '0 8px 32px 0 rgba(27, 42, 74, 0.06)',
        glow: '0 0 20px -3px rgba(60, 110, 113, 0.25)'
      }
    }
  },
  plugins: [typography]
}
