/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        serif: ['Geist', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['Geist', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['Geist', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      // Dark archive theme: shared CSS tokens
      colors: {
        ink: {
          50: 'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          faded: 'rgb(var(--ink-faded) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          950: 'rgb(var(--ink-950) / <alpha-value>)',
        },
        archive: {
          paper: 'rgb(var(--archive-paper) / <alpha-value>)',
          aged: 'rgb(var(--archive-aged) / <alpha-value>)',
          seal: 'rgb(var(--archive-seal) / <alpha-value>)',
        },
      },
      fontSize: {
        'newspaper': ['1.0625rem', { lineHeight: '1.65' }],
      },
      maxWidth: {
        'column': '32rem',
        'reading': '42rem',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};