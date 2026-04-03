/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D021F',
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
        'space-mono': ['var(--font-space-mono)', 'monospace'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
