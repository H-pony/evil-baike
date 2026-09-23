#!/usr/bin/env node
/**
 * 投稿聚合脚本：从多个入口（GitHub Issue / Tally Webhook / 邮件 IMAP）
 * 拉取投稿并转换为 Markdown 草稿，存到 src/content/_drafts/
 *
 * 用法：
 *   GITHUB_TOKEN=... node scripts/sync-submissions.mjs --source=github --since=2024-01-01
 *   TALLY_WEBHOOK_URL=... node scripts/sync-submissions.mjs --source=tally
 *   node scripts/sync-submissions.mjs --source=email --since=2024-01-01
 *
 * 部署：可在 GitHub Action 中每日运行一次
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRAFTS_DIR = join(ROOT, 'src/content/_drafts');

// ============================================================
// 通用：写入草稿
// ============================================================

async function writeDraft(slug, frontmatter, body) {
  await mkdir(DRAFTS_DIR, { recursive: true });
  const filePath = join(DRAFTS_DIR, `${slug}.md`);
  const content = matter.stringify(body, frontmatter);
  await writeFile(filePath, content, 'utf-8');
  console.log(`✅ Drafted: ${filePath}`);
}

// ============================================================
// 入口 1：GitHub Issue
// ============================================================

async function syncFromGitHub(args) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.SUBMISSIONS_REPO ?? 'evil-baike/submissions';
  const since = args.since ?? '2024-01-01';

  if (!token) {
    console.error('❌ GITHUB_TOKEN not set');
    process.exit(1);
  }

  console.log(`📡 Fetching issues from ${repo} since ${since}...`);

  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues?state=open&labels=submission&since=${since}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!res.ok) {
    console.error(`❌ GitHub API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const issues = await res.json();
  console.log(`📋 Found ${issues.length} submission issues`);

  for (const issue of issues) {
    const fm = {
      title: `[投稿#${issue.number}] ${issue.title}`.slice(0, 120),
      type: 'controversy',
      status: 'submitted',
      dateStart: new Date(issue.created_at),
      summary: `来自 GitHub Issue #${issue.number} 的投稿。`,
      tags: ['投稿'],
      people: [],
      organizations: [],
      timeline: [],
      sources: [],
      authors: ['system'],
      reviewers: [],
      submittedBy: issue.user.login,
      related: [],
      notes: `Issue: ${issue.html_url}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      riskLevel: 'medium',
      legalReview: false,
    };

    const slug = `submission-${issue.number}`;
    await writeDraft(slug, fm, issue.body ?? '');
  }
}

// ============================================================
// 入口 2：Tally（需要 webhook 端点）
// ============================================================

async function syncFromTally() {
  // Tally 没有公开 API 拉取，需要 webhook 端点
  // 此函数作为占位，实际实现需要部署一个 webhook 接收端（CF Worker）
  console.log('⚠️  Tally 入口需要 webhook 接收端，建议用 Cloudflare Worker 接收并写入 /api/submit');
}

// ============================================================
// 入口 3：邮件 IMAP
// ============================================================

async function syncFromEmail(args) {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  const since = args.since ?? '2024-01-01';

  if (!host || !user || !pass) {
    console.error('❌ IMAP_HOST / IMAP_USER / IMAP_PASS must be set');
    process.exit(1);
  }

  console.log(`📬 Connecting to IMAP ${host} as ${user}...`);
  console.log('⚠️  IMAP 实现需要依赖 imapflow 包，建议改用 webhook 方式');
}

// ============================================================
// 入口
// ============================================================

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const source = args.source ?? 'github';

console.log('🚀 投稿聚合脚本启动');
console.log(`   Source: ${source}`);
console.log(`   Since: ${args.since ?? '(none)'}`);
console.log();

switch (source) {
  case 'github':
    await syncFromGitHub(args);
    break;
  case 'tally':
    await syncFromTally();
    break;
  case 'email':
    await syncFromEmail(args);
    break;
  default:
    console.error(`❌ Unknown source: ${source}`);
    process.exit(1);
}

console.log('\n✅ 聚合完成');
console.log(`   草稿已写入 ${DRAFTS_DIR}`);
console.log('   下一步：人工审核 → 修改 status 为 published → 移到 src/content/events/');