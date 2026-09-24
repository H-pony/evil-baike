import { hasAdminSession, jsonResponse } from '../../_lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  if (!(await hasAdminSession(request, env))) return jsonResponse({ error: '请先登录。' }, 401);
  if (!env.ANALYTICS_DB) return jsonResponse({ error: '还没有连接浏览量数据库。' }, 503);

  try {
    const [summary, daily, pages, submissionCount, submissions] = await Promise.all([
      env.ANALYTICS_DB.prepare(`
        SELECT
          strftime('%Y-%m-%d', 'now', '+8 hours') AS currentDay,
          COALESCE(SUM(views), 0) AS total,
          COALESCE(SUM(CASE WHEN day = strftime('%Y-%m-%d', 'now', '+8 hours') THEN views ELSE 0 END), 0) AS today,
          COALESCE(SUM(CASE WHEN day >= strftime('%Y-%m-%d', 'now', '+8 hours', '-6 days') THEN views ELSE 0 END), 0) AS last7,
          COALESCE(SUM(CASE WHEN day >= strftime('%Y-%m-%d', 'now', '+8 hours', '-29 days') THEN views ELSE 0 END), 0) AS last30
        FROM page_view_daily
      `).first(),
      env.ANALYTICS_DB.prepare(`
        SELECT day, SUM(views) AS views
        FROM page_view_daily
        WHERE day >= strftime('%Y-%m-%d', 'now', '+8 hours', '-29 days')
        GROUP BY day
        ORDER BY day ASC
      `).all(),
      env.ANALYTICS_DB.prepare(`
        SELECT path, SUM(views) AS views
        FROM page_view_daily
        WHERE day >= strftime('%Y-%m-%d', 'now', '+8 hours', '-29 days')
        GROUP BY path
        ORDER BY views DESC, path ASC
        LIMIT 10
      `).all(),
      env.ANALYTICS_DB.prepare('SELECT COUNT(*) AS count FROM submissions').first(),
      env.ANALYTICS_DB.prepare(`
        SELECT id, name, event, submitted_at AS submittedAt
        FROM submissions
        ORDER BY id DESC
        LIMIT 50
      `).all(),
    ]);

    return jsonResponse({
      summary: {
        currentDay: summary?.currentDay,
        total: Number(summary?.total || 0),
        today: Number(summary?.today || 0),
        last7: Number(summary?.last7 || 0),
        last30: Number(summary?.last30 || 0),
      },
      daily: daily.results || [],
      pages: pages.results || [],
      submissionCount: Number(submissionCount?.count || 0),
      submissions: submissions.results || [],
      timezone: 'Asia/Hong_Kong',
    });
  } catch {
    return jsonResponse({ error: '读取统计数据失败，请检查数据库表是否已创建。' }, 503);
  }
}
