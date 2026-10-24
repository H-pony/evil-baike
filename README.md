# 恶人百科 · 公共事件的永久档案馆

> 网络没有记忆。普通人的精力是有限的。
> 这里，是那些事件的永久档案。

一个民间维护的公共事件档案馆。**不作道德定性，仅如实汇总事件经过与各方报道**，让事件的完整时间线、信源链条在多年后仍可被查阅。

---

## 这是什么

- **事件档案馆**：每条事件按时间线 + 信源记录。
- **人物 / 机构档案**：交叉引用所有相关事件。
- **开放投稿**：投稿表单收集称呼和事件内容，私密回执用于查询人工处理结果。
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

完整部署指南见 **[docs/DEPLOY.md](./docs/DEPLOY.md)**。含投稿功能的版本需先按 [后台配置](docs/SUBMISSIONS_SETUP.md) 应用 D1 迁移，再部署。

简版:
1. 推代码到 GitHub
2. 在 Cloudflare 控制台创建 Pages 项目,选 `Astro` preset
3. Build command = `npm run build`,output = `dist`
4. 配置 Cloudflare 原生 Git 部署，或设置 GitHub 仓库变量 `CF_AUTO_DEPLOY=true` 并配置 Actions 凭证后，push 到 main 才会自动部署。当前 Actions 默认仅构建检查，不发布。

零成本、无限流量、全球 CDN。

---

## 快速开始

```bash
# 1. 确认 Node 22.13+（推荐 24 LTS）
node -v

# 2. 安装依赖
npm install

# 3. 启动前端开发服务器（不包含后台 API）
npm run dev
# → http://localhost:4321

# 4. 构建生产版本
npm run build

# 5. 完整校验：类型、回归、构建和站内链接
npm run check:all

# 6. 完整本地预览：包括投稿、审核后台与本地数据库
npm run dev:full
# → http://127.0.0.1:8788
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
│   │   ├── submit.astro           # 投稿、更正与私密回执查询
│   │   └── admin/index.astro      # 浏览量和投稿后台
│   │   ├── about.astro
│   │   ├── disclaimer.astro
│   │   ├── methodology.astro
│   │   └── 404.astro
│   └── styles/global.css          # Journal UI / 全站视觉样式
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
| `riskLevel` | ✅ | `low` / `medium` / `high`（仅内部编辑审核，不在公开页显示） |
| `legalReview` | ✅ | 是否经过法律审查 |

---

## 投稿流程

详见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。

简版：

1. 在[投稿页](https://schemer.online/submit)填写称呼和事件，保存私密回执
2. 维护者在 `/admin` 按状态、分页查看投稿，记录核查进度和处理说明
3. 审核通过后人工编辑档案并部署，再关联真实公开页面
4. 投稿者凭回执查询结果；更正、暂不收录也有处理说明

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

## 界面与交互

全站界面参考 [JUNNI](https://junni.co.jp/)，采用深色分块网格、暖白巨字、荧光黄绿强调和全屏菜单。首页品牌与荧光宣言构成真实 CSS 3D 正反面切片舞台：桌面36块、手机18块，舞台统一为100svh。舞台顶部的一次向下滚轮、竖向触摸、ArrowDown / PageDown或空格触发整组约1秒的对角180°翻转；消费本次手势惯性后，下一次下滚自然浏览后续页面，返回顶部上滚可翻回品牌面。精细指针悬停可触发单片360°翻转、邻近倾斜和装饰文字圆环跟随；停止移动后倾斜归零，单片翻完停止动画帧。顶部导航区的滚轮也能触发；触摸从首个竖向移动判定，并保留控件原生点击。

翻转舞台范围内，右上导航全过程透明，无全宽深色遮罩；荧光面按钮切为黑色。背面按各瓦片翻转阶段向边缘延展填缝，悬停时也保留这一处理，避免固定粗黑网格切断小字；静止时另外显示唯一原始文案层。

菜单内可暂停动画；系统减少动态效果优先于用户保存设置，并显示不可点击的系统状态。系统减少动态效果、短屏或无JavaScript时，首屏与宣言恢复为上下正文。舞台离屏或页面隐藏后停止持续动画帧，代码包含锚点焦点、浏览器前进后退恢复、尺寸变化、字体加载及打印前后的处理。站内搜索支持 `⌘K / Ctrl+K`。以上是当前实现说明，验收结论以对应检查记录为准。视觉规范见 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)，最新原站与本地实操证据见 [docs/motion-review-2026-10-24](docs/motion-review-2026-10-24)。

首页、事件列表、话题页与事件收藏使用同一套紧凑事件卡：1200px及以上4列、900–1199px为3列、600–899px为2列。手机599px及以下改为单列横排卡，左侧84×104px配图、右侧正文；359px及以下配图缩为68×88px。桌面图片采用2.4:1浅幅裁切，标题完整换行，摘要最多两行，保留分类、状态、日期、时间节点与信源数。

事件封面为主题示意配图，不作为事实或信源证据。素材及提示词记录见 [docs/ui-assets.md](docs/ui-assets.md)，视觉与交互检查见 [design-qa.md](design-qa.md)。

## 致谢

本站风格受以下启发：

- 档案馆 / 报纸视觉传统（NYT、BBC Archive）
- Wikipedia 的引用规范
- Internet Archive 的内容保存理念
- 维基解密以来各类文档档案站的设计

## 本地完整预览与审核

`npm run dev:full` 会构建页面、应用尚未执行的本地 D1 迁移，并启动 Pages Functions。数据库、运行配置和随机后台凭证位于 `.wrangler/local-preview/`，与生产环境隔离；脚本不会读取项目根目录的生产 `.env`。修改后重新运行即可。可用 `PORT=8790 npm run dev:full` 改端口。

本地后台密码见 `.wrangler/local-preview/.dev.vars` 中 `ADMIN_PASSWORD`，仅限本地测试。首次生成后会保留，文件不进入 Git。不要把本地凭证用于部署。

界面规范见 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)；本轮产品逻辑与闭环审核见 [docs/audit-2026-10-23/report.md](docs/audit-2026-10-23/report.md)。
