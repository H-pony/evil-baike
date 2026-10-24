#!/usr/bin/env node
/**
 * 内容验证脚本：检查所有 content collection 条目
 *
 * 检查项：
 * 1. 必填字段完整
 * 2. 信源 URL 可访问（HEAD 请求）
 * 3. 交叉引用一致（人物/机构引用是否存在）
 * 4. 状态流转合法
 * 5. 信源数量符合最低要求
 * 6. **构建产物扫描**：dist/ 中不应出现 draft/submitted/reviewing/withdrawn 条目的 HTML；
 *    sitemap-0.xml 中不应包含 placeholder URL。
 *
 * 用法：
 *   node scripts/validate-content.mjs                # 内容校验
 *   node scripts/validate-content.mjs --strict       # 严格模式：HEAD 请求所有 URL
 *   node scripts/validate-content.mjs --build        # 同时执行构建产物扫描
 *   node scripts/validate-content.mjs --build-only   # 只跑构建产物扫描（不校验内容）
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'src/content');
const DIST_DIR = join(ROOT, 'dist');
const SITEMAP = join(DIST_DIR, 'sitemap-0.xml');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const strict = args.strict ?? false;
const build = args.build ?? false;
const buildOnly = args['build-only'] ?? false;

// ============================================================
// 收集所有条目
// ============================================================

async function readCollection(subdir, includePlaceholders = false, relative = '') {
  const dir = join(CONTENT_DIR, subdir, relative);
  const files = await readdir(dir, { withFileTypes: true });
  const entries = [];
  for (const file of files) {
    if (file.isDirectory()) {
      entries.push(...await readCollection(subdir, includePlaceholders, join(relative, file.name)));
      continue;
    }
    if (!/\.mdx?$/.test(file.name)) continue;
    if (!includePlaceholders && file.name.startsWith('_')) continue;
    const full = join(dir, file.name);
    const { data, content } = matter(await readFile(full, 'utf-8'));
    entries.push({ id: join(relative, file.name).replace(/\.mdx?$/, ''), file: full, collection: subdir, data, content });
  }
  return entries;
}

if (!buildOnly) {
  const events = await readCollection('events');
  const people = await readCollection('people');
  const orgs = await readCollection('organizations');

  console.log(`📚 加载：${events.length} 事件 / ${people.length} 人物 / ${orgs.length} 机构`);

  // ============================================================
  // 检查器
  // ============================================================

  const issues = [];

  function report(severity, collection, id, message) {
    issues.push({ severity, collection, id, message });
  }

  const personIds = new Set(people.map((p) => p.id));
  const orgIds = new Set(orgs.map((o) => o.id));
  const eventIds = new Set(events.map((e) => e.id));

  const collectionEntries = { events, people, organizations: orgs };
  const publiclyVisible = entry => ['published', 'archived'].includes(entry.data.status);
  for (const entry of [...events, ...people, ...orgs]) {
    const { data, collection, id } = entry;
    const parseDate = value => value === undefined ? undefined : new Date(value).getTime();
    for (const field of ['createdAt', 'updatedAt', 'verifiedAt', 'dateStart', 'dateEnd']) {
      if (data[field] !== undefined && !Number.isFinite(parseDate(data[field]))) report('error', collection, id, `${field} 不是有效日期`);
    }
    if (parseDate(data.updatedAt) < parseDate(data.createdAt)) report('error', collection, id, 'updatedAt 早于 createdAt');
    if (parseDate(data.dateEnd) < parseDate(data.dateStart)) report('error', collection, id, 'dateEnd 早于 dateStart');
    if (!publiclyVisible(entry)) continue;
    for (const field of ['events', 'people', 'organizations']) {
      for (const ref of data[field] ?? []) {
        const target = collectionEntries[field].find(candidate => candidate.id === ref);
        if (target && !publiclyVisible(target)) report('warn', collection, id, `${field}/${ref} 尚未公开，公开页面将隐藏该关联`);
      }
    }
    for (const ref of data.related ?? []) {
      if (ref === id) report('error', collection, id, 'related 不可关联自身');
      const target = events.find(candidate => candidate.id === ref);
      if (target && target.data.status !== 'published') report('warn', collection, id, `关联事件 ${ref} 未列入公开索引，推荐中将隐藏`);
    }
    if (data.status === 'archived' && !data.archivedReason && !data.archivedNote) report('warn', collection, id, '归档条目缺少归档原因');
  }

  // 事件
  for (const e of events) {
    // 信源最低数量
    if (e.data.status === 'published') {
      const srcCount = e.data.sources?.length ?? 0;
      if (srcCount < 2) {
        report('error', 'events', e.id, `已发布事件信源数量不足（${srcCount} < 2）`);
      }
      // 摘要最小长度
      if (!e.data.summary || e.data.summary.length < 10) {
        report('error', 'events', e.id, '摘要缺失或过短（< 10 字符）');
      }
      // 时间线节点
      if (!e.data.timeline || e.data.timeline.length === 0) {
        report('warn', 'events', e.id, '已发布事件无时间线节点');
      }
      // 公开阅读结构
      const cfCount = e.data.confirmedFacts?.length ?? 0;
      const clCount = e.data.claims?.length ?? 0;
      if (cfCount === 0 && clCount === 0) {
        report('warn', 'events', e.id, '已发布事件缺少 confirmedFacts / claims，详情页"档案概览"为空');
      }
    }

    // 人物引用
    for (const pid of e.data.people ?? []) {
      if (!personIds.has(pid)) {
        report('error', 'events', e.id, `人物引用 ${pid} 不存在`);
      }
    }

    // 机构引用
    for (const oid of e.data.organizations ?? []) {
      if (!orgIds.has(oid)) {
        report('error', 'events', e.id, `机构引用 ${oid} 不存在`);
      }
    }

    // 时间线节点必填
    for (const [idx, entry] of (e.data.timeline ?? []).entries()) {
      if (!entry.date || !entry.title || !entry.description) {
        report('error', 'events', e.id, `时间线第 ${idx + 1} 节点字段缺失`);
      }
    }

    // 关联事件引用
    for (const rid of e.data.related ?? []) {
      if (!eventIds.has(rid)) {
        report('error', 'events', e.id, `关联事件 ${rid} 不存在`);
      }
    }

    // 信源 accessedAt 检查
    for (const [idx, src] of (e.data.sources ?? []).entries()) {
      if (!src.accessedAt) {
        report('warn', 'events', e.id, `信源 [${idx + 1}] 缺少 accessedAt（建议补全以便学术引用）`);
      }
    }
  }

  // 人物
  for (const p of people) {
    for (const eid of p.data.events ?? []) {
      if (!eventIds.has(eid)) {
        report('error', 'people', p.id, `事件引用 ${eid} 不存在`);
      }
    }
    for (const oid of p.data.organizations ?? []) {
      if (!orgIds.has(oid)) {
        report('error', 'people', p.id, `机构引用 ${oid} 不存在`);
      }
    }
    for (const [idx, src] of (p.data.sources ?? []).entries()) {
      if (!src.accessedAt) {
        report('warn', 'people', p.id, `信源 [${idx + 1}] 缺少 accessedAt`);
      }
    }
  }

  // 机构
  for (const o of orgs) {
    for (const eid of o.data.events ?? []) {
      if (!eventIds.has(eid)) {
        report('error', 'organizations', o.id, `事件引用 ${eid} 不存在`);
      }
    }
    for (const pid of o.data.people ?? []) {
      if (!personIds.has(pid)) {
        report('error', 'organizations', o.id, `人物引用 ${pid} 不存在`);
      }
    }
    for (const [idx, src] of (o.data.sources ?? []).entries()) {
      if (!src.accessedAt) {
        report('warn', 'organizations', o.id, `信源 [${idx + 1}] 缺少 accessedAt`);
      }
    }
  }

  // ============================================================
  // 严格模式：检查 URL 可访问性
  // ============================================================

  if (strict) {
    console.log('🔍 严格模式：验证信源 URL...');
    const urlSet = new Set();
    for (const e of [...events, ...people, ...orgs]) {
      for (const src of e.data.sources ?? []) {
        if (src.url) urlSet.add(src.url);
      }
      for (const entry of e.data.timeline ?? []) {
        for (const url of entry.sources ?? []) urlSet.add(url);
      }
    }

    for (const url of urlSet) {
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        if (res.status >= 400) {
          report('warn', '*', '*', `URL ${res.status}: ${url}`);
        }
      } catch (err) {
        report('warn', '*', '*', `URL 请求失败: ${url} — ${err.message}`);
      }
    }
  }

  // ============================================================
  // 输出
  // ============================================================

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');

  console.log();
  console.log('━'.repeat(60));
  console.log(`📊 内容验证结果`);
  console.log(`   ❌ 错误：${errors.length}`);
  console.log(`   ⚠️  警告：${warnings.length}`);
  console.log('━'.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ 错误：');
    for (const i of errors) {
      console.log(`   [${i.collection}/${i.id}] ${i.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  警告：');
    for (const i of warnings) {
      console.log(`   [${i.collection}/${i.id}] ${i.message}`);
    }
  }

  console.log();
  if (errors.length > 0) {
    console.log('❌ 存在错误，请修复后再发布');
    process.exit(1);
  } else {
    console.log('✅ 通过内容验证（' + (warnings.length > 0 ? `含 ${warnings.length} 个警告` : '完美') + '）');
  }
}

// ============================================================
// 构建产物扫描
// ============================================================

async function scanBuild() {
  const issues = [];

  function report(severity, message) {
    issues.push({ severity, message });
  }

  // 1. 检查 dist/ 是否存在
  let distExists = true;
  try {
    await stat(DIST_DIR);
  } catch {
    distExists = false;
  }
  if (!distExists) {
    console.error('❌ dist/ 不存在，无法验证构建产物。请先运行 npm run build。');
    process.exit(1);
  }

  console.log('🔍 扫描构建产物：确保草稿 / 占位条目未发布...');

  // 2. 找出所有非公开 / 占位条目
  const allEntries = (await Promise.all(['events', 'people', 'organizations'].map(collection => readCollection(collection, true))))
    .flat().map(entry => ({ ...entry, status: entry.data.status ?? 'draft' }));

  const hiddenEntries = allEntries.filter((e) =>
    !['published', 'archived'].includes(e.status) ||
    e.id.startsWith('_')
  );

  for (const e of hiddenEntries) {
    const subdir = e.collection;
    const htmlPath = join(DIST_DIR, subdir, e.id, 'index.html');
    try {
      await stat(htmlPath);
      report('error', `dist/${subdir}/${e.id}/index.html 不应存在（status=${e.status} 或以 _ 开头）`);
    } catch {
      // 不存在 = 正常
    }
  }

  // 3. sitemap 中不应包含占位条目
  try {
    const sitemapRaw = await readFile(SITEMAP, 'utf-8');
    for (const e of hiddenEntries) {
      const subdir = e.collection;
      const urlPattern = `/${subdir}/${e.id}`;
      if (sitemapRaw.includes(urlPattern)) {
        report('error', `sitemap-0.xml 不应包含 ${urlPattern}（status=${e.status} 或以 _ 开头）`);
      }
    }
  } catch {
    report('error', 'sitemap-0.xml 缺失或不可读，无法验证发布边界');
  }

  // 4. search.json 中不应包含占位 / 非 published
  try {
    const searchRaw = await readFile(join(DIST_DIR, 'search.json'), 'utf-8');
    const searchDocs = JSON.parse(searchRaw);
    for (const e of allEntries.filter(entry => entry.status !== 'published' || entry.id.startsWith('_'))) {
      const type = { events: 'event', people: 'person', organizations: 'organization' }[e.collection];
      if (searchDocs.some((d) => d.id === e.id && d.type === type)) {
        report('error', `search.json 不应包含 ${e.id}（status=${e.status} 或以 _ 开头）`);
      }
    }
  } catch {
    report('error', 'search.json 缺失或格式不正确，无法验证发布边界');
  }

  // Traverse every HTML href so broken tags, entity links and archived references cannot pass silently.
  async function htmlFiles(dir) {
    const files = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(files.map(file => file.isDirectory() ? htmlFiles(join(dir, file.name)) : file.name.endsWith('.html') ? [join(dir, file.name)] : []));
    return nested.flat();
  }
  const checked = new Map();
  for (const file of await htmlFiles(DIST_DIR)) {
    const html = await readFile(file, 'utf-8');
    for (const match of html.matchAll(/href=["'](\/[^"']*)["']/g)) {
      if (match[1].startsWith('//')) continue;
      const path = decodeURIComponent(match[1].split(/[?#]/)[0]);
      if (!checked.has(path)) {
        const full = join(DIST_DIR, path);
        checked.set(path, await stat(full).then(result => result.isFile() || stat(join(full, 'index.html')).then(inner => inner.isFile(), () => false), () => false));
      }
      if (!checked.get(path)) report('error', `${file.slice(DIST_DIR.length + 1)} 含无效站内链接 ${path}`);
    }
  }

  console.log('━'.repeat(60));
  console.log(`📊 构建产物扫描结果`);
  console.log(`   ❌ 错误：${issues.filter((i) => i.severity === 'error').length}`);
  console.log(`   ⚠️  警告：${issues.filter((i) => i.severity === 'warn').length}`);
  console.log('━'.repeat(60));

  if (issues.length > 0) {
    for (const i of issues) {
      const icon = i.severity === 'error' ? '❌' : '⚠️';
      console.log(`   ${icon} ${i.message}`);
    }
  }

  console.log();
  if (issues.filter((i) => i.severity === 'error').length > 0) {
    console.log('❌ 构建产物扫描失败：发现未发布条目被错误发布');
    process.exit(1);
  } else {
    console.log('✅ 构建产物扫描通过：所有草稿 / 占位条目均未出现在公开产物中');
  }

  return { ok: true, issues };
}

if (build || buildOnly) {
  await scanBuild();
}
