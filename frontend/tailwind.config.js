/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        occupie: {
          navy: {
            950: '#050914',
            900: '#0A1124',
            850: '#0F1832',
            800: '#172346',
            700: '#233462',
            600: '#344C88',
          },
          teal: {
            400: '#2DD4BF',
            500: '#14B8A6',
            600: '#0D9488',
          },
          cyan: {
            400: '#38BDF8',
            500: '#0EA5E9',
            600: '#0284C7',
          },
          amber: {
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
          },
          warm: {
            50: '#FCFBF9',
            100: '#F7F5EE',
            200: '#EDE8DD',
            300: '#D8D1C0',
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(10, 17, 36, 0.05), 0 2px 6px -1px rgba(10, 17, 36, 0.02)',
        'card-hover': '0 12px 32px -4px rgba(10, 17, 36, 0.12), 0 4px 12px -2px rgba(10, 17, 36, 0.04)',
        'glow-teal': '0 0 24px -4px rgba(20, 184, 166, 0.25)',
        'glow-cyan': '0 0 24px -4px rgba(14, 165, 233, 0.25)',
      }
    },
  },
  plugins: [],
}
