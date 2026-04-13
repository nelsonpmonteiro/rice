/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:  '#1A1A2E',
          mid:   '#16213E',
          accent:'#0F3460',
          teal:  '#00B4D8',
        }
      }
    },
  },
  plugins: [],
}
