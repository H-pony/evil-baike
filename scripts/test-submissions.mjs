import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { onRequestPost as submit } from '../functions/api/submissions.js';
import { onRequestPost as status } from '../functions/api/submissions/status.js';
import { onRequestGet as queue, onRequestPatch as update } from '../functions/api/admin/submissions.js';
import { onRequestPost as login } from '../functions/api/admin/login.js';
import { createAdminCookie } from '../functions/_lib/admin-auth.js';

// D1-compatible statements over a real, isolated SQLite database. No network or production data.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/0001_page_view_daily.sql', import.meta.url), 'utf8'));
sqlite.prepare('INSERT INTO submissions (name, event) VALUES (?, ?)').run('迁移前投稿', '历史内容');
sqlite.exec(readFileSync(new URL('../migrations/0002_submission_workflow.sql', import.meta.url), 'utf8'));
class Statement {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...args) { return new Statement(this.sql, args); }
  async first() { return sqlite.prepare(this.sql).get(...this.args) || null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.args) }; }
  async run() { const result = sqlite.prepare(this.sql).run(...this.args); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }
}
let published = ['/events/example-published'];
const env = {
  SESSION_SECRET: 'isolated-test-secret-with-more-than-32-characters',
  ADMIN_PASSWORD: 'isolated-test-only',
  ANALYTICS_DB: {
    prepare: (sql) => new Statement(sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  },
  ASSETS: { async fetch() { return Response.json({ entries: published.map((path) => ({ path, title: '测试档案' })) }); } },
};
const cookie = (await createAdminCookie(env)).split(';')[0];
const origin = 'https://audit.example';
function request(path, body, options = {}) {
  return new Request(origin + path, { method: options.method || 'POST', headers: { Origin: options.origin || origin, 'Content-Type': 'application/json', ...(options.admin ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function call(handler, req, expected) { const response = await handler({ request: req, env }); assert.equal(response.status, expected); assert.equal(response.headers.get('cache-control'), 'no-store'); return response.json(); }
const receipt = randomBytes(32).toString('base64url');
const body = { name: '测试昵称', event: '事件材料 https://example.org/report', receipt };
assert.equal(sqlite.prepare('SELECT status FROM submissions WHERE id = 1').get().status, 'received');
await call(submit, request('/api/submissions', body, { origin: 'https://other.example' }), 403);
await call(submit, request('/api/submissions', { ...body, name: '   ' }), 400);
await call(submit, request('/api/submissions', { ...body, receipt: 'invalid' }), 400);
await call(submit, request('/api/submissions', { ...body, event: 'x'.repeat(5001) }), 400);
await call(submit, request('/api/submissions', { ...body, ignoredLargeField: 'x'.repeat(40000) }), 413);
await call(submit, request('/api/submissions', body), 201);
await call(submit, request('/api/submissions', body), 201);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM submissions').get().count, 2, 'network retries do not duplicate submissions');
await call(submit, request('/api/submissions', { ...body, event: 'changed content' }), 409);
const receiptResult = await call(status, request('/api/submissions/status', { receipt }), 200);
assert.equal(receiptResult.submission.status, 'received');
assert(!JSON.stringify(receiptResult).includes(body.name)); assert(!JSON.stringify(receiptResult).includes(body.event));
await call(status, request('/api/submissions/status', { receipt: randomBytes(32).toString('base64url') }), 404);
await call(queue, request('/api/admin/submissions', undefined, { method: 'GET' }), 401);
await call(login, request('/api/admin/login', { password: 'wrong' }), 401);
await call(login, request('/api/admin/login', { password: env.ADMIN_PASSWORD }), 200);
const initialQueue = await call(queue, request('/api/admin/submissions', undefined, { method: 'GET', admin: true }), 200);
assert.equal(initialQueue.total, 2);
assert(!JSON.stringify(initialQueue).includes(receipt));
const id = initialQueue.submissions[0].id;
const change = { id, version: 0, status: 'reviewing', response: '正在核查公开信源', publishedPath: '' };
await call(update, request('/api/admin/submissions', change, { method: 'PATCH' }), 401);
await call(update, request('/api/admin/submissions', change, { method: 'PATCH', admin: true, origin: 'https://other.example' }), 403);
await call(update, request('/api/admin/submissions', change, { method: 'PATCH', admin: true }), 200);
await call(update, request('/api/admin/submissions', change, { method: 'PATCH', admin: true }), 409);
await call(update, request('/api/admin/submissions', { ...change, version: 1, status: 'rejected', response: '' }, { method: 'PATCH', admin: true }), 400);
for (const path of ['https://evil.example/event', '//evil.example', '/events/missing', '/events/../admin', '/admin']) {
  await call(update, request('/api/admin/submissions', { ...change, version: 1, status: 'published', publishedPath: path }, { method: 'PATCH', admin: true }), 400);
}
await call(update, request('/api/admin/submissions', { ...change, version: 1, status: 'published', response: '已核查并收录', publishedPath: published[0] }, { method: 'PATCH', admin: true }), 200);
const publicResult = await call(status, request('/api/submissions/status', { receipt }), 200);
assert.equal(publicResult.submission.publishedPath, published[0]);
published = [];
const withdrawnResult = await call(status, request('/api/submissions/status', { receipt }), 200);
assert.equal(withdrawnResult.submission.publishedPath, ''); assert.equal(withdrawnResult.submission.linkUnavailable, true);
await call(update, request('/api/admin/submissions', { ...change, version: 2, status: 'reviewing', response: '重新核查' }, { method: 'PATCH', admin: true }), 200);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM submission_history WHERE submission_id = ?').get(id).count, 3);
for (let i = 0; i < 51; i += 1) sqlite.prepare('INSERT INTO submissions(name, event) VALUES(?, ?)').run(`legacy-${i}`, 'Pagination fixture');
const thirdPage = await call(queue, request('/api/admin/submissions?page=3', undefined, { method: 'GET', admin: true }), 200);
assert.equal(thirdPage.pageCount, 3); assert.equal(thirdPage.total, 53); assert(thirdPage.submissions.some((item) => item.id === 1), 'oldest records are reachable beyond 50');
const filtered = await call(queue, request('/api/admin/submissions?status=reviewing', undefined, { method: 'GET', admin: true }), 200);
assert.equal(filtered.total, 1); assert.equal(filtered.history.length, 3);
await call(queue, request('/api/admin/submissions?page=-1', undefined, { method: 'GET', admin: true }), 400);
await call(queue, request('/api/admin/submissions?status=unknown', undefined, { method: 'GET', admin: true }), 400);
sqlite.close();
console.log('Submission workflow passed: migrations, idempotency, privacy, authentication, validation, review history, published-link checks, withdrawal, filtering and >50-record pagination.');
