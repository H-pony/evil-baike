# 投稿与编辑指南

> 感谢你愿意为恶人百科贡献内容。
> 本指南说明如何提交新条目、修订现有条目、提交更正，以及维护者的审核流程。

---

## 一、投稿前必读

### 三条底线（不可妥协）

1. **必须附信源。** 每条事实须可溯源至官方文件、主流媒体报道或公开裁判文书。无信源不入档。
2. **仅汇总不评价。** 不要写"恶人""罪犯""坏人"等定性词，正文只用事实陈述。
3. **尊重法律。** 涉及未审结案件时，避免对嫌疑人作定性；使用"涉嫌""据报道"等措辞。
4. **不收录未审结未成年人案件**（隐私保护优先）。

### 什么会被拒收

- ❌ 无信源或仅自媒体爆料
- ❌ 含主观评价、煽动性语言
- ❌ 涉及未成年人案件（隐私保护优先）
- ❌ 仅为攻击个人而无公共讨论价值
- ❌ 与现有条目重复（高期事件）

---

## 二、投稿入口

### 方式 1：GitHub Issue（推荐 · 当前已启用）

打开 [Issues → New Issue](https://github.com/H-pony/evil-baike/issues/new/choose)，选择 **"新事件投稿"** 模板，填写即可。

**自动同步**：每天 9:00 UTC（北京时间 17:00）CI 自动拉所有带 `submission` label 的 Issue 写到 `src/content/_drafts/`，主编 review 后移到 `src/content/events/` 发布。

**优点**：
- 公开讨论，便于社区补充信源
- 主编在 Issue 内回复，过程透明
- 关闭 Issue 后生成归档记录

**缺点**：需 GitHub 账号。

### 方式 2：Tally 表单（可选 · 当前未启用）

打开 [投稿表单](https://tally.so/forms/evil-baike-submit)，按字段填写。

**优点**：无需登录。

**缺点**：表单内容不进 Git 仓，追踪性较弱；需要单独部署 webhook 接收端才能自动落草稿。

> 启用方式：在 `.env` 中填入 `PUBLIC_SUBMIT_TALLY=https://tally.so/forms/你的表单ID`，src/pages/submit.astro 会自动显示该入口。

### 方式 3：邮件（可选 · 当前未启用）

发送至 **submit@your-domain.com**（维护者在 `.env` 中配置 `PUBLIC_SUBMIT_EMAIL` 后启用）。

**主题格式**：`[投稿] 事件标题（一句话）`

**优点**：适合匿名投稿或敏感内容。

**缺点**：主编单点响应，不公开讨论。

---

## 三、投稿模板

无论用哪种入口，请按以下结构提交：

> 💡 GitHub Issue 模板已强制字段（[新事件投稿](https://github.com/H-pony/evil-baike/issues/new/choose) 表单会自动套用本结构 + 校验必填项）；其他入口请按下方模板复制粘贴。

```markdown
## 事件标题
[一句话描述]

## 事件类型
[刑事 / 法律 / 企业 / 公共争议 / 公共安全 / 道德 / 人权 / 媒体]

## 时间区间
[YYYY-MM-DD 起，YYYY-MM-DD 止 / 至今]

## 主体（涉及人物/机构）
- 人物：[姓名], [角色]
- 机构：[机构名], [角色]

## 摘要（一句话）
[一句话总结]

## 时间线（关键节点）
- YYYY-MM-DD：事件描述 [信源 URL]
- YYYY-MM-DD：事件描述 [信源 URL]
...

## 信源（必填）
1. [标题](URL) - 媒体名 - 发布日期
2. [标题](URL) - 媒体名 - 发布日期
...

## 投稿人
[署名 / 留空]

## 备注
[其他说明]
```

---

## 四、信源等级

| 等级 | 类型 | 备注 |
|------|------|------|
| **一级（首选）** | 判决书、警方通报、政府公告、上市公司公告 | 单一信源即可入档 |
| **二级（合格）** | 央视、新华社、人民日报、财新、新京报、第一财经、澎湃等 | 至少 2 条 |
| **三级（需标注）** | 自媒体爆料、行业号、海外媒体 | 必须明确标注"待交叉核实" |

三级信源仅作辅助，不可作为唯一依据。

---

## 五、审核流程

```
投稿 → submitted → reviewing → published
                      ↓
                   archived（事实不符）
                      ↓
                  withdrawn（合规要求）
```

- **响应时间**：主编 14 个自然日内响应
- **沟通方式**：在 GitHub Issue 内回复 / 邮件回复
- **决策记录**：所有决策附在条目 `notes` 字段，可在 Git 历史追溯

---

## 六、修订与更正

### 我是当事人 / 代理人

如果你认为某条目对你造成不当影响，可提交申诉：

1. 提交 Issue，使用 "Takedown Request" 模板
2. 在公开 Issue 中说明不涉及隐私的申诉理由；不要上传身份证明。若需核验身份，等待维护者提供安全的沟通方式。
3. 常见理由：事实错误、身份混淆、未成年人保护、隐私侵权

**响应时间**：14 个自然日

### 我发现事实错误

提交 Issue，使用 "Correction Request" 模板：

```markdown
## 条目 ID
[例如 2024-some-event]

## 错误位置
[段落 / 时间线节点 / 信源]

## 错误内容
[描述错误]

## 正确信息
[你认为正确的内容]

## 信源
[附链接]
```

**响应时间**：14 个自然日

---

## 七、本地编辑流程（高级）

如果你想直接修改条目（需要仓库写权限）：

```bash
# 1. 克隆仓库
git clone https://github.com/H-pony/evil-baike.git
cd evil-baike

# 2. 创建分支
git checkout -b fix/2024-some-event

# 3. 修改文件
# src/content/events/2024-some-event.md

# 4. 本地预览
npm run dev
# → http://localhost:4321/events/2024-some-event

# 5. 验证
npm run validate

# 6. 提交 PR
git add .
git commit -m "fix: 修正 2024-some-event 中 X 时间节点错误"
git push origin fix/2024-some-event
# → 在 GitHub 上开 PR
```

---

## 八、贡献者公约

- 所有贡献以 PR / Issue 形式记录
- 贡献者署名可在条目 `authors` / `reviewers` 字段列出
- 重大贡献者将列入 README 致谢名单

---

## 九、联系

- 投稿：见上方三种入口
- Bug 报告：[GitHub Issue](https://github.com/H-pony/evil-baike/issues/new/choose)（选择 "现有条目更正" 模板，反馈类型选 "其他"）
- 安全问题：security@your-domain.com（PGP key 见仓库）

---

最后更新：2026 年 9 月
