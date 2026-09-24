import { isSameOriginRequest } from '../_lib/admin-auth.js';

const HONG_KONG_DAY = "strftime('%Y-%m-%d', 'now', '+8 hours')";

export async function onRequestPost({ request, env }) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 204 });
  if (!env.ANALYTICS_DB) return new Response(null, { status: 204 });

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 2048) return new Response(null, { status: 204 });

  try {
    const body = await request.json();
    if (typeof body.path !== 'string' || body.path.length > 300) return new Response(null, { status: 204 });

    const path = body.path;
    if (!path.startsWith('/') || path.startsWith('//') || /[\u0000-\u001f\u007f]/.test(path)) {
      return new Response(null, { status: 204 });
    }
    if (path === '/admin' || path.startsWith('/admin/') || path === '/api' || path.startsWith('/api/')) {
      return new Response(null, { status: 204 });
    }

    await env.ANALYTICS_DB.prepare(`
      INSERT INTO page_view_daily (day, path, views)
      VALUES (${HONG_KONG_DAY}, ?, 1)
      ON CONFLICT (day, path) DO UPDATE SET views = views + 1
    `).bind(path).run();
  } catch {
    // Analytics should never interrupt the public page experience.
  }

  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
