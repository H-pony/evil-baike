# 投稿系统部署说明

> 这份文档说明如何启用、调整和维护恶人百科的投稿系统。
> 当前默认渠道：**GitHub Issue + 每日 CI 自动同步**（无需第三方服务）。

---

## 一、当前架构

```
用户访问 /submit 页  ──> GitHub Issues 表单（自动加 label）
                              ↓
                          GitHub Issue #N（带 submission label）
                              ↓
                  每日 09:00 UTC GitHub Actions 跑 sync-submissions.mjs
                              ↓
                       src/content/_drafts/submission-N.md
                              ↓
                       主编本地 review、补字段
                              ↓
                  修改 status: published，mv 到 src/content/events/
                              ↓
                          下次 deploy 工作流发布
```

**关键设计点**：
- `_drafts/` 已纳入 git 版本控制，便于审计与回溯
- deploy.yml 加了 `paths-ignore: src/content/_drafts/**`，CI 推送草稿不会触发 Cloudflare 部署
- deploy.yml 加了 `paths-ignore: .github/workflows/sync-submissions.yml`，自身修改不触发部署（避免无限循环）
- 草稿文件不进 dist/（`src/content.config.ts` 未注册 `_drafts` collection，Astro 不处理）

---

## 二、首次启用（一次性）

### 1. 复制环境变量示例

```bash
cp .env.example .env
```

`.env` 已被 `.gitignore` 排除，不会入库。生产环境在 Cloudflare Pages Dashboard 里配：

`Pages → evil-baike → Settings → Environment variables → Production`

```
PUBLIC_SUBMIT_GITHUB=https://github.com/H-pony/evil-baike/issues/new/choose
```

`PUBLIC_SUBMIT_GITHUB` 控制 src/pages/submit.astro 和 src/components/CorrectionBar.astro 是否显示 GitHub Issue 入口。**未配置则按钮不显示**（避免"假装可用"）。

### 2. 启用 GitHub Issue 模板

`.github/ISSUE_TEMPLATE/` 下的三个 yml 文件已就位：

- `submission.yml` — 新事件投稿（自动加 `submission` label）
- `correction.yml` — 现有条目更正（自动加 `correction` label）
- `takedown.yml` — 下架 / 申诉（自动加 `takedown` label）
- `config.yml` — Issue 选择器（关闭空白 Issue，引导用户走表单）

push 到 main 后立即生效，访问
`https://github.com/H-pony/evil-baike/issues/new/choose`
即可看到三套表单。

### 3. 启用每日 CI 同步

`.github/workflows/sync-submissions.yml` 已就位。无需额外配置：
- `GITHUB_TOKEN`（Actions 内置 secret）即有读 Issue 与写 main 分支权限
- cron `0 9 * * *`（每天 UTC 09:00 / 北京 17:00）自动跑
- 也可手动触发：`GitHub → Actions → Sync submissions → Run workflow`

**首次启用后建议手动跑一次**：在 Actions 页点 "Run workflow"，确认能成功拉 Issue 并写入草稿。

---

## 三、主编工作流

### 1. 收到新投稿

- 主编邮箱 / GitHub 通知（订阅 `submission` label 即可）
- CI 每天会自动拉一份 `_drafts/submission-N.md`

### 2. 本地审核

```bash
git pull                          # 拉最新草稿
ls src/content/_drafts/           # 查看待审核列表
```

打开对应文件：
- 填 `summary`（10–500 字）
- 解析 `timeline` / `sources` / `tags` / `people` / `organizations`
- 根据 issue body 内容修改 `type`（默认 `controversy`）
- 设置 `riskLevel` / `legalReview`
- 标记 `notes`（如"信源已核实 / 待核实"）

### 3. 发布

```bash
# 1. 改 status
sed -i '' 's/^status: submitted$/status: published/' \
  src/content/_drafts/submission-N.md

# 2. 移到 events 目录
git mv src/content/_drafts/submission-N.md src/content/events/

# 3. 关闭对应 GitHub Issue（带 `published` 评论）
gh issue close N --comment "已发布到 [URL]"

# 4. 提交
git commit -m "publish: submission-N #N — 事件标题"
git push    # 触发 deploy 工作流
```

> 💡 主编也可在 PR 里完成上述步骤，便于其他人 review。

### 4. 拒绝 / 归档

- 关闭 Issue（带 `archived` 或 `withdrawn` 评论 + 原因）
- 删除 `_drafts/submission-N.md`

---

## 四、调试

### 本地手动跑 sync 脚本

```bash
export GITHUB_TOKEN=ghp_你的token
node scripts/sync-submissions.mjs --source=github --dry-run   # 只统计，不写
node scripts/sync-submissions.mjs --source=github             # 实际写入 _drafts
node scripts/sync-submissions.mjs --source=github --label=correction --state=all
```

