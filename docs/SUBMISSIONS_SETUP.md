# 投稿后台配置

访客通过 `/submit` 填写姓名和事件；Pages Function 保存到 D1。维护者在密码保护的 `/admin` 页面查看浏览量和最近 50 条投稿。

## 首次配置

### 1. 创建 D1 数据库

在项目目录运行：

```bash
npx wrangler d1 create evil-baike-analytics
```

### 2. 创建统计和投稿表

```bash
npx wrangler d1 execute evil-baike-analytics --remote --file migrations/0001_page_view_daily.sql
```

该 SQL 使用 `IF NOT EXISTS`，可在部署更新后重复运行。

### 3. 绑定 Pages Function

在 Cloudflare Dashboard 打开 **Workers & Pages → evil-baike → Settings → Bindings → Add → D1 database**：

- Variable name：`ANALYTICS_DB`
- D1 database：`evil-baike-analytics`

保存后重新部署站点。

### 4. 设置后台登录 Secret

在 Pages 项目的 **Settings → Variables and Secrets** 中为 Production 环境添加：

| 名称 | 用途 |
|---|---|
| `ADMIN_PASSWORD` | `/admin` 登录密码 |
| `SESSION_SECRET` | 签名后台登录会话，至少 32 个字符 |

生成随机会话密钥：

```bash
openssl rand -base64 48
```

不要把这两个值写入仓库。后台会话 8 小时后过期；更换 `SESSION_SECRET` 会让已有会话失效。

### 5. 部署

推送到 `main` 触发部署。GitHub Actions 会把 `dist/` 和根目录 `functions/` 一起交给 Cloudflare Pages。若使用 `scripts/deploy-cloudflare.sh`，从项目根目录运行即可。

部署后检查 `/submit` 投稿，并在 `/admin` 登录后查看记录。没有 D1 绑定时表单会提示投稿服务未配置。

## 收集内容和隐私

- 投稿表单只包含姓名和事件两个可见字段。
- D1 另记录服务器生成的提交时间，供后台排序。
- 投稿内容留在 D1 后台，不会自动进入公开网页或 Git 仓库。
- 浏览量统计只保存日期、页面路径和浏览次数，不记录访客 IP、Cookie 或浏览器信息。
- 旧的 GitHub Issue、Tally、邮件投稿入口及每日 Issue 同步流程已停用；过往 Issue 不会自动导入新后台。
