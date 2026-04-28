/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#f97316',
          dark: '#ea6c0d',
        },
      },
    },
  },
  plugins: [],
}
