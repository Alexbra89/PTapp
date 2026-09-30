/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: { DEFAULT: '#0B0A09', 800: '#121110', 700: '#151412', 600: '#1B1A17' },
        bone:     { DEFAULT: '#F2ECE1', 60: 'rgba(242,236,225,0.60)', 34: 'rgba(242,236,225,0.34)' },
        gold:     { DEFAULT: '#C9A96E', hi: '#E3C68C', lo: '#8E7443' },
        platinum: '#B8BEC6',
        sage:     '#9DC496',
        ember:    '#E07A4F',
      },
      fontFamily: {
        sans:  ['Schibsted Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Times New Roman', 'serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        hair:   'rgba(242,236,225,0.08)',
        strong: 'rgba(242,236,225,0.16)',
      },
      transitionTimingFunction: {
        atelier: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
