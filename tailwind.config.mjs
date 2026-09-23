/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      // 档案馆 / 报纸风格：衬线 + 等宽
      fontFamily: {
        // 正文：传统衬线（类似 NYT / 大公报）
        serif: [
          '"Source Serif 4"',
          '"Source Serif Pro"',
          '"Noto Serif SC"',
          'Georgia',
          '"Times New Roman"',
          'serif',
        ],
        // 标题：黑体衬线（类似档案馆匾额）
        display: [
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          'Georgia',
          '"Times New Roman"',
          'serif',
        ],
        // 元数据 / 来源 / 时间戳：等宽（打字机感）
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          '"Menlo"',
          '"Cascadia Code"',
          'monospace',
        ],
      },
      // 报纸版面色调：CSS 变量支持深色模式
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