### 常见问题

**Q: 投稿按钮在 `/submit` 页不显示？**
A: 检查 `.env` 或 Cloudflare Pages 环境变量是否配置 `PUBLIC_SUBMIT_GITHUB`。重新部署后生效。

**Q: CI 跑了但 `_drafts/` 没新文件？**
A: 默认只拉 `state=open` 且 `label=submission` 的 Issue。如果 Issue 用了其他 label，不会被拉。手动跑可加 `--label=...` 参数。

**Q: 投稿内容会泄露吗？**
A: GitHub Issue 及评论都是公开的；`_drafts/` 也会进入公开 Git 仓库，但**不会被部署到网站**（Astro 不读）。请勿在 Issue、评论或投稿草稿中提交证件、住址、电话等敏感资料。当前没有启用私密投稿渠道；如需核验身份，应先联系维护者安排安全渠道。

**Q: 怎么改成更频繁的同步？**
A: 编辑 `.github/workflows/sync-submissions.yml` 的 cron。常见值：
  - `0 */6 * * *` — 每 6 小时
  - `*/30 * * * *` — 每 30 分钟（注意 GitHub Actions 配额）

  ⚠️ cron 改后建议同步加 `paths-ignore` 到 deploy.yml 避免频繁触发部署（当前已加）。

---

## 五、扩展（按需启用）

### 启用 Tally 表单

1. 去 [tally.so](https://tally.so) 创建表单（字段与投稿模板一致）
2. 在 `.env` / Cloudflare Pages 加：
   ```
   PUBLIC_SUBMIT_TALLY=https://tally.so/forms/你的表单ID
   ```
3. 投稿页自动显示该入口
4. ⚠️ Tally 不会自动落 `_drafts/`。需要部署 Cloudflare Worker 接收 webhook → 写 KV → CI 从 KV 拉取。可后续扩展 `scripts/sync-submissions.mjs` 的 `--source=tally` 分支。

### 启用邮件投稿

1. 配置 Cloudflare Email Routing（域名 → 接收邮件 → 转发到 Worker）
2. Worker 解析邮件 → 写入 R2 / KV
3. 在 `.env` / Cloudflare Pages 加：
   ```
   PUBLIC_SUBMIT_EMAIL=submit@your-domain.com
   ```
4. 投稿页自动显示 mailto 入口
5. sync-submissions.mjs 加 `--source=email` 分支读取邮件

### 自定义更多 label / 状态

sync-submissions.mjs 加 `--label=...` 即支持任意 label。但**前端按钮仍按 `PUBLIC_SUBMIT_*` 三个 env 显示**——若要新增渠道，需在
- src/pages/submit.astro
- src/components/CorrectionBar.astro
- docs/CONTRIBUTING.md
- docs/SUBMISSIONS_SETUP.md（本文件）
- README.md

同步加配置说明。

---

## 六、安全

- **GITHUB_TOKEN**：CI 用内置 token，无 secret 泄漏风险
- **个人 token**：如需本地跑 sync 脚本，创建 [fine-grained PAT](https://github.com/settings/tokens?type=beta) 只需 `Issues: Read` 权限
- **投稿内容**：默认公开（与"公开讨论便于社区补充信源"原则一致）
- **敏感投稿**：当前没有启用私密渠道，请勿通过公开 Issue 提交敏感资料

---

## 七、相关文件清单

| 文件 | 作用 |
|------|------|
| `.env.example` | 环境变量模板 |
| `.github/ISSUE_TEMPLATE/config.yml` | Issue 选择器 |
| `.github/ISSUE_TEMPLATE/submission.yml` | 新事件投稿表单 |
| `.github/ISSUE_TEMPLATE/correction.yml` | 现有条目更正表单 |
| `.github/ISSUE_TEMPLATE/takedown.yml` | 下架 / 申诉表单 |
| `.github/workflows/sync-submissions.yml` | 每日 CI 同步 |
| `.github/workflows/deploy.yml` | Cloudflare Pages 部署（已 paths-ignore 排除 _drafts） |
| `src/pages/submit.astro` | 投稿页（按 env 显隐按钮） |
| `src/components/CorrectionBar.astro` | 详情页更正入口（按 env 显隐按钮） |
| `scripts/sync-submissions.mjs` | 投稿聚合脚本 |
| `src/content/_drafts/` | 草稿工作区（CI 写入，主编 review 后移到 events） |
| `docs/CONTRIBUTING.md` | 投稿指南（用户面向） |
| `docs/SUBMISSIONS_SETUP.md` | 部署说明（维护者面向） |

---

最后更新：2026 年 9 月
