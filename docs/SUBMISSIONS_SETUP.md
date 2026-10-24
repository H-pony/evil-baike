# 投稿与审核后台配置

访客通过 `/submit` 提交称呼和事件。Pages Functions 写入 D1，返回确认；访客凭私密回执查询处理结果。管理员通过 `/admin` 审核、记录处理说明、关联已公开档案并查看浏览量。

## 生产配置

1. 创建数据库：`npx wrangler d1 create evil-baike-analytics`。
2. 首次建库按顺序执行以下 SQL。已有 `0001` 表的库只执行 `0002`，并在维护记录中记录完成日期。`0002` 含 `ALTER TABLE`，必须且只能执行一次；重复执行会失败，不要在自动部署中盲目重复运行。

```bash
npx wrangler d1 execute evil-baike-analytics --remote --file migrations/0001_page_view_daily.sql
npx wrangler d1 execute evil-baike-analytics --remote --file migrations/0002_submission_workflow.sql
```

`0002` 保留原有投稿，增加回执哈希、审核状态、处理说明、关联路径、版本和处理历史。旧投稿状态为“待查看”，没有回执；不会暴露旧投稿，也不会尝试生成可被他人认领的回执。

3. Cloudflare Pages → Settings → Bindings 添加 D1，变量名 `ANALYTICS_DB`，选择该数据库。
4. 在 Pages 的 Variables and Secrets 设置 `ADMIN_PASSWORD` 和至少 32 字符的 `SESSION_SECRET`。可用 `openssl rand -base64 48` 生成会话密钥，不要提交到仓库。会话 8 小时过期，更换密钥可使现有会话失效。
5. 构建并部署 `dist/` 与根目录 `functions/`。访问 `/submit` 和 `/admin` 验证提交、审核、回执查询。

升级时先备份数据库，再迁移、部署。无需重建或清空原有表。

## 隔离本地验证

`npm run dev` 只有静态前端，不能测试投稿 API。推荐直接运行 `npm run dev:full`：脚本构建页面、应用尚未执行的本地迁移，并启动 `http://127.0.0.1:8788`。配置、状态和随机后台凭证在 Git 忽略的 `.wrangler/local-preview/`，本地密码见其中 `.dev.vars` 的 `ADMIN_PASSWORD`。可用 `PORT=8790 npm run dev:full` 更换端口。

以下是手动配置方式。为避免读取生产 `.env` 或 `.dev.vars`，在独立临时目录创建 Wrangler 配置并执行命令；不要使用 `--remote`。

示例配置 `wrangler.json`（路径按本机替换）：

```json
{
  "name": "evil-baike-local-audit",
  "pages_build_output_dir": "/absolute/project/path/dist",
  "compatibility_date": "2025-01-01",
  "d1_databases": [{
    "binding": "ANALYTICS_DB",
    "database_name": "evil-baike-local-audit",
    "database_id": "00000000-0000-0000-0000-000000000001"
  }]
}
```

在独立目录中链接项目 `functions` 目录，然后使用项目内 Wrangler 二进制（`node_modules/.bin/wrangler`）。对同一个隔离持久化目录依次执行：

```bash
wrangler d1 execute evil-baike-local-audit --local --persist-to ./state --file /absolute/project/path/migrations/0001_page_view_daily.sql
wrangler d1 execute evil-baike-local-audit --local --persist-to ./state --file /absolute/project/path/migrations/0002_submission_workflow.sql
wrangler pages dev /absolute/project/path/dist --persist-to ./state --port 8788 --ip 127.0.0.1 --d1 ANALYTICS_DB=00000000-0000-0000-0000-000000000001 --binding ADMIN_PASSWORD=local-test-password --binding SESSION_SECRET=local-test-secret-at-least-32-characters
```

先在项目中运行 `npm run build`。如果重新构建，只需刷新预览；如果删除并新建隔离数据库，则重新应用两项迁移。勿将本地测试密码用于生产。

无需网络的接口回归测试：

```bash
node scripts/test-submissions.mjs
```

测试使用 Node 22.13+ 的内置 SQLite，验证真实 SQL 迁移、保留历史投稿、幂等重试、回执隐私、管理员认证、跨站请求拒绝、分页、筛选、处理历史、版本冲突、无效发布链接拒绝和撤回链接隐藏。它不替代 Pages 运行时与浏览器联调。

## 保存的数据

- 投稿表单只有称呼和事件两个投稿字段；回执由浏览器自动生成。
- D1 保存回执的 SHA-256 哈希，不保存明文回执。
- 查询只返回状态、说明、提交/更新时间及已核实的公开档案路径，不返回称呼或投稿原文。
- 处理历史记录单管理员身份、时间、状态变化、说明和关联路径。
- 投稿不会自动进入公开网站或 Git 仓库。
- 浏览量不保存访客 IP、Cookie 或浏览器信息；后台登录单独使用安全会话 Cookie。
