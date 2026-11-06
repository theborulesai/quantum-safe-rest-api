/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0e1a',
          card: '#0d1526',
          border: '#1a2a4a',
          accent: '#00d4ff',
          green: '#00ff88',
          red: '#ff3366',
          yellow: '#ffcc00',
          purple: '#8b5cf6',
        }
      },
    },
  },
  plugins: [],
}
