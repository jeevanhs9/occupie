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
          burgundy: {
            950: '#160e11',
            900: '#28151b',
            800: '#48222e',
            700: '#672b3c',
            600: '#874254',
            200: '#dcc7cb',
            50: '#f7f0f1',
          },
          walnut: {
            950: '#110e0e',
            900: '#191315',
            850: '#261b1e',
            800: '#332226',
            700: '#493138',
            600: '#60464c',
          },
          brass: {
            300: '#e2d1aa',
            400: '#d5bf8b',
            500: '#b4945a',
            600: '#927342',
          },
          ivory: '#f3eee5',
          cream: '#fbf8f2',
          taupe: '#786e64',
          // Compatibility aliases used by the existing app components.
          navy: {
            950: '#110e0e',
            900: '#191315',
            850: '#261b1e',
            800: '#48222e',
            700: '#672b3c',
            600: '#874254',
          },
          teal: {
            400: '#d5bf8b',
            500: '#b4945a',
            600: '#927342',
          },
          cyan: {
            400: '#e2d1aa',
            500: '#b4945a',
            600: '#927342',
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
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        lg: '0.55rem',
        xl: '0.7rem',
        '2xl': '0.85rem',
        '3xl': '1rem',
      },
      boxShadow: {
        'card': '0 2px 10px -4px rgba(37, 29, 18, 0.12), 0 1px 3px rgba(37, 29, 18, 0.04)',
        'card-hover': '0 12px 26px -12px rgba(37, 29, 18, 0.18), 0 2px 5px rgba(37, 29, 18, 0.05)',
        'glow-teal': '0 2px 12px -4px rgba(103, 43, 60, 0.2)',
        'glow-cyan': '0 2px 12px -4px rgba(180, 148, 90, 0.18)',
      }
    },
  },
  plugins: [],
}
