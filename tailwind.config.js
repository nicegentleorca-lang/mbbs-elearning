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
        card: '1.25rem' // Updated to 20px (iOS rounded card radius)
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(27, 42, 74, 0.06), 0 1px 4px -1px rgba(27, 42, 74, 0.04)',
        hover: '0 8px 20px -4px rgba(27, 42, 74, 0.12), 0 4px 8px -2px rgba(27, 42, 74, 0.06)'
      }
    }
  },
  plugins: [typography]
}
