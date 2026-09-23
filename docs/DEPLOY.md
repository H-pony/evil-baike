# 部署指南 · Cloudflare Pages

> 完全免费、零成本、无限流量、全球 CDN。

## 为什么选 Cloudflare Pages

| 维度 | Cloudflare Pages |
|---|---|
| 流量上限 | **无限** (其他平台普遍 100GB/月) |
| 边缘节点 | 200+ 城市 (含港/台/日,国内访问好) |
| 免费 HTTPS | ✅ 自动 |
| 自定义域名 | ✅ |
| 自动部署 | ✅ Git 推送即触发 |
| 月构建次数 | 500 次 |
| 团队席位 | 无限 |
| 信用卡 | **不需要** |

---

## 一、准备(首次部署,约 5 分钟)

### 1.1 注册账号

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) 注册 Cloudflare 账号
2. 用 GitHub 登录即可,无需绑卡

### 1.2 推送代码到 GitHub

如果项目还没推上去:

```bash
cd /Users/kongwo/Documents/项目/恶人百科
git init
git add -A
git commit -m "initial: evil-baike static site"
git branch -M main
git remote add origin https://github.com/H-pony/evil-baike.git
git push -u origin main
```

> 仓库可以设为 **private**(GitHub 私有仓库 Cloudflare Pages 也能用,且 GitHub 本身对私有仓库免费)。

### 1.3 在 Cloudflare 创建 Pages 项目

