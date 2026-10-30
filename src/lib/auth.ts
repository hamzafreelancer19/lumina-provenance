export const SESSION_COOKIE = 'lumina_session';
const SESSION_MS = 12 * 60 * 60 * 1000;

export type SessionRole = 'admin' | 'member';

export type SessionPayload = {
  sub: string;
  uid: string;
  role: SessionRole;
  exp: number;
};

function secret() {
  return process.env.AUTH_SECRET || '';
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) {
    return '/';
  }
  if (value.startsWith('/login') || value.startsWith('/register')) return '/';
  return value;
}

export async function createSessionToken(user: { id: string; username: string; role: SessionRole }) {
  const payload: SessionPayload = {
    sub: user.username,
    uid: user.id,
    role: user.role,
    exp: Date.now() + SESSION_MS,
  };
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(encoded));
  return `${encoded}.${signature}`;
}

export async function readSession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || !secret()) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = await hmac(encoded);
  let actual: Uint8Array;
  try {
    actual = base64UrlToBytes(signature);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as Partial<SessionPayload>;
    if (!payload?.sub || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    const envAdmin = process.env.AUTH_USERNAME || '';
    const role: SessionRole | null =
      payload.role === 'admin' || payload.role === 'member'
        ? payload.role
        : payload.sub === envAdmin
          ? 'admin'
          : null;
    if (!role) return null;
    return {
      sub: payload.sub,
      uid: typeof payload.uid === 'string' ? payload.uid : '',
      role,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MS / 1000) {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function sessionFromRequest(request: Request) {
  const header = request.headers.get('cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return readSession(match?.[1] ? decodeURIComponent(match[1]) : null);
}

export async function hasValidSession(request: Request) {
  return Boolean(await sessionFromRequest(request));
}
