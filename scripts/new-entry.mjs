#!/usr/bin/env node
/**
 * 新条目脚手架：快速创建带完整 frontmatter 的新条目
 *
 * 用法：
 *   node scripts/new-entry.mjs event            # 交互式创建事件
 *   node scripts/new-entry.mjs event --id=xxx   # 用指定 ID
 *   node scripts/new-entry.mjs person --id=yyy
 *   node scripts/new-entry.mjs organization --id=zzz
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const type = args._?.[0] ?? process.argv[2];

if (!['event', 'person', 'organization'].includes(type)) {
  console.error('❌ 用法: node scripts/new-entry.mjs <event|person|organization> [--id=xxx]');
  process.exit(1);
}

const targetDir = {
  event: 'src/content/events',
  person: 'src/content/people',
  organization: 'src/content/organizations',
}[type];

// ============================================================
// 模板
// ============================================================

function templateEvent(id) {
  return `---
title: '${id}'
aliases: []
type: controversy
status: draft
dateStart: ${new Date().toISOString().slice(0, 10)}
dateEnd: null

summary: |
  待撰写。

tags: []
people: []
organizations: []

timeline: []
sources:
  - url: https://example.com
    title: ''
    publisher: ''
    publishedAt: ${new Date().toISOString().slice(0, 10)}

authors:
  - ${process.env.USER ?? 'unknown'}
reviewers: []
submittedBy: null
related: []
notes: null

createdAt: ${new Date().toISOString()}
updatedAt: ${new Date().toISOString()}
riskLevel: medium
legalReview: false
---

## 正文

待撰写。
`;
}

function templatePerson(id) {
  return `---
name: '${id}'
aliases: []
status: draft

summary: |
  待撰写。

tags: []
events: []
organizations: []

sources:
  - url: https://example.com
    title: ''

authors:
  - ${process.env.USER ?? 'unknown'}
reviewers: []
notes: null

createdAt: ${new Date().toISOString()}
updatedAt: ${new Date().toISOString()}
riskLevel: medium
legalReview: false
---

## 正文

待撰写。
`;
}

function templateOrg(id) {
  return `---
name: '${id}'
aliases: []
type: company
status: draft

summary: |
  待撰写。

tags: []
events: []
people: []

sources:
  - url: https://example.com
    title: ''

authors:
  - ${process.env.USER ?? 'unknown'}
reviewers: []
notes: null

createdAt: ${new Date().toISOString()}
updatedAt: ${new Date().toISOString()}
riskLevel: medium
legalReview: false
---

## 正文

待撰写。
`;
}

// ============================================================
// 执行
// ============================================================

async function prompt(question, defaultValue = '') {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(question)).trim();
  rl.close();
  return answer || defaultValue;
}

let id = args.id;
if (!id) {
  id = await prompt(`  ID (kebab-case, e.g. 2024-some-event): `);
  if (!id) {
    console.error('❌ ID 不能为空');
    process.exit(1);
  }
}

// 校验 ID 格式
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error('❌ ID 必须是 kebab-case（小写字母、数字、连字符）');
  process.exit(1);
}

const filePath = join(ROOT, targetDir, `${id}.md`);
const tmpl = type === 'event' ? templateEvent(id) : type === 'person' ? templatePerson(id) : templateOrg(id);

await mkdir(dirname(filePath), { recursive: true });
await writeFile(filePath, tmpl, 'utf-8');

console.log(`✅ 创建：${filePath}`);
console.log(`   状态：draft（待撰写）`);
console.log(`   下一步：填写字段 → 修改 status 为 published`);