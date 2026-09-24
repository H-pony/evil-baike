# 浏览量与投稿后台

后台地址：`https://schemer.online/admin`

浏览量按香港时间、每天、每个页面累加。后台展示累计浏览量、今日、近 7 天、近 30 天、每日趋势和热门页面。重复打开页面会重复计数，因此这里显示的是页面浏览量（PV），不是独立访客数。数据从功能部署后开始累计，不补算上线前访问。

系统不会记录访客 IP、Cookie 或浏览器信息。投稿则会保存投稿者填写的姓名和事件，以及服务器生成的提交时间；投稿记录仅供密码保护后台查看，不会自动发布或进入公开 Git 仓库。

## 配置步骤

投稿和浏览量共用 Cloudflare D1。首次配置及命令见[投稿后台配置说明](SUBMISSIONS_SETUP.md)：创建 `evil-baike-analytics` 数据库、运行 `migrations/0001_page_view_daily.sql`、绑定名为 `ANALYTICS_DB` 的 D1，并设置 `ADMIN_PASSWORD` 与 `SESSION_SECRET` 两个 Secret。

部署后访问 `/admin` 登录。后台显示浏览量汇总、30 天趋势、热门页面和最近 50 条投稿。

## 工作方式

- Astro 页面仍然静态生成。
- 只有 `/api/*` 请求进入 Cloudflare Pages Functions；公开页面资源继续由 Pages 静态托管。
- D1 按日、按页面累加浏览量，每条访问不会新增一行访客记录。
- 投稿只写入姓名、事件和服务端提交时间；记录只供后台查看，不会自动发布。
