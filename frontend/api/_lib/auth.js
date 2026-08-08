// Shared auth helpers for the serverless functions in ../.
// Prefixed folder (_lib) so Vercel does NOT expose this as a route — see
// https://vercel.com/docs/functions#serverless-function-file-structure
//
// Minimal signed-cookie session, no database, no third-party auth service —
// intentional for a small internal tool with a handful of known users.
// Credentials live entirely in the AUTH_USERS env var (a JSON array of
// {email, password, name}). Token = base64url(payload) + HMAC-SHA256
// signature, keyed by AUTH_SECRET, so it can't be forged without that
// secret, but there's nothing server-side to look up — the payload itself
// (email/name/exp) rides inside the cookie.

import crypto from 'node:crypto';

const COOKIE_NAME = 'sf_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function sign(data) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function createSessionToken(payload) {
  const encoded = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 })
  ).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;

  const [encoded, signature] = token.split('.');
  let expected;
  try {
    expected = sign(encoded);
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return cookies;
}

function isLocalRequest(req) {
  const host = req.headers.host || '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

export function timingSafeStringEqual(a, b) {
  const aBuf = Buffer.from(String(a ?? ''));
  const bBuf = Buffer.from(String(b ?? ''));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Reads the user list from AUTH_USERS — a JSON array of {email, password, name}.
export function getUsers() {
  if (!process.env.AUTH_USERS) return [];
  try {
    const parsed = JSON.parse(process.env.AUTH_USERS);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Malformed AUTH_USERS (invalid JSON) — treat as no users configured
    // rather than throwing, so a typo in the env var fails closed (locks
    // everyone out with a clear 500) instead of crashing the function.
    return [];
  }
}

export function findUser(email, password) {
  if (!email || !password) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  let match = null;
  // Checks every entry rather than stopping at the first match, so how many
  // users exist (or which one matched) isn't observable from response timing.
  for (const u of getUsers()) {
    const emailOk = u.email && timingSafeStringEqual(normalizedEmail, u.email.trim().toLowerCase());
    const passwordOk = u.password && timingSafeStringEqual(password, u.password);
    if (emailOk && passwordOk) match = u;
  }
  return match;
}

export function getSession(req) {
  const payload = verifySessionToken(parseCookies(req)[COOKIE_NAME]);
  if (!payload) return null;
  return { email: payload.email, name: payload.name || null };
}

export function isAuthenticated(req) {
  return !!getSession(req);
}

export function setSessionCookie(req, res, user) {
  const token = createSessionToken({ email: user.email, name: user.name || null });
  const secure = isLocalRequest(req) ? '' : '; Secure';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax${secure}`
  );
}

export function clearSessionCookie(req, res) {
  const secure = isLocalRequest(req) ? '' : '; Secure';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`);
}
