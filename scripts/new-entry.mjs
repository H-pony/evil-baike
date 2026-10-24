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

summary: |
  此条目正在整理，事实与信源仍待编辑核实。

tags: []
people: []
organizations: []

timeline: []
sources: []

authors:
  - ${process.env.USER ?? 'unknown'}
reviewers: []
related: []

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
  此条目正在整理，事实与信源仍待编辑核实。

tags: []
events: []
organizations: []

sources: []

authors:
  - ${process.env.USER ?? 'unknown'}
reviewers: []

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
  此条目正在整理，事实与信源仍待编辑核实。

tags: []
events: []
people: []

sources: []

authors:
  - ${process.env.USER ?? 'unknown'}
reviewers: []

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
if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]+$/.test(id)) {
  console.error('❌ ID 必须是 kebab-case（小写字母、数字、连字符）');
  process.exit(1);
}

const filePath = join(ROOT, targetDir, `${id}.md`);
const tmpl = type === 'event' ? templateEvent(id) : type === 'person' ? templatePerson(id) : templateOrg(id);

await mkdir(dirname(filePath), { recursive: true });
try {
  await writeFile(filePath, tmpl, { encoding: 'utf-8', flag: 'wx' });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.error('❌ 同名条目已存在，请使用新 ID；原文件未修改。');
  process.exit(1);
}

console.log(`✅ 创建：${filePath}`);
console.log(`   状态：draft（待撰写）`);
console.log(`   下一步：补齐事实与信源 → 人工核实 → npm run validate → 审核通过后发布`);