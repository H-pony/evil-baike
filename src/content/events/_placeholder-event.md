---
# ============================================================
# 占位事件条目（schema 示例）
# 文件名以下划线开头表示「非生产内容」
# 状态：draft — 不会出现在首页/列表，但可通过 ?astro preview=... 访问
# 删除或重命名后即可清空档案馆
# ============================================================

title: '[占位] 事件条目示例 — 请勿保留'
aliases: []
type: controversy
status: draft
dateStart: 2024-01-01

summary: |
  这是一个占位事件条目，用于演示事件条目的完整 schema 结构。
  请勿在正式发布时保留此文件。删除本文件后，将状态改为 published 即可上线真实条目。

tags:
  - 占位
  - 示例
  - 请勿保留

people:
  - placeholder-person

organizations:
  - placeholder-organization

timeline:
  - date: 2024-01-01
    title: 事件起点
    description: 这是时间线第一个节点的示例。
    sources: []
    tags: []
  - date: 2024-02-15
    title: 关键发展
    description: 这是时间线第二个节点的示例。注意引用信源。
    sources:
      - https://example.com/news/article-1
    tags: []

sources:
  - url: https://example.com/news/main-report
    title: '主流媒体报道标题'
    publisher: 某主流媒体
    publishedAt: 2024-02-15
    accessedAt: 2024-09-22
    note: 这是必填项之一。至少 2 条一级或二级信源。

authors:
  - system
reviewers: []
related: []
notes: |
  这是备注字段。可用于内部审计，不在公开页面显示（除非未来加可切换显示开关）。

createdAt: 2024-09-22
updatedAt: 2024-09-22
riskLevel: low
legalReview: false
---

## 正文示例

这是事件条目的正文，采用 Markdown 撰写。

### 子标题

正文部分允许使用 Markdown 语法：

- 列表
- **粗体**
- *斜体*
- [链接](https://example.com)

引用块示例：

> 这是一段引用。引用块必须附信源，建议附在引用下方。

### 时间线补充

正文下方会自动渲染 `timeline` 字段，无须手动重复列出。