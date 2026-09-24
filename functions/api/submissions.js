import { isSameOriginRequest, jsonResponse } from '../_lib/admin-auth.js';

export async function onRequestPost({ request, env }) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: '请求无效，请刷新页面后重试。' }, 403);
  if (!env.ANALYTICS_DB) return jsonResponse({ error: '投稿服务暂未配置，请稍后再试。' }, 503);

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 25_000) return jsonResponse({ error: '投稿内容过长，请缩短后再提交。' }, 413);

  let name;
  let event;
  try {
    const body = await request.json();
    name = typeof body.name === 'string' ? body.name.trim() : '';
    event = typeof body.event === 'string' ? body.event.trim() : '';
  } catch {
    return jsonResponse({ error: '投稿内容格式无效，请检查后重试。' }, 400);
  }

  if (!name || name.length > 80) {
    return jsonResponse({ error: '请填写姓名（最多 80 个字符）。' }, 400);
  }
  if (!event || event.length > 5_000) {
    return jsonResponse({ error: '请填写事件内容（最多 5000 个字符）。' }, 400);
  }

  try {
    await env.ANALYTICS_DB.prepare(
      'INSERT INTO submissions (name, event) VALUES (?, ?)',
    ).bind(name, event).run();

    return jsonResponse({ ok: true }, 201);
  } catch {
    return jsonResponse({ error: '投稿暂时没有提交成功，请稍后重试。' }, 503);
  }
}
