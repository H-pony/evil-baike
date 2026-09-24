const COOKIE_NAME = 'eb_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password, expectedPassword) {
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(password)),
    crypto.subtle.digest('SHA-256', encoder.encode(expectedPassword)),
  ]);
  const left = new Uint8Array(actual);
  const right = new Uint8Array(expected);
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

export async function createAdminCookie(env) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ exp: expiresAt })));
  const key = await signingKey(env.SESSION_SECRET);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const token = `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
  return `${COOKIE_NAME}=${token}; Path=/api/admin; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export async function hasAdminSession(request, env) {
  if (!env.SESSION_SECRET) return false;
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  try {
    const token = cookie.slice(COOKIE_NAME.length + 1);
    const [payload, signature, ...extra] = token.split('.');
    if (!payload || !signature || extra.length > 0) return false;
    const key = await signingKey(env.SESSION_SECRET);
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlDecode(signature), encoder.encode(payload));
    if (!valid) return false;
    const session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return Number.isFinite(session.exp) && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
