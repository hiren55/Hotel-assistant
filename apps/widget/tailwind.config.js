/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        'luxe-navy': '#0f172a',
        'luxe-navy-hover': '#1e293b',
        'luxe-blue-50': '#f8fafc',
        'luxe-blue-100': '#f1f5f9',
        'luxe-gray': '#e2e8f0'
      }
    },
  },
  plugins: [],
}
