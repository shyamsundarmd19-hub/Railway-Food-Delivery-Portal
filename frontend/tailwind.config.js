/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        peach: {
          50: '#fff9f5',
          100: '#ffede0',
          200: '#ffd8c0',
          300: '#ffbc95',
          400: '#ff9662',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(249, 115, 22, 0.12)',
        'warm-hover': '0 8px 24px -2px rgba(249, 115, 22, 0.18)',
      }
    },
  },
  plugins: [],
}
