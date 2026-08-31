/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App surfaces (dark-first)
        bg: '#0f1115',
        surface: '#171a21',
        'surface-2': '#1e222b',
        'surface-3': '#272c37',
        border: '#2c313c',
        muted: '#8b93a4',
        faint: '#5b6271',
        text: '#e6e9ef',
        accent: '#6c8cff',
        'accent-soft': '#2a3358',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
