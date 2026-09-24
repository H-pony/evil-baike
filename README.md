# 恶人百科 · 公共事件的永久档案馆

> 网络没有记忆。普通人的精力是有限的。
> 这里，是那些事件的永久档案。

一个民间维护的公共事件档案馆。**不作道德定性，仅如实汇总事件经过与各方报道**，让事件的完整时间线、信源链条在多年后仍可被查阅。

---

## 这是什么

- **事件档案馆**：每条事件按时间线 + 信源记录。
- **人物 / 机构档案**：交叉引用所有相关事件。
- **开放投稿**：投稿表单只收集姓名和事件内容，记录保存在后台数据库。
- **公开 Git 历史**：已发布档案的修改可追溯、可审计。

## 这不是什么

- ❌ 不是"贴标签"网站 —— 不对任何人作法律或道德定性
- ❌ 不是匿名爆料站 —— 所有事实须附可溯源链接
- ❌ 不是维权平台 —— 不替任何一方站台，仅做记录

---

## 技术栈

- **[Astro 5](https://astro.build)** —— Markdown 原生、SEO 友好，内容页面静态生成
- **[Tailwind CSS 3](https://tailwindcss.com)** —— 实用 CSS 框架
- **[Content Collections](https://docs.astro.build/en/guides/content-collections/)** —— 三体（事件/人物/机构）schema 验证
- **[Cloudflare Pages](https://pages.cloudflare.com)** —— 全球 CDN + 抗审查（部署时启用）

---

## 部署

完整部署指南见 **[docs/DEPLOY.md](./docs/DEPLOY.md)**。

简版:
1. 推代码到 GitHub
2. 在 Cloudflare 控制台创建 Pages 项目,选 `Astro` preset
3. Build command = `npm run build`,output = `dist`
4. push 到 main 自动部署

零成本、无限流量、全球 CDN。

---

## 快速开始

```bash
# 1. 确认 Node 20+（推荐 24 LTS）
node -v

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# → http://localhost:4321

# 4. 构建生产版本
npm run build

# 5. 验证内容
npm run validate
```

---

## 项目结构

```
.
├── src/
│   ├── content.config.ts          # 三体 schema 定义（Zod 验证）
│   ├── content/
│   │   ├── events/                # 事件条目（*.md）
│   │   ├── people/                # 人物条目
│   │   ├── organizations/         # 机构条目
│   │   ├── _drafts/               # 编辑审核草稿（不进入公开页面）
│   │   └── _private/              # 个人草稿（gitignored）
│   ├── components/                # 卡片/徽章/时间线等组件
│   ├── layouts/                   # BaseLayout / EntryLayout
│   ├── pages/                     # 路由
│   │   ├── index.astro            # 首页
│   │   ├── events/                # 事件列表 + 详情
│   │   ├── people/                # 人物列表 + 详情
│   │   ├── organizations/         # 机构列表 + 详情
│   │   ├── tags/                  # 标签列表 + 详情
│   │   ├── submit.astro           # 只收集姓名和事件内容的投稿入口
│   │   └── admin/index.astro      # 浏览量和投稿后台
│   │   ├── about.astro
│   │   ├── disclaimer.astro
│   │   ├── methodology.astro
│   │   └── 404.astro
│   └── styles/global.css          # 档案馆 / 报纸风格
├── functions/                     # Cloudflare Pages API：浏览量、投稿、后台
├── migrations/                    # D1 数据库初始化
├── .github/
│   ├── ISSUE_TEMPLATE/config.yml  # 将新 Issue 投稿引导到网站表单
│   └── workflows/deploy.yml       # Cloudflare Pages 部署
├── scripts/
│   ├── new-entry.mjs              # 新条目脚手架
│   ├── deploy-cloudflare.sh       # 一键部署脚本（替代 Pages 直连）
│   └── validate-content.mjs       # 内容验证 + URL 健康检查
├── docs/
│   ├── CONTRIBUTING.md            # 投稿与编辑指南
│   └── ANALYTICS.md               # 浏览量与投稿后台配置
├── astro.config.mjs
├── tailwind.config.mjs
└── tsconfig.json
```

---

## 添加新条目

### 方法 1：脚手架（推荐）

```bash
npm run new:event -- --id=2024-some-event
npm run new:person -- --id=zhang-san
npm run new:organization -- --id=acme-corp
```

会在 `src/content/` 对应目录生成带完整 frontmatter 的占位文件。

### 方法 2：手动

复制 `src/content/events/_placeholder-event.md`，重命名后修改字段。

### 字段说明

详见 `src/content.config.ts` 的 Zod schema 注释。关键字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| `status` | ✅ | `draft` / `submitted` / `reviewing` / `published` / `archived` / `withdrawn` |
| `type` | ✅ | `criminal` / `legal` / `corporate` / `controversy` / `public-safety` / `moral` / `human-rights` / `media` |
| `dateStart` | ✅ | 事件开始日期 |
| `summary` | ✅ | 一句话摘要（10-500 字符） |
| `sources` | ✅（发布时 ≥2） | 信源列表 |
| `timeline` | 推荐 | 时间线节点数组 |
| `riskLevel` | ✅ | `low` / `medium` / `high`（决定前端风险徽章颜色） |
| `legalReview` | ✅ | 是否经过法律审查 |

---

## 投稿流程

详见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。

简版：

1. 在[投稿页](https://schemer.online/submit)填写姓名和事件
2. 维护者在 `/admin` 后台查看并人工审核
3. 审核通过后编辑档案并发布

---

## 部署

Cloudflare Pages 部署及 D1 后台配置见 [docs/DEPLOY.md](./docs/DEPLOY.md) 和 [docs/ANALYTICS.md](./docs/ANALYTICS.md)。

---

## 法律

本站所有内容采用 **CC BY-NC-SA 4.0** 许可。

- 允许非商业转载，需注明来源
- 衍生内容须以相同许可分享

详细法律条款见 [/disclaimer](https://schemer.online/disclaimer)。

---

## 维护者

当前为单人维护项目。所有投稿均由人工审核。

---

## 致谢

本站风格受以下启发：

- 档案馆 / 报纸视觉传统（NYT、BBC Archive）
- Wikipedia 的引用规范
- Internet Archive 的内容保存理念
- 维基解密以来各类文档档案站的设计
