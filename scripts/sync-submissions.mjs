#!/usr/bin/env node
/**
 * 投稿聚合脚本（CI / 本地通用）
 *
 * 把 GitHub Issue 拉成本地 Markdown 草稿，存到 src/content/_drafts/。
 * 主编审核后将 status 改为 published 并移到 src/content/events/。
 *
 * 用法：
 *   GITHUB_TOKEN=... node scripts/sync-submissions.mjs --source=github
 *   GITHUB_TOKEN=... node scripts/sync-submissions.mjs --source=github --label=submission --since=2024-01-01
 *
 * 环境变量：
 *   GITHUB_TOKEN       必填。需 `repo` 权限（读 Issue 列表 + 评论）。
 *   SUBMISSIONS_REPO   可选。默认 H-pony/evil-baike（主仓）。
 *
 * 参数：
 *   --source=github    目前唯一实现的入口（默认）
 *   --label=submission 默认。也可 correction / takedown 等
 *   --since=YYYY-MM-DD 默认 2024-01-01（按 issue updated_at 过滤）
 *   --state=open       默认。也可 all / closed
 *   --dry-run          只统计，不写入草稿
 *
 * 部署：
 *   .github/workflows/sync-submissions.yml 每日 9:00 UTC 跑一次。
 *   push 到 main（src/content/_drafts/ 已在 content.config.ts 的 collections 之外，
 *   build 时 Astro 不会处理 → dist/ 不会有草稿内容，部署安全）。
 */

import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
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
  console.log(`  ✅ Drafted: src/content/_drafts/${slug}.md`);
}

/**
 * 删除已不再匹配条件（issue 已关闭、label 被移除）的旧草稿，
 * 避免 _drafts/ 长期积累冗余文件。
 */
async function pruneStaleDrafts(keptSlugs) {
  let removed = 0;
  let entries;
  try {
    entries = await readdir(DRAFTS_DIR);
  } catch {
    return 0;
  }
  const kept = new Set(keptSlugs);
  for (const name of entries) {
    if (!name.startsWith('submission-') || !name.endsWith('.md')) continue;
    const slug = name.replace(/\.md$/, '');
    if (!kept.has(slug)) {
      await unlink(join(DRAFTS_DIR, name));
      removed++;
    }
  }
  return removed;
}

// ============================================================
// 入口 1：GitHub Issue
// ============================================================

/**
 * 从 issue body 中尝试解析 event-type dropdown（GitHub Forms 会把
 * dropdown 选项渲染为 "### Event type\n\n- criminal\n" 这样的列表）。
 * 取第一个选项作为 frontmatter.type 兜底，主编 review 时可改。
 */
function parseEventType(body) {
  if (!body) return 'controversy';
  const m = body.match(/###\s*Event type\s*\n+\s*-\s*(\w[\w-]*)/i);
  return m ? m[1] : 'controversy';
}

async function syncFromGitHub(args) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.SUBMISSIONS_REPO ?? 'H-pony/evil-baike';
  const label = args.label ?? 'submission';
  const since = args.since ?? '2024-01-01';
  const state = args.state ?? 'open';
  const dryRun = Boolean(args['dry-run']);

  if (!token) {
    console.error('❌ GITHUB_TOKEN 未设置');
    console.error('   本地：export GITHUB_TOKEN=ghp_...');
    console.error('   CI：  workflow 自动注入 secrets.GITHUB_TOKEN');
    process.exit(1);
  }

  console.log(`📡 拉取 ${repo} 的 Issue`);
  console.log(`   state=${state}  label=${label}  since=${since}  dryRun=${dryRun}`);
  console.log();

  let page = 1;
  let processed = 0;
  let skippedPR = 0;
  let skippedNoBody = 0;
  const keptSlugs = [];

  while (true) {
    const url = new URL(`https://api.github.com/repos/${repo}/issues`);
    url.searchParams.set('state', state);
    url.searchParams.set('labels', label);
    url.searchParams.set('since', since);
    url.searchParams.set('per_page', '50');
    url.searchParams.set('page', String(page));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'evil-baike-sync-submissions',
      },
    });

    if (!res.ok) {
      console.error(`❌ GitHub API 失败 (page ${page}): ${res.status} ${res.statusText}`);
      const body = await res.text();
      console.error(body.slice(0, 500));
      process.exit(1);
    }

    const issues = await res.json();
    if (!Array.isArray(issues) || issues.length === 0) break;

    for (const issue of issues) {
      // 关键：GitHub Issues API 也返回 PR，每个都有 pull_request 字段
      if (issue.pull_request) {
        skippedPR++;
        continue;
      }

      const slug = `submission-${issue.number}`;
      keptSlugs.push(slug);

      if (!issue.body || issue.body.trim().length < 10) {
        skippedNoBody++;
        console.log(`  ⚠️  Issue #${issue.number} 正文为空，跳过`);
        continue;
      }

      if (dryRun) {
        console.log(`  · Issue #${issue.number}: ${issue.title}（dry-run，跳过写入）`);
        processed++;
        continue;
      }

      const fm = {
        title: `[投稿#${issue.number}] ${issue.title.replace(/^\[新事件投稿\]\s*/, '')}`.slice(0, 120),
        type: parseEventType(issue.body),
        status: 'submitted',
        dateStart: new Date(issue.created_at).toISOString().slice(0, 10),
        summary: '待补充（一句话总结，10–500 字）',
        tags: ['投稿', label],
        people: [],
        organizations: [],
        timeline: [],
        sources: [],
        authors: ['system'],
        reviewers: [],
        submittedBy: issue.user?.login ?? 'unknown',
        related: [],
        notes: [
          `Issue: ${issue.html_url}`,
          `Reporter: ${issue.user?.login ?? 'unknown'}`,
          `Created: ${issue.created_at}`,
          `Labels: ${(issue.labels ?? []).map((l) => l.name).join(', ')}`,
        ].join('\n'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        riskLevel: 'medium',
        legalReview: false,
      };

      await writeDraft(slug, fm, issue.body);
      processed++;
    }

    // 最后一页：返回数量 < per_page 即结束
    if (issues.length < 50) break;
    page++;
    if (page > 50) {
      console.warn(`\n⚠️  已达 50 页上限（2500+ issues），停止翻页。请检查 --since 过滤。`);
      break;
    }
  }

  // 清理 _drafts/ 中已不在本次结果里的旧草稿
  let pruned = 0;
  if (!dryRun) {
    pruned = await pruneStaleDrafts(keptSlugs);
  }

  console.log(`\n📊 统计`);
  console.log(`   ✅ 新草稿：${processed}`);
  console.log(`   ⚠️  跳过空 body：${skippedNoBody}`);
  console.log(`   🚫 跳过 PR：${skippedPR}`);
  console.log(`   🧹 清理旧草稿：${pruned}`);
  console.log(`   📂 草稿目录：${DRAFTS_DIR}`);
  console.log(`\n⏭️  下一步：人工审核 → 修改 status 为 reviewing/published → 移到 src/content/events/`);
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
console.log();

switch (source) {
  case 'github':
    await syncFromGitHub(args);
    break;
  default:
    console.error(`❌ 未知 source: ${source}`);
    console.error('   当前只支持 github。Tally / 邮件入口暂未实现。');
    process.exit(1);
}

console.log('\n✅ 聚合完成');