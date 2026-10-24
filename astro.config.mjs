// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// 部署相关 adapter（部署时切换为 cloudflare；本地 dev 不影响）
// import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://schemer.online',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  integrations: [
    tailwind({
      applyBaseStyles: false, // 我们用自定义 global.css 控制 base
    }),
    sitemap({
      // @astrojs/sitemap 默认基于生成路由生成。
      // 由于 [...slug].astro 已过滤 status（仅 published/archived 生成 HTML），
      // sitemap 自动跟随。archived 仍可被 sitemap 收录（保留旧链接可访问）。
      // 此处再加一道保险：显式排除占位 / 草稿 URL。
      filter: (page) => {
        const url = page.replace(/^https?:\/\/[^/]+/, '');
        if (url.startsWith('/events/_')) return false;
        if (url.startsWith('/people/_')) return false;
        if (url.startsWith('/organizations/_')) return false;
        // RSS / search.json / 内部文件不进 sitemap
        if (['/rss.xml', '/search.json', '/published-entries.json', '/admin', '/favorites', '/404'].includes(url.replace(/\/$/, ''))) return false;
        return true;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      // 档案馆风格：浅色主题 + 衬线等宽字体
      theme: 'github-light',
      wrap: true,
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 4096,
    },
  },
  // adapter 仅在部署时启用
  // output: 'server',
  // adapter: cloudflare({
  //   platformProxy: { enabled: true },
  // }),
});
