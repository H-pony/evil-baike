import {
  createAdminCookie,
  isSameOriginRequest,
  jsonResponse,
  verifyAdminPassword,
} from '../../_lib/admin-auth.js';

export async function onRequestPost({ request, env }) {
  if (!isSameOriginRequest(request)) return jsonResponse({ error: '请求无效，请刷新页面后重试。' }, 403);
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return jsonResponse({ error: '后台尚未配置登录密码或会话密钥。' }, 503);
  }

  try {
    const body = await request.json();
    if (typeof body.password !== 'string' || body.password.length > 256) {
      return jsonResponse({ error: '密码不正确。' }, 401);
    }

    const isValid = await verifyAdminPassword(body.password, env.ADMIN_PASSWORD);
    if (!isValid) return jsonResponse({ error: '密码不正确。' }, 401);

    return jsonResponse({ ok: true }, 200, { 'Set-Cookie': await createAdminCookie(env) });
  } catch {
    return jsonResponse({ error: '登录失败，请稍后重试。' }, 400);
  }
}