1. 进入 [dash.cloudflare.com](https://dash.cloudflare.com) → 左侧菜单 **Workers & Pages**
2. 点击 **Create application** → **Pages** 标签 → **Connect to Git**
3. 选择 GitHub,授权 Cloudflare 访问你的仓库
4. 选择 `evil-baike` 仓库 → **Begin setup**

---

## 二、配置构建设置

在 **Set up builds and deployments** 页面填:

| 字段 | 值 |
|---|---|
| **Project name** | `evil-baike` (决定你的 *.pages.dev 子域名) |
| **Production branch** | `main` |
| **Framework preset** | `Astro` ← Cloudflare 会自动选 |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | (留空) |
| **Environment variables** | (暂不需要) |

点击 **Save and Deploy**。

首次构建需要 1-3 分钟。完成后你会得到一个 URL:
`https://evil-baike.pages.dev`

---

## 三、绑定自定义域名(可选)

### 3.1 在 Cloudflare 加域名

1. Workers & Pages → 选 `evil-baike` 项目 → **Custom domains** 标签
2. 点击 **Set up a custom domain**
3. 输入 `evil-baike.com`(或你自己的域名)→ **Continue**

### 3.2 两种情况

**情况 A: 域名已经在 Cloudflare 管理(推荐)**
- Cloudflare 自动配置 DNS,5 分钟内生效
- 自动 HTTPS

**情况 B: 域名在第三方(阿里云/腾讯云/Gandi 等)**
- Cloudflare 会给出两条 CNAME 记录
- 去你的域名注册商添加这两条 CNAME
- DNS 生效后(几分钟到 24 小时),HTTPS 自动签发

---

## 四、日常开发流程

部署完成后,日常开发是这样:

```bash
# 1. 本地编辑内容
git add .
git commit -m "feat: 新增 XX 事件档案"

# 2. 推送到 main
git push

# 3. Cloudflare 自动检测 push → 触发 build → 1-2 分钟上线
```

PR 流程:
```bash
git checkout -b feat/new-event
git add . && git commit -m "feat: ..."
git push origin feat/new-event
# 在 GitHub 开 PR → GitHub Actions 自动部署到 preview URL
# 验完 OK → merge 到 main → 正式上线
```

---

## 五、本地用 GitHub Actions 部署(可选)

项目根目录已经放了 `.github/workflows/deploy.yml`,如果你**不想用 Cloudflare 控制台**或希望完全 CI/CD,可以走 GitHub Actions:

### 5.1 创建 Cloudflare API Token

1. 进入 [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token** → 选 **Edit Cloudflare Pages** 模板(或自定义)
3. 权限至少包含:
   - Account > Cloudflare Pages > Edit
4. 选你要的账户 → **Continue to summary** → **Create Token**
5. **复制 token**(只显示一次)

### 5.2 获取 Account ID

- Cloudflare 控制台右侧栏 → 你的账号下方就是 **Account ID**

### 5.3 在 GitHub 仓库配置 Secrets

进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 刚才复制的 token |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Account ID |

完成后，在同一页面的 **Variables** 中新增 `CF_AUTO_DEPLOY=true`，之后 push 到 `main` 才会通过 GitHub Actions 自动部署。未配置时 Actions 只验证和构建，部署由 `scripts/deploy-cloudflare.sh` 手动执行。

---

## 六、配置文件说明

项目里已经放好的 Cloudflare Pages 配置:

```
.
├── .github/workflows/deploy.yml   # GitHub Actions(可选方案)
├── public/
│   ├── _headers                   # 自定义 HTTP 头 + 缓存策略
│   └── _redirects                 # URL 重定向
└── astro.config.mjs               # Astro 配置,纯静态无需 adapter
```

### 6.1 `_headers` 文件

设置 HTTP 响应头,**Astro 静态资源打 1 年强缓存**(文件名带 hash,改了就换名字,缓存绝对安全):

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

同时加安全头:`X-Content-Type-Options`、`X-Frame-Options` 等。

### 6.2 `_redirects` 文件

设置 URL 重定向。`trailingSlash: 'never'` 已经生效,所以不需要去掉斜杠的 redirect。

### 6.3 `astro.config.mjs`

**保持纯静态**(`output: 'static'`)即可,无需开启 cloudflare adapter。
Cloudflare Pages 原生支持 Astro 静态站点,build 完直接上传 `dist/`。

---

## 七、域名在国内加速(可选)

如果你希望国内用户访问更快:

1. **Cloudflare 1.1.1.1** — 国内已有边缘节点,默认就不错
2. **Cloudflare China Network** — 需要 ICP 备案 + 商务计划(免费版不能走)
3. **Cloudflare Workers 反代** — 免费,但有调用次数限制
4. **CDN 中转** — Cloudflare 前套一层国内 CDN(又拍、七牛、白山等,部分有免费额度)

> 实际上 Cloudflare 默认边缘节点对国内用户延迟通常 50-200ms,绝大多数情况够用。

---

## 八、回滚与维护

### 8.1 回滚到上一版本

Cloudflare Pages 控制台:
1. Workers & Pages → `evil-baike` 项目
2. **Deployments** 标签 → 找到上一次成功的部署
3. 点击 **...** → **Rollback to this deploy**

### 8.2 查看构建日志

Workers & Pages → 项目 → 选具体一次部署 → **View build log**

### 8.3 监控

- **Analytics** 标签: 实时查看流量、请求数、错误率
- Cloudflare 免费层就够用,不需要额外配置

---

## 九、常见问题

**Q: 部署失败提示 "build failed"?**
A: 看 GitHub Actions 日志或 Cloudflare build log,通常是 `npm ci` 失败(检查 Node 版本≥20)、或者 content schema 校验失败(跑 `npm run validate`)。

**Q: 域名已经解析到 Vercel/Netlify,能切到 Cloudflare 吗?**
A: 可以,改 DNS 即可。建议把 TTL 临时调小(300s),切完再恢复。

**Q: 国内访问被墙?**
A: 偶尔 Cloudflare 部分 IP 段会被干扰,可以在 Cloudflare 控制台 → 域名 → DNS 切换到 CNAME 接入模式,Cloudflare 会给一组友好 IP。

**Q: 国内访问慢?**
A: 加 Cloudflare Spectrum / Argo(付费);免费版通常够用。

**Q: 需要 SSR 吗?**
A: 当前项目纯静态够用。如果未来需要评论/搜索后端,再开 cloudflare adapter 走 SSR。

---

## 总结

部署完成后,你的工作流变成:

```
本地写内容 → git push → 自动 build → Cloudflare 上线
```

零成本、零运维、全球 CDN、抗审查能力比 Vercel/Netlify 强——非常适合「恶人百科」这种需要长期存档的项目。
