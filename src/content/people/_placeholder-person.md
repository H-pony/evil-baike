---
# ============================================================
# 占位人物条目（schema 示例）
# ============================================================

name: '[占位] 人物条目示例 — 请勿保留'
aliases:
  - 占位人物
  - placeholder

status: draft

summary: |
  这是占位人物条目，演示人物 schema。正式上线前请删除并替换。

tags:
  - 占位
  - 示例

events:
  - placeholder-event

organizations:
  - placeholder-organization

sources:
  - url: https://example.com/news/person-profile
    title: '该人物的主要公开报道'
    publisher: 某主流媒体
    publishedAt: 2024-01-10

authors:
  - system
reviewers: []

createdAt: 2024-09-22
updatedAt: 2024-09-22
riskLevel: low
legalReview: false
---

## 人物正文示例

人物条目的正文可以是：

- 公开履历（仅限公开可查证的部分）
- 与具体事件的关联
- 媒体对其的评价（标注信源，附时间）

### 关联事件

页面下方会自动列出所有引用此人物的 `events` 条目。