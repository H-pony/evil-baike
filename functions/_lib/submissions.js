export const SUBMISSION_STATUSES = ['received', 'reviewing', 'accepted', 'published', 'resolved', 'rejected'];
export const RECEIPT_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const ENTRY_PATH_PATTERN = /^\/(events|people|organizations)\/[a-z0-9][a-z0-9-]*$/;

export async function receiptHash(receipt) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(receipt));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function readJson(request, maxBytes = 30_000) {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new Error('invalid-json');
  if (Number(request.headers.get('Content-Length') || 0) > maxBytes) throw new Error('too-large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid-json');
  let length = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new Error('too-large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid-json');
  return body;
}

export function publicSubmission(row) {
  return {
    status: row.status, response: row.response,
    publishedPath: row.status === 'published' && ENTRY_PATH_PATTERN.test(row.published_path) ? row.published_path : '',
    submittedAt: row.submitted_at, updatedAt: row.updated_at || row.submitted_at,
  };
}

export async function isPublishedEntry(path, request, env) {
  if (!ENTRY_PATH_PATTERN.test(path)) return false;
  const indexRequest = new Request(new URL('/published-entries.json', request.url), { headers: { Accept: 'application/json' } });
  const response = env.ASSETS?.fetch ? await env.ASSETS.fetch(indexRequest) : await fetch(indexRequest);
  if (!response.ok) throw new Error('index-unavailable');
  const index = await response.json();
  if (!Array.isArray(index.entries)) throw new Error('index-unavailable');
  return index.entries.some((entry) => entry.path === path);
}
