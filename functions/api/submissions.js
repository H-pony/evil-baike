import { isSameOriginRequest, jsonResponse } from '../_lib/admin-auth.js';
import { readJson, receiptHash, RECEIPT_PATTERN, publicSubmission } from '../_lib/submissions.js';

export async function onRequestPost({ request, env }) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: '请求无效，请刷新页面后重试。' }, 403);
  if (!env.ANALYTICS_DB) return jsonResponse({ error: '投稿服务暂未配置，请稍后再试。' }, 503);
  let body;
  try { body = await readJson(request); } catch (error) {
    return jsonResponse({ error: error.message === 'too-large' ? '投稿内容过长，请缩短后再提交。' : '投稿内容格式无效，请检查后重试。' }, error.message === 'too-large' ? 413 : 400);
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const event = typeof body.event === 'string' ? body.event.trim() : '';
  if (!name || name.length > 80) return jsonResponse({ error: '请填写称呼（可用昵称，最多 80 个字符）。' }, 400);
  if (!event || event.length > 5000) return jsonResponse({ error: '请填写事件内容（最多 5000 个字符）。' }, 400);
  if (typeof body.receipt !== 'string' || !RECEIPT_PATTERN.test(body.receipt)) return jsonResponse({ error: '投稿回执无效，请刷新页面后重试。' }, 400);
  try {
    const hash = await receiptHash(body.receipt);
    await env.ANALYTICS_DB.prepare(`INSERT INTO submissions (name, event, receipt_hash) VALUES (?, ?, ?) ON CONFLICT(receipt_hash) DO NOTHING`).bind(name, event, hash).run();
    const row = await env.ANALYTICS_DB.prepare('SELECT * FROM submissions WHERE receipt_hash = ?').bind(hash).first();
    if (!row) throw new Error('not-saved');
    if (row.name !== name || row.event !== event) return jsonResponse({ error: '这份回执已有一条投稿。请先查询处理进度；如需提交另一件事，请点击“开始新投稿”。', code: 'receipt-conflict' }, 409);
    return jsonResponse({ ok: true, submission: publicSubmission(row) }, 201);
  } catch {
    return jsonResponse({ error: '暂时无法确认投稿结果。内容已保留，请用同一回执重试或查询，避免重复投稿。' }, 503);
  }
}
