import { hasAdminSession, isSameOriginRequest, jsonResponse } from '../../_lib/admin-auth.js';
import { readJson, SUBMISSION_STATUSES, isPublishedEntry } from '../../_lib/submissions.js';

export async function onRequestGet({ request, env }) {
  if (!(await hasAdminSession(request, env))) return jsonResponse({ error: '请先登录。' }, 401);
  if (!env.ANALYTICS_DB) return jsonResponse({ error: '投稿数据库尚未连接。' }, 503);
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const requestedPage = Number(url.searchParams.get('page') || 1);
  if ((status && !SUBMISSION_STATUSES.includes(status)) || !Number.isSafeInteger(requestedPage) || requestedPage < 1) return jsonResponse({ error: '筛选或页码无效。' }, 400);
  const pageSize = 20;
  const where = status ? ' WHERE status = ?' : '';
  const values = status ? [status] : [];
  try {
    const count = await env.ANALYTICS_DB.prepare(`SELECT COUNT(*) AS count FROM submissions${where}`).bind(...values).first();
    const total = Number(count?.count || 0);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const [entries, counts] = await Promise.all([
      env.ANALYTICS_DB.prepare(`SELECT id, name, event, status, response, published_path AS publishedPath, submitted_at AS submittedAt, updated_at AS updatedAt, version, receipt_hash IS NOT NULL AS hasReceipt FROM submissions${where} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize).all(),
      env.ANALYTICS_DB.prepare('SELECT status, COUNT(*) AS count FROM submissions GROUP BY status').all(),
    ]);
    const submissions = entries.results || [];
    const history = submissions.length ? await env.ANALYTICS_DB.prepare(`SELECT submission_id AS submissionId, from_status AS fromStatus, to_status AS toStatus, response, published_path AS publishedPath, changed_at AS changedAt FROM submission_history WHERE submission_id IN (${submissions.map(() => '?').join(',')}) ORDER BY id DESC`).bind(...submissions.map((entry) => entry.id)).all() : { results: [] };
    return jsonResponse({ submissions, history: history.results || [], counts: counts.results || [], total, page, pageCount, pageSize });
  } catch { return jsonResponse({ error: '读取投稿失败，请确认投稿工作流数据库迁移已完成。' }, 503); }
}

export async function onRequestPatch({ request, env }) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: '请求无效，请刷新页面后重试。' }, 403);
  if (!(await hasAdminSession(request, env))) return jsonResponse({ error: '登录已过期，请重新登录。' }, 401);
  if (!env.ANALYTICS_DB) return jsonResponse({ error: '投稿数据库尚未连接。' }, 503);
  let body;
  try { body = await readJson(request, 12000); } catch { return jsonResponse({ error: '处理信息格式无效。' }, 400); }
  const response = typeof body.response === 'string' ? body.response.trim() : '';
  const publishedPath = typeof body.publishedPath === 'string' ? body.publishedPath.trim() : '';
  if (!Number.isSafeInteger(body.id) || body.id < 1 || !Number.isSafeInteger(body.version) || body.version < 0 || !SUBMISSION_STATUSES.includes(body.status) || response.length > 2000) return jsonResponse({ error: '处理信息无效，请检查状态与说明（最多 2000 字）。' }, 400);
  if (['resolved', 'rejected'].includes(body.status) && !response) return jsonResponse({ error: '请填写处理说明，供投稿者查看结果。' }, 400);
  if (body.status !== 'published' && publishedPath) return jsonResponse({ error: '只有“已收录 / 更新”状态可以关联已发布档案。' }, 400);
  try {
    if (body.status === 'published' && !(await isPublishedEntry(publishedPath, request, env))) return jsonResponse({ error: '请关联已实际发布的站内档案路径，例如 /events/条目编号。请先完成编辑和部署，再更新投稿状态。' }, 400);
    const current = await env.ANALYTICS_DB.prepare('SELECT status, version FROM submissions WHERE id = ?').bind(body.id).first();
    if (!current) return jsonResponse({ error: '投稿不存在。' }, 404);
    if (current.version !== body.version) return jsonResponse({ error: '这条投稿已被更新，请刷新后重新处理。' }, 409);
    const result = await env.ANALYTICS_DB.batch([
      env.ANALYTICS_DB.prepare(`UPDATE submissions SET status = ?, response = ?, published_path = ?, updated_at = datetime('now', '+8 hours'), version = version + 1 WHERE id = ? AND version = ?`).bind(body.status, response, publishedPath, body.id, body.version),
      env.ANALYTICS_DB.prepare(`INSERT INTO submission_history (submission_id, from_status, to_status, response, published_path) SELECT ?, ?, ?, ?, ? WHERE changes() = 1`).bind(body.id, current.status, body.status, response, publishedPath),
    ]);
    if (!result[0]?.meta?.changes) return jsonResponse({ error: '这条投稿已被更新，请刷新后重新处理。' }, 409);
    return jsonResponse({ ok: true });
  } catch { return jsonResponse({ error: '处理结果未能保存。请确认数据库迁移已完成，且发布索引可访问后重试。' }, 503); }
}
