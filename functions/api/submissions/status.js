import { isSameOriginRequest, jsonResponse } from '../../_lib/admin-auth.js';
import { readJson, receiptHash, RECEIPT_PATTERN, publicSubmission, isPublishedEntry } from '../../_lib/submissions.js';

export async function onRequestPost({ request, env }) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: '请求无效，请刷新页面后重试。' }, 403);
  if (!env.ANALYTICS_DB) return jsonResponse({ error: '查询服务暂不可用，请稍后重试。' }, 503);
  let body;
  try { body = await readJson(request, 1024); } catch { return jsonResponse({ error: '请填写完整回执码。' }, 400); }
  if (typeof body.receipt !== 'string' || !RECEIPT_PATTERN.test(body.receipt)) return jsonResponse({ error: '请填写完整回执码。' }, 400);
  try {
    const row = await env.ANALYTICS_DB.prepare('SELECT status, response, published_path, submitted_at, updated_at FROM submissions WHERE receipt_hash = ?').bind(await receiptHash(body.receipt)).first();
    if (!row) return jsonResponse({ error: '没有找到这份回执。请检查是否完整；如果刚才提交失败，可使用原表单重试。' }, 404);
    const submission = publicSubmission(row);
    if (submission.publishedPath) {
      try {
        if (!(await isPublishedEntry(submission.publishedPath, request, env))) {
          submission.publishedPath = '';
          submission.linkUnavailable = true;
        }
      } catch {
        submission.publishedPath = '';
        submission.linkUnavailable = true;
      }
    }
    return jsonResponse({ submission });
  } catch { return jsonResponse({ error: '暂时无法读取进度，请稍后重试。' }, 503); }
}
