import { clearAdminCookie, isSameOriginRequest, jsonResponse } from '../../_lib/admin-auth.js';

export async function onRequestPost({ request }) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: '请求无效。' }, 403);
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': clearAdminCookie() });
}